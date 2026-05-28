from __future__ import annotations

import hashlib
import hmac
import json
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from urllib.parse import parse_qsl

from fastapi import HTTPException

from app.config import get_settings

_SESSION_TTL = 30 * 24 * 3600  # 30 days


def _b64encode(data: bytes) -> str:
    return urlsafe_b64encode(data).decode().rstrip("=")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return urlsafe_b64decode(data + padding)


def create_session_token(user_id: int) -> str:
    settings = get_settings()
    now = int(time.time())
    payload = {"sub": user_id, "iat": now, "exp": now + _SESSION_TTL}
    encoded_payload = _b64encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(settings.secret_key.encode(), encoded_payload.encode(), hashlib.sha256).digest()
    return f"{encoded_payload}.{_b64encode(signature)}"


def verify_session_token(token: str) -> int:
    settings = get_settings()
    try:
        encoded_payload, received_signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid session token") from exc

    expected_signature = hmac.new(settings.secret_key.encode(), encoded_payload.encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(_b64encode(expected_signature), received_signature):
        raise HTTPException(status_code=401, detail="Invalid session token")

    try:
        payload = json.loads(_b64decode(encoded_payload))
        if int(time.time()) > payload.get("exp", 0):
            raise HTTPException(status_code=401, detail="Session token expired")
        return int(payload["sub"])
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid session token") from exc


def verify_telegram_init_data(init_data: str) -> dict[str, str]:
    settings = get_settings()
    if not settings.telegram_bot_token:
        if settings.allow_dev_auth and not settings.is_production:
            return {}
        raise HTTPException(status_code=401, detail="Telegram bot token is not configured")

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        if settings.allow_dev_auth and not settings.is_production:
            return {}
        raise HTTPException(status_code=401, detail="Missing Telegram auth hash")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        if settings.allow_dev_auth and not settings.is_production:
            return {}
        raise HTTPException(status_code=401, detail="Invalid Telegram auth signature")

    return parsed
