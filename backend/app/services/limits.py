from __future__ import annotations

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import LearnerDailyUsage, LearnerTier, LearnerUser


def as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def today_for_user(user: LearnerUser) -> date:
    return datetime.now(ZoneInfo(user.timezone or get_settings().default_timezone)).date()


def get_or_create_usage(db: Session, user: LearnerUser) -> LearnerDailyUsage:
    today = today_for_user(user)
    usage = db.scalar(
        select(LearnerDailyUsage).where(
            LearnerDailyUsage.user_id == user.id,
            LearnerDailyUsage.usage_date == today,
        )
    )
    if not usage:
        usage = LearnerDailyUsage(user_id=user.id, usage_date=today, timezone=user.timezone)
        db.add(usage)
        db.flush()
    return usage


def limit_payload(db: Session, user: LearnerUser) -> dict:
    settings = get_settings()
    usage = get_or_create_usage(db, user)
    if (
        user.tier == LearnerTier.PAID.value
        and user.premium_until
        and as_aware_utc(user.premium_until) <= datetime.now(timezone.utc)
    ):
        user.tier = LearnerTier.FREE.value
        db.commit()
    is_paid = user.tier == LearnerTier.PAID.value
    remaining = None if is_paid else max(settings.free_daily_word_limit - usage.new_words_learned, 0)
    return {
        "tier": user.tier,
        "daily_limit": None if is_paid else settings.free_daily_word_limit,
        "daily_used": usage.new_words_learned,
        "daily_remaining": remaining,
        "can_learn_more": is_paid or usage.new_words_learned < settings.free_daily_word_limit,
    }
