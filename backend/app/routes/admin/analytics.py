from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Date as SqlDate, cast, func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import LearnerDailyUsage, LearnerUser
from app.routes.admin.auth import require_admin

router = APIRouter(dependencies=[Depends(require_admin)])


def _date_series(rows: list[tuple[date, int]], days: int) -> list[dict]:
    counts = {str(day): count for day, count in rows}
    today = datetime.now(timezone.utc).date()
    return [
        {"date": (d := str(today - timedelta(days=days - 1 - i))), "count": counts.get(d, 0)}
        for i in range(days)
    ]


@router.get("/analytics")
def analytics(days: int = Query(default=30, ge=7, le=90), db: Session = Depends(get_db)) -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    signups = db.execute(
        select(cast(LearnerUser.created_at, SqlDate), func.count(LearnerUser.id))
        .where(LearnerUser.created_at >= cutoff)
        .group_by(cast(LearnerUser.created_at, SqlDate))
    ).all()

    dau = db.execute(
        select(LearnerDailyUsage.usage_date, func.count(LearnerDailyUsage.user_id.distinct()))
        .where(LearnerDailyUsage.usage_date >= cutoff.date())
        .group_by(LearnerDailyUsage.usage_date)
    ).all()

    return {
        "signups": _date_series([(r[0], r[1]) for r in signups], days),
        "dau": _date_series([(r[0], r[1]) for r in dau], days),
    }
