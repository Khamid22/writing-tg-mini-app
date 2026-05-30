from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import LearnerProgress, LearnerUser, PointsEvent, ProgressStatus

router = APIRouter(prefix="/api/mini", tags=["leaderboard"])


@router.get("/leaderboard")
def leaderboard(period: str = "weekly", db: Session = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)

    points_q = select(
        PointsEvent.user_id,
        func.coalesce(func.sum(PointsEvent.points), 0).label("total"),
    ).group_by(PointsEvent.user_id)
    if period == "weekly":
        points_q = points_q.where(PointsEvent.created_at >= now - timedelta(days=7))
    points_subq = points_q.subquery()

    learned_subq = (
        select(
            LearnerProgress.user_id,
            func.count(LearnerProgress.id).label("count"),
        )
        .where(LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value]))
        .group_by(LearnerProgress.user_id)
        .subquery()
    )

    rows = db.execute(
        select(
            LearnerUser.id,
            LearnerUser.display_name,
            func.coalesce(points_subq.c.total, 0).label("points"),
            func.coalesce(learned_subq.c.count, 0).label("learned_total"),
        )
        .outerjoin(points_subq, points_subq.c.user_id == LearnerUser.id)
        .outerjoin(learned_subq, learned_subq.c.user_id == LearnerUser.id)
        .order_by(func.coalesce(points_subq.c.total, 0).desc(), LearnerUser.display_name.asc())
        .limit(50)
    ).all()

    return {
        "period": period,
        "items": [
            {
                "rank": index,
                "user_id": row.id,
                "display_name": row.display_name,
                "points": row.points,
                "learned_total": row.learned_total,
            }
            for index, row in enumerate(rows, start=1)
        ],
    }
