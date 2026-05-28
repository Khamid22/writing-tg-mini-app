from __future__ import annotations

import hashlib
import hmac
import json
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings

router = APIRouter()
SESSION_TTL_SECONDS = 7 * 24 * 3600


class LoginRequest(BaseModel):
    password: str = Field(min_length=1)


def _b64encode(data: bytes) -> str:
    return urlsafe_b64encode(data).decode().rstrip("=")


def _b64decode(data: str) -> bytes:
    return urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _admin_secret() -> str:
    settings = get_settings()
    return settings.admin_password or settings.admin_approval_token


def create_session_token() -> str:
    settings = get_settings()
    now = int(time.time())
    payload = {"sub": "admin", "iat": now, "exp": now + SESSION_TTL_SECONDS}
    encoded = _b64encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(settings.secret_key.encode(), encoded.encode(), hashlib.sha256).digest()
    return f"{encoded}.{_b64encode(signature)}"


def verify_session_token(token: str) -> None:
    try:
        encoded, received_sig = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Invalid admin session") from exc

    settings = get_settings()
    expected_sig = hmac.new(settings.secret_key.encode(), encoded.encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(_b64encode(expected_sig), received_sig):
        raise HTTPException(status_code=403, detail="Invalid admin session")

    try:
        payload = json.loads(_b64decode(encoded))
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=403, detail="Invalid admin session") from exc

    if payload.get("sub") != "admin" or int(time.time()) > payload.get("exp", 0):
        raise HTTPException(status_code=403, detail="Admin session expired")


def require_admin(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
) -> None:
    if authorization and authorization.lower().startswith("bearer "):
        verify_session_token(authorization.split(" ", 1)[1].strip())
        return
    settings = get_settings()
    if settings.admin_approval_token and x_admin_token == settings.admin_approval_token:
        return
    raise HTTPException(status_code=403, detail="Invalid admin session")


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    expected = _admin_secret()
    if not expected:
        raise HTTPException(status_code=403, detail="Admin password is not configured")
    if not hmac.compare_digest(payload.password, expected):
        raise HTTPException(status_code=403, detail="Invalid admin password")
    return {"token": create_session_token()}
