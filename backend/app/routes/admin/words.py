from __future__ import annotations

from typing import Literal

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import LearnerUser, PaymentRequest, PaymentStatus, WordItem
from app.routes.admin.auth import require_admin
from app.routes.admin.serializers import serialize_word
from app.services.word_import import import_rows, parse_csv, parse_xlsx

router = APIRouter(dependencies=[Depends(require_admin)])


class WordPayload(BaseModel):
    word: str = Field(min_length=1, max_length=255)
    word_type: str = Field(min_length=1, max_length=80)
    phonetic: str = Field(min_length=1, max_length=255)
    english_definition: str = Field(min_length=1)
    uzbek_definition: str = Field(min_length=1)
    english_example: str = Field(min_length=1)
    uzbek_example: str = Field(min_length=1)
    level: str = Field(min_length=1, max_length=32)
    topic: str = Field(default="General", min_length=1, max_length=120)
    collection: str = Field(default="Daily Vocabulary", min_length=1, max_length=160)
    tags: str = ""
    collocations: str = ""
    common_mistake: str = ""
    writing_prompt: str = ""
    difficulty_order: int = Field(default=0, ge=0)
    audio_url: str | None = Field(default=None, max_length=500)
    is_active: bool = True


class WordPatch(BaseModel):
    word: str | None = Field(default=None, min_length=1, max_length=255)
    word_type: str | None = Field(default=None, min_length=1, max_length=80)
    phonetic: str | None = Field(default=None, min_length=1, max_length=255)
    english_definition: str | None = Field(default=None, min_length=1)
    uzbek_definition: str | None = Field(default=None, min_length=1)
    english_example: str | None = Field(default=None, min_length=1)
    uzbek_example: str | None = Field(default=None, min_length=1)
    level: str | None = Field(default=None, min_length=1, max_length=32)
    topic: str | None = Field(default=None, min_length=1, max_length=120)
    collection: str | None = Field(default=None, min_length=1, max_length=160)
    tags: str | None = None
    collocations: str | None = None
    common_mistake: str | None = None
    writing_prompt: str | None = None
    difficulty_order: int | None = Field(default=None, ge=0)
    audio_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class ImportUrlRequest(BaseModel):
    url: str = Field(min_length=1)
    default_active: bool = True


@router.get("/summary")
def summary(db: Session = Depends(get_db)) -> dict:
    total = db.scalar(select(func.count(WordItem.id))) or 0
    published = db.scalar(select(func.count(WordItem.id)).where(WordItem.is_active.is_(True))) or 0
    total_users = db.scalar(select(func.count(LearnerUser.id))) or 0
    premium = db.scalar(select(func.count(LearnerUser.id)).where(LearnerUser.tier == "paid")) or 0
    pending = db.scalar(
        select(func.count(PaymentRequest.id)).where(
            PaymentRequest.status.in_([PaymentStatus.PENDING.value, PaymentStatus.SUBMITTED.value])
        )
    ) or 0
    recent = list(db.scalars(select(WordItem).order_by(WordItem.created_at.desc()).limit(5)))
    return {
        "stats": {
            "total_words": total,
            "published_words": published,
            "draft_words": total - published,
            "total_users": total_users,
            "premium_users": premium,
            "pending_payments": pending,
        },
        "recent_words": [serialize_word(w) for w in recent],
    }


@router.get("/words")
def list_words(
    search: str = "",
    status: Literal["all", "published", "draft"] = "all",
    level: str = "",
    word_type: str = "",
    limit: int = Query(default=100, ge=1, le=300),
    db: Session = Depends(get_db),
) -> dict:
    query = select(WordItem)
    if term := search.strip():
        like = f"%{term}%"
        query = query.where(or_(
            WordItem.word.ilike(like),
            WordItem.uzbek_definition.ilike(like),
            WordItem.english_definition.ilike(like),
            WordItem.topic.ilike(like),
            WordItem.collection.ilike(like),
            WordItem.tags.ilike(like),
        ))
    if status == "published":
        query = query.where(WordItem.is_active.is_(True))
    elif status == "draft":
        query = query.where(WordItem.is_active.is_(False))
    if level.strip():
        query = query.where(WordItem.level == level.strip())
    if word_type.strip():
        query = query.where(WordItem.word_type == word_type.strip())

    rows = db.scalars(
        query.order_by(
            WordItem.difficulty_order.asc(),
            WordItem.created_at.desc(),
            WordItem.id.desc(),
        ).limit(limit)
    )
    return {"items": [serialize_word(w) for w in rows]}


@router.post("/words")
def create_word(payload: WordPayload, db: Session = Depends(get_db)) -> dict:
    word = WordItem(**payload.model_dump())
    db.add(word)
    db.commit()
    db.refresh(word)
    return serialize_word(word)


@router.patch("/words/{word_id}")
def update_word(word_id: int, payload: WordPatch, db: Session = Depends(get_db)) -> dict:
    word = db.get(WordItem, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(word, key, value)
    db.commit()
    db.refresh(word)
    return serialize_word(word)


@router.delete("/words/{word_id}")
def disable_word(word_id: int, db: Session = Depends(get_db)) -> dict:
    word = db.get(WordItem, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    word.is_active = False
    db.commit()
    db.refresh(word)
    return serialize_word(word)


@router.post("/words/import-file")
async def import_file(
    upload: UploadFile = File(...),
    default_active: bool = Form(default=True),
    db: Session = Depends(get_db),
) -> dict:
    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    filename = (upload.filename or "").lower()
    if filename.endswith(".csv"):
        rows = parse_csv(content)
    elif filename.endswith((".xlsx", ".xlsm")):
        rows = parse_xlsx(content)
    else:
        raise HTTPException(status_code=400, detail="Upload CSV or XLSX file")
    return import_rows(rows, default_active, db)


@router.post("/words/import-url")
async def import_url(payload: ImportUrlRequest, db: Session = Depends(get_db)) -> dict:
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(payload.url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail="Could not read Google Sheets CSV link") from exc
    return import_rows(parse_csv(response.content), payload.default_active, db)
