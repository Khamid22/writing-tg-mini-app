from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import LearnerUser


def upsert_user_from_telegram(db: Session, init_payload: dict[str, str]) -> LearnerUser:
    settings = get_settings()
    raw_user = init_payload.get("user")
    try:
        user_data = json.loads(raw_user) if raw_user else {}
    except json.JSONDecodeError:
        user_data = {}
    telegram_user_id = str(user_data.get("id") or "dev-user")
    first_name = user_data.get("first_name") or "Demo"
    last_name = user_data.get("last_name")
    username = user_data.get("username") or "demo_user"
    display_name = " ".join(part for part in (first_name, last_name) if part).strip() or username

    user = db.scalar(select(LearnerUser).where(LearnerUser.telegram_user_id == telegram_user_id))
    if not user:
        user = LearnerUser(
            telegram_user_id=telegram_user_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            display_name=display_name,
            language_code=user_data.get("language_code"),
            timezone=settings.default_timezone,
        )
        db.add(user)
    else:
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.display_name = display_name
        user.language_code = user_data.get("language_code")
    user.last_seen_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user
