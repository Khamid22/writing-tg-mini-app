from __future__ import annotations

from datetime import datetime, time, timezone
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_db
from app.models import LearnerDailyUsage, LearnerProgress, LearnerUser, PaymentRequest, PaymentStatus, QuizAttempt, WordItem
from app.routes.admin.auth import require_admin
from app.routes.admin.serializers import serialize_word
from app.services.pronunciation import apply_pronunciation, lookup_pronunciation
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
    settings = get_settings()
    today = datetime.now(timezone.utc).date()
    today_start = datetime.combine(today, time.min, tzinfo=timezone.utc)

    total = db.scalar(select(func.count(WordItem.id))) or 0
    published = db.scalar(select(func.count(WordItem.id)).where(WordItem.is_active.is_(True))) or 0
    total_users = db.scalar(select(func.count(LearnerUser.id))) or 0
    premium = db.scalar(select(func.count(LearnerUser.id)).where(LearnerUser.tier == "paid")) or 0
    pending = db.scalar(
        select(func.count(PaymentRequest.id)).where(
            PaymentRequest.status.in_([PaymentStatus.PENDING.value, PaymentStatus.SUBMITTED.value])
        )
    ) or 0

    active_today = db.scalar(
        select(func.count(LearnerDailyUsage.user_id.distinct())).where(LearnerDailyUsage.usage_date == today)
    ) or 0
    new_users_today = db.scalar(select(func.count(LearnerUser.id)).where(LearnerUser.created_at >= today_start)) or 0
    words_learned_today = db.scalar(
        select(func.coalesce(func.sum(LearnerDailyUsage.new_words_learned), 0)).where(LearnerDailyUsage.usage_date == today)
    ) or 0
    tests_today = db.scalar(
        select(func.count(QuizAttempt.id)).where(QuizAttempt.completed_at >= today_start)
    ) or 0
    limit_hits_today = db.scalar(
        select(func.count(LearnerDailyUsage.user_id.distinct())).where(
            LearnerDailyUsage.usage_date == today,
            LearnerDailyUsage.new_words_learned >= settings.free_daily_word_limit,
        )
    ) or 0
    review_users_today = db.scalar(
        select(func.count(LearnerProgress.user_id.distinct())).where(LearnerProgress.last_reviewed_at >= today_start)
    ) or 0
    answered, correct = db.execute(
        select(
            func.coalesce(func.sum(LearnerProgress.times_answered), 0),
            func.coalesce(func.sum(LearnerProgress.times_correct), 0),
        )
    ).one()
    quiz_accuracy = round((correct / answered) * 100) if answered else 0

    missing_audio = db.scalar(
        select(func.count(WordItem.id)).where(WordItem.is_active.is_(True), or_(WordItem.audio_url.is_(None), WordItem.audio_url == ""))
    ) or 0
    missing_writing_prompt = db.scalar(
        select(func.count(WordItem.id)).where(WordItem.is_active.is_(True), WordItem.writing_prompt == "")
    ) or 0

    topic_rows = db.execute(
        select(WordItem.topic, func.count(WordItem.id))
        .where(WordItem.is_active.is_(True))
        .group_by(WordItem.topic)
        .order_by(func.count(WordItem.id).desc(), WordItem.topic.asc())
        .limit(5)
    ).all()
    weak_rows = db.execute(
        select(
            WordItem.word,
            WordItem.level,
            func.coalesce(func.sum(LearnerProgress.times_answered), 0).label("answered"),
            func.coalesce(func.sum(LearnerProgress.times_correct), 0).label("correct"),
        )
        .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
        .where(LearnerProgress.times_answered > 0)
        .group_by(WordItem.id, WordItem.word, WordItem.level)
        .order_by((func.sum(LearnerProgress.times_correct) * 1.0 / func.sum(LearnerProgress.times_answered)).asc())
        .limit(5)
    ).all()
    recent = list(db.scalars(select(WordItem).order_by(WordItem.created_at.desc()).limit(5)))
    return {
        "stats": {
            "total_words": total,
            "published_words": published,
            "draft_words": total - published,
            "total_users": total_users,
            "premium_users": premium,
            "pending_payments": pending,
            "active_today": active_today,
            "new_users_today": new_users_today,
            "words_learned_today": int(words_learned_today),
            "tests_completed_today": tests_today,
            "limit_hits_today": limit_hits_today,
            "review_users_today": review_users_today,
            "quiz_accuracy": quiz_accuracy,
            "missing_audio": missing_audio,
            "missing_writing_prompt": missing_writing_prompt,
        },
        "topic_coverage": [{"topic": topic or "Untitled", "count": int(count)} for topic, count in topic_rows],
        "weak_words": [
            {
                "word": word,
                "level": level,
                "answered": int(answered),
                "accuracy": round((correct / answered) * 100) if answered else 0,
            }
            for word, level, answered, correct in weak_rows
        ],
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


@router.post("/words/{word_id}/enrich-pronunciation")
async def enrich_word_pronunciation(word_id: int, db: Session = Depends(get_db)) -> dict:
    word = db.get(WordItem, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    result = await lookup_pronunciation(word.word)
    changed = apply_pronunciation(word, result)
    if changed:
        db.commit()
        db.refresh(word)
    return {"word": serialize_word(word), "updated": changed, "source": result.source}


@router.post("/words/enrich-pronunciation")
async def enrich_missing_pronunciations(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    words = list(
        db.scalars(
            select(WordItem)
            .where(WordItem.is_active.is_(True), or_(WordItem.audio_url.is_(None), WordItem.audio_url == ""))
            .order_by(WordItem.created_at.desc(), WordItem.id.desc())
            .limit(limit)
        )
    )
    checked = len(words)
    updated = 0
    not_found: list[str] = []
    for word in words:
        result = await lookup_pronunciation(word.word)
        if apply_pronunciation(word, result):
            updated += 1
        else:
            not_found.append(word.word)
    db.commit()
    return {
        "checked": checked,
        "updated": updated,
        "not_found": not_found[:25],
        "not_found_count": len(not_found),
    }


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
