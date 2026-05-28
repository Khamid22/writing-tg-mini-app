from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import LearnerProgress, LearnerUser, PointsEvent
from app.routes.admin.auth import require_admin
from app.routes.admin.serializers import serialize_user

router = APIRouter(dependencies=[Depends(require_admin)])

LEARNED_STATUSES = ("learned", "mastered")


class UserPatch(BaseModel):
    tier: Literal["free", "paid"] | None = None
    premium_until: str | None = None  # ISO or "" to clear


@router.get("/users")
def list_users(
    search: str = "",
    tier: str = "",
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    learned_subq = (
        select(LearnerProgress.user_id, func.count(LearnerProgress.id).label("learned_count"))
        .where(LearnerProgress.status.in_(LEARNED_STATUSES))
        .group_by(LearnerProgress.user_id)
        .subquery()
    )
    points_subq = (
        select(PointsEvent.user_id, func.coalesce(func.sum(PointsEvent.points), 0).label("total_points"))
        .group_by(PointsEvent.user_id)
        .subquery()
    )
    query = (
        select(
            LearnerUser,
            func.coalesce(learned_subq.c.learned_count, 0),
            func.coalesce(points_subq.c.total_points, 0),
        )
        .outerjoin(learned_subq, LearnerUser.id == learned_subq.c.user_id)
        .outerjoin(points_subq, LearnerUser.id == points_subq.c.user_id)
    )
    if term := search.strip():
        like = f"%{term}%"
        query = query.where(or_(LearnerUser.display_name.ilike(like), LearnerUser.username.ilike(like)))
    if tier in ("free", "paid"):
        query = query.where(LearnerUser.tier == tier)

    total = db.scalar(select(func.count(LearnerUser.id))) or 0
    rows = db.execute(query.order_by(LearnerUser.created_at.desc()).limit(limit).offset(offset)).all()
    return {
        "total": total,
        "items": [serialize_user(user, int(learned), int(points)) for user, learned, points in rows],
    }


@router.get("/users/{user_id}")
def user_detail(user_id: int, db: Session = Depends(get_db)) -> dict:
    user = db.get(LearnerUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_learned = case((LearnerProgress.status.in_(LEARNED_STATUSES), 1), else_=0)
    is_mastered = case((LearnerProgress.status == "mastered", 1), else_=0)
    has_quiz = case((LearnerProgress.times_answered > 0, 1), else_=0)

    progress_row = db.execute(
        select(
            func.coalesce(func.sum(is_learned), 0),
            func.coalesce(func.sum(is_mastered), 0),
            func.coalesce(func.sum(has_quiz), 0),
            func.coalesce(func.sum(LearnerProgress.times_correct), 0),
            func.coalesce(func.sum(LearnerProgress.times_answered), 0),
        ).where(LearnerProgress.user_id == user_id)
    ).one()
    learned, mastered, quizzed, correct, answered = (int(v) for v in progress_row)

    total_points = db.scalar(
        select(func.coalesce(func.sum(PointsEvent.points), 0)).where(PointsEvent.user_id == user_id)
    ) or 0
    accuracy = round(correct / answered * 100) if answered else 0

    return {
        **serialize_user(user, learned, int(total_points)),
        "mastered_count": mastered,
        "quiz_attempted": quizzed,
        "quiz_accuracy": accuracy,
    }


@router.patch("/users/{user_id}")
def update_user(user_id: int, payload: UserPatch, db: Session = Depends(get_db)) -> dict:
    user = db.get(LearnerUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.tier is not None:
        user.tier = payload.tier
    if payload.premium_until is not None:
        if payload.premium_until == "":
            user.premium_until = None
        else:
            try:
                user.premium_until = datetime.fromisoformat(payload.premium_until)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid datetime format") from exc
    db.commit()
    db.refresh(user)
    return serialize_user(user)
