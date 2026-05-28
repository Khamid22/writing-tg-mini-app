from __future__ import annotations

from datetime import datetime

from app.models import LearnerUser, PaymentRequest, WordItem
from app.routes.words import word_payload


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def serialize_word(word: WordItem) -> dict:
    return {
        **word_payload(word),
        "is_active": word.is_active,
        "created_at": iso(word.created_at),
    }


def serialize_user(user: LearnerUser, learned_count: int = 0, total_points: int = 0) -> dict:
    return {
        "id": user.id,
        "display_name": user.display_name,
        "username": user.username,
        "tier": user.tier,
        "premium_until": iso(user.premium_until),
        "streak_days": user.streak_days,
        "last_seen_at": iso(user.last_seen_at),
        "created_at": iso(user.created_at),
        "learned_count": learned_count,
        "total_points": total_points,
    }


def serialize_payment(payment: PaymentRequest) -> dict:
    user = payment.user
    return {
        "id": payment.id,
        "code": payment.code,
        "user_id": payment.user_id,
        "user_display_name": user.display_name if user else "—",
        "user_username": user.username if user else None,
        "plan": payment.plan,
        "plan_days": payment.plan_days,
        "amount_uzs": payment.amount_uzs,
        "status": payment.status,
        "admin_note": payment.admin_note,
        "created_at": iso(payment.created_at),
        "submitted_at": iso(payment.submitted_at),
        "approved_at": iso(payment.approved_at),
        "cancelled_at": iso(payment.cancelled_at),
        "expires_at": iso(payment.expires_at),
    }
