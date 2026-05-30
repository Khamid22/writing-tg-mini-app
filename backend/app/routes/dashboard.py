from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerProgress, LearnerUser, PointsEvent, ProgressStatus, WordItem
from app.routes.words import word_payload
from app.schemas import DashboardResponse
from app.services.limits import get_or_create_usage, limit_payload

router = APIRouter(prefix="/api/mini", tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    usage = get_or_create_usage(db, user)

    agg = db.execute(
        select(
            func.count(LearnerProgress.id).filter(
                LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value])
            ).label("learned_total"),
            func.count(LearnerProgress.id).filter(
                LearnerProgress.status == ProgressStatus.MASTERED.value
            ).label("mastered_total"),
            func.coalesce(func.sum(LearnerProgress.times_answered), 0).label("answered"),
            func.coalesce(func.sum(LearnerProgress.times_correct), 0).label("correct"),
        ).where(LearnerProgress.user_id == user.id)
    ).one()

    accuracy = round((agg.correct / agg.answered) * 100) if agg.answered else 0

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
            "learned_total": agg.learned_total,
            "learned_today": usage.new_words_learned,
            "daily_limit": limit["daily_limit"],
            "daily_remaining": limit["daily_remaining"],
            "streak_days": user.streak_days,
            "quiz_accuracy": accuracy,
            "mastered_total": agg.mastered_total,
        },
        "recent_words": [word_payload(word) for word in recent_words],
    }


@router.get("/progress")
def progress(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    """Full per-word progress for the current user, so the client can hydrate its
    local state from the backend (the single source of truth) instead of relying on
    in-session localStorage. Keyed by backend word IDs."""
    rows = db.execute(
        select(
            LearnerProgress.word_item_id,
            LearnerProgress.status,
            LearnerProgress.mastery_score,
        ).where(LearnerProgress.user_id == user.id)
    ).all()
    return {
        "items": [
            {"word_id": row.word_item_id, "status": row.status, "mastery_score": row.mastery_score}
            for row in rows
        ]
    }


@router.get("/users/{user_id}")
def public_profile(user_id: int, db: Session = Depends(get_db)) -> dict:
    user = db.get(LearnerUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    agg = db.execute(
        select(
            func.count(LearnerProgress.id).filter(
                LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value])
            ).label("learned_total"),
            func.count(LearnerProgress.id).filter(
                LearnerProgress.status == ProgressStatus.MASTERED.value
            ).label("mastered_total"),
        ).where(LearnerProgress.user_id == user.id)
    ).one()

    total_points = db.scalar(
        select(func.coalesce(func.sum(PointsEvent.points), 0)).where(PointsEvent.user_id == user.id)
    ) or 0

    recent_words = list(
        db.scalars(
            select(WordItem)
            .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
            .where(
                LearnerProgress.user_id == user.id,
                LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value]),
            )
            .order_by(LearnerProgress.learned_at.desc().nulls_last())
            .limit(6)
        )
    )

    return {
        "user": {"id": user.id, "display_name": user.display_name},
        "stats": {
            "learned_total": agg.learned_total,
            "mastered_total": agg.mastered_total,
            "streak_days": user.streak_days,
            "total_points": total_points,
        },
        "recent_words": [word_payload(word) for word in recent_words],
    }
