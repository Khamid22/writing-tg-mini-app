from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.auth.telegram import verify_session_token
from app.config import get_settings
from app.db.session import get_db
from app.models import LearnerUser


def current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_user_id: int | None = Header(default=None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> LearnerUser:
    settings = get_settings()
    user_id: int | None = None
    if authorization and authorization.lower().startswith("bearer "):
        user_id = verify_session_token(authorization.split(" ", 1)[1].strip())
    elif x_user_id and settings.allow_dev_auth and not settings.is_production:
        user_id = x_user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="Authenticate first.")
    user = db.get(LearnerUser, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
