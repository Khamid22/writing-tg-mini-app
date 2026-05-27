from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.telegram import create_session_token, verify_telegram_init_data
from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerUser
from app.schemas import AuthResponse, MeResponse, TelegramAuthRequest
from app.services.limits import limit_payload
from app.services.users import upsert_user_from_telegram

router = APIRouter(prefix="/api/mini", tags=["auth"])


def user_payload(user: LearnerUser) -> dict:
    return {
        "id": user.id,
        "display_name": user.display_name,
        "username": user.username,
        "tier": user.tier,
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
    }


@router.post("/auth/telegram", response_model=AuthResponse)
def telegram_auth(payload: TelegramAuthRequest, db: Session = Depends(get_db)) -> dict:
    init_payload = verify_telegram_init_data(payload.init_data)
    user = upsert_user_from_telegram(db, init_payload)
    return {"user": user_payload(user), "token": create_session_token(user.id)}


@router.get("/me", response_model=MeResponse)
def me(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    return {"user": user_payload(user), "limit": limit_payload(db, user)}
