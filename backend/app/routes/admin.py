from __future__ import annotations

import hashlib
import hmac
import json
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_db
from app.models import LearnerUser, PaymentRequest, PaymentStatus, WordItem
from app.routes.words import word_payload

router = APIRouter(prefix="/api/admin", tags=["admin"])
_ADMIN_SESSION_TTL = 7 * 24 * 3600


def _b64encode(data: bytes) -> str:
    return urlsafe_b64encode(data).decode().rstrip("=")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return urlsafe_b64decode(data + padding)


def _admin_login_secret() -> str:
    settings = get_settings()
    return settings.admin_password or settings.admin_approval_token


def _create_admin_session() -> str:
    settings = get_settings()
    now = int(time.time())
    payload = {"sub": "admin", "iat": now, "exp": now + _ADMIN_SESSION_TTL}
    encoded_payload = _b64encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(settings.secret_key.encode(), encoded_payload.encode(), hashlib.sha256).digest()
    return f"{encoded_payload}.{_b64encode(signature)}"


def _verify_admin_session(token: str) -> None:
    try:
        encoded_payload, received_signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Invalid admin session") from exc

    settings = get_settings()
    expected_signature = hmac.new(settings.secret_key.encode(), encoded_payload.encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(_b64encode(expected_signature), received_signature):
        raise HTTPException(status_code=403, detail="Invalid admin session")

    try:
        payload = json.loads(_b64decode(encoded_payload))
        if payload.get("sub") != "admin" or int(time.time()) > payload.get("exp", 0):
            raise HTTPException(status_code=403, detail="Admin session expired")
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=403, detail="Invalid admin session") from exc


class AdminLoginRequest(BaseModel):
    password: str = Field(min_length=1)


class AdminWordPayload(BaseModel):
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


class AdminWordPatch(BaseModel):
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


def require_admin_token(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
) -> None:
    settings = get_settings()
    if authorization and authorization.lower().startswith("bearer "):
        _verify_admin_session(authorization.split(" ", 1)[1].strip())
        return
    if settings.admin_approval_token and x_admin_token == settings.admin_approval_token:
        return
    raise HTTPException(status_code=403, detail="Invalid admin session")


def admin_word_payload(word: WordItem) -> dict:
    payload = word_payload(word)
    payload["is_active"] = word.is_active
    payload["created_at"] = word.created_at.isoformat() if word.created_at else None
    return payload


@router.post("/login")
def admin_login(payload: AdminLoginRequest) -> dict:
    expected_password = _admin_login_secret()
    if not expected_password:
        raise HTTPException(status_code=403, detail="Admin password is not configured")
    if not hmac.compare_digest(payload.password, expected_password):
        raise HTTPException(status_code=403, detail="Invalid admin password")
    return {"token": _create_admin_session()}


@router.get("/summary")
def admin_summary(db: Session = Depends(get_db), _: None = Depends(require_admin_token)) -> dict:
    total_words = db.scalar(select(func.count(WordItem.id))) or 0
    published_words = db.scalar(select(func.count(WordItem.id)).where(WordItem.is_active.is_(True))) or 0
    draft_words = total_words - published_words
    total_users = db.scalar(select(func.count(LearnerUser.id))) or 0
    premium_users = db.scalar(select(func.count(LearnerUser.id)).where(LearnerUser.tier == "paid")) or 0
    pending_payments = (
        db.scalar(
            select(func.count(PaymentRequest.id)).where(
                PaymentRequest.status.in_([PaymentStatus.PENDING.value, PaymentStatus.SUBMITTED.value])
            )
        )
        or 0
    )
    recent_words = list(db.scalars(select(WordItem).order_by(WordItem.created_at.desc()).limit(5)))
    return {
        "stats": {
            "total_words": total_words,
            "published_words": published_words,
            "draft_words": draft_words,
            "total_users": total_users,
            "premium_users": premium_users,
            "pending_payments": pending_payments,
        },
        "recent_words": [admin_word_payload(word) for word in recent_words],
    }


@router.get("/words")
def admin_words(
    search: str = "",
    status: Literal["all", "published", "draft"] = "all",
    level: str = "",
    word_type: str = "",
    limit: int = Query(default=100, ge=1, le=300),
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token),
) -> dict:
    query = select(WordItem)
    if search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                WordItem.word.ilike(term),
                WordItem.uzbek_definition.ilike(term),
                WordItem.english_definition.ilike(term),
                WordItem.topic.ilike(term),
                WordItem.collection.ilike(term),
                WordItem.tags.ilike(term),
            )
        )
    if status == "published":
        query = query.where(WordItem.is_active.is_(True))
    elif status == "draft":
        query = query.where(WordItem.is_active.is_(False))
    if level.strip():
        query = query.where(WordItem.level == level.strip())
    if word_type.strip():
        query = query.where(WordItem.word_type == word_type.strip())

    rows = list(
        db.scalars(
            query.order_by(
                WordItem.difficulty_order.asc(),
                WordItem.created_at.desc(),
                WordItem.id.desc(),
            ).limit(limit)
        )
    )
    return {"items": [admin_word_payload(word) for word in rows]}


@router.post("/words")
def create_admin_word(
    payload: AdminWordPayload,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token),
) -> dict:
    word = WordItem(**payload.model_dump())
    db.add(word)
    db.commit()
    db.refresh(word)
    return admin_word_payload(word)


@router.patch("/words/{word_id}")
def update_admin_word(
    word_id: int,
    payload: AdminWordPatch,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token),
) -> dict:
    word = db.get(WordItem, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(word, key, value)
    db.commit()
    db.refresh(word)
    return admin_word_payload(word)


@router.delete("/words/{word_id}")
def disable_admin_word(
    word_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_token),
) -> dict:
    word = db.get(WordItem, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    word.is_active = False
    db.commit()
    db.refresh(word)
    return admin_word_payload(word)
