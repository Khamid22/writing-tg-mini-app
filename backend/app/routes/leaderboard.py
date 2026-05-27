from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import LearnerProgress, LearnerUser, PointsEvent, ProgressStatus

router = APIRouter(prefix="/api/mini", tags=["leaderboard"])


@router.get("/leaderboard")
def leaderboard(period: str = "weekly", db: Session = Depends(get_db)) -> dict:
    rows = db.execute(
        select(
            LearnerUser.id,
            LearnerUser.display_name,
            LearnerUser.username,
            func.coalesce(func.sum(PointsEvent.points), 0).label("points"),
        )
        .outerjoin(PointsEvent, PointsEvent.user_id == LearnerUser.id)
        .group_by(LearnerUser.id)
        .order_by(func.coalesce(func.sum(PointsEvent.points), 0).desc(), LearnerUser.display_name.asc())
        .limit(50)
    ).all()

    items = []
    for index, row in enumerate(rows, start=1):
        learned_total = db.scalar(
            select(func.count(LearnerProgress.id)).where(
                LearnerProgress.user_id == row.id,
                LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value]),
            )
        ) or 0
        items.append(
            {
                "rank": index,
                "user_id": row.id,
                "display_name": row.display_name,
                "username": row.username,
                "points": row.points,
                "learned_total": learned_total,
            }
        )
    return {"period": period, "items": items}

