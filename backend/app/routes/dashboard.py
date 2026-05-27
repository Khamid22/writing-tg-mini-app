from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerProgress, LearnerUser, ProgressStatus, WordItem
from app.routes.words import word_payload
from app.schemas import DashboardResponse
from app.services.limits import get_or_create_usage, limit_payload

router = APIRouter(prefix="/api/mini", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    usage = get_or_create_usage(db, user)
    progress_rows = list(db.scalars(select(LearnerProgress).where(LearnerProgress.user_id == user.id)))
    learned_total = sum(1 for item in progress_rows if item.status in {ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value})
    mastered_total = sum(1 for item in progress_rows if item.status == ProgressStatus.MASTERED.value)
    answered = sum(item.times_answered for item in progress_rows)
    correct = sum(item.times_correct for item in progress_rows)
    accuracy = round((correct / answered) * 100) if answered else 0

    recent_words = list(
        db.scalars(
            select(WordItem)
            .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
            .where(
                LearnerProgress.user_id == user.id,
                LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value]),
            )
            .order_by(LearnerProgress.learned_at.desc().nulls_last())
            .limit(5)
        )
    )
    limit = limit_payload(db, user)
    return {
        "stats": {
            "learned_total": learned_total,
            "learned_today": usage.new_words_learned,
            "daily_limit": limit["daily_limit"],
            "daily_remaining": limit["daily_remaining"],
            "streak_days": user.streak_days,
            "quiz_accuracy": accuracy,
            "mastered_total": mastered_total,
        },
        "recent_words": [word_payload(word) for word in recent_words],
    }


@router.get("/users/{user_id}")
def public_profile(user_id: int, db: Session = Depends(get_db)) -> dict:
    user = db.get(LearnerUser, user_id)
    if not user:
        return {"error": "User not found"}
    learned_total = db.scalar(
        select(func.count(LearnerProgress.id)).where(
            LearnerProgress.user_id == user.id,
            LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value]),
        )
    ) or 0
    mastered_total = db.scalar(
        select(func.count(LearnerProgress.id)).where(
            LearnerProgress.user_id == user.id,
            LearnerProgress.status == ProgressStatus.MASTERED.value,
        )
    ) or 0
    return {
        "user": {"id": user.id, "display_name": user.display_name, "username": user.username},
        "stats": {
            "learned_total": learned_total,
            "streak_days": user.streak_days,
            "weekly_points": learned_total * 20,
            "mastered_total": mastered_total,
        },
    }

