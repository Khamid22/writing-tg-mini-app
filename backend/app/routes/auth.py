from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.telegram import create_session_token, verify_telegram_init_data
from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerUser
from app.schemas import AuthResponse, MeResponse, TelegramAuthRequest
from app.services.limits import limit_payload
from app.services.users import upsert_user_from_telegram

router = APIRouter(prefix="/api/mini", tags=["auth"])


class PreferencesRequest(BaseModel):
    display_name: str | None = None
    selected_level: str | None = None
    preferred_topic: str | None = None


def user_payload(user: LearnerUser) -> dict:
    return {
        "id": user.id,
        "display_name": user.display_name,
        "username": user.username,
        "tier": user.tier,
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
        "selected_level": user.selected_level,
        "preferred_topic": user.preferred_topic,
    }


@router.post("/auth/telegram", response_model=AuthResponse)
def telegram_auth(payload: TelegramAuthRequest, db: Session = Depends(get_db)) -> dict:
    init_payload = verify_telegram_init_data(payload.init_data)
    user = upsert_user_from_telegram(db, init_payload)
    return {"user": user_payload(user), "token": create_session_token(user.id)}


@router.get("/me", response_model=MeResponse)
def me(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    return {"user": user_payload(user), "limit": limit_payload(db, user)}


@router.patch("/me/preferences", response_model=MeResponse)
def update_preferences(
    payload: PreferencesRequest,
    user: LearnerUser = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict:
    allowed_levels = {"A1", "A2", "B1", "B2", "C1", "C2"}
    if payload.display_name is not None:
        name = payload.display_name.strip()
        if name:
            user.display_name = name[:160]
    if payload.selected_level is not None:
        level = payload.selected_level.strip().upper()
        if level in allowed_levels:
            user.selected_level = level
    if payload.preferred_topic is not None:
        topic = payload.preferred_topic.strip()
        user.preferred_topic = topic[:120] or None
    db.commit()
    db.refresh(user)
    return {"user": user_payload(user), "limit": limit_payload(db, user)}
