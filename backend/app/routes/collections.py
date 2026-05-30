from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerProgress, LearnerTier, LearnerUser, ProgressStatus, WordItem, WordQualityStatus

router = APIRouter(prefix="/api/mini/collections", tags=["collections"])


LEARNED_STATUSES = (ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value)


@router.get("")
def list_collections(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    """Return one row per distinct active collection with totals + this user's learned count."""
    learned_subq = (
        select(
            WordItem.collection.label("collection"),
            func.count(LearnerProgress.id).label("learned_count"),
        )
        .select_from(LearnerProgress)
        .join(WordItem, WordItem.id == LearnerProgress.word_item_id)
        .where(
            LearnerProgress.user_id == user.id,
            LearnerProgress.status.in_(LEARNED_STATUSES),
        )
        .group_by(WordItem.collection)
        .subquery()
    )

    rows = db.execute(
        select(
            WordItem.collection,
            func.count(WordItem.id).label("total_words"),
            func.min(WordItem.level).label("min_level"),
            func.max(WordItem.level).label("max_level"),
            func.coalesce(learned_subq.c.learned_count, 0).label("learned_count"),
        )
        .outerjoin(learned_subq, learned_subq.c.collection == WordItem.collection)
        .where(WordItem.is_active.is_(True))
        .where(WordItem.quality_status == WordQualityStatus.PUBLISHED.value)
        .group_by(WordItem.collection)
        .order_by(WordItem.collection.asc())
    ).all()

    settings = get_settings()
    free_name = settings.free_collection_name
    is_paid = user.tier == LearnerTier.PAID.value

    items = []
    for name, total, min_level, max_level, learned in rows:
        items.append({
            "name": name,
            "total_words": int(total),
            "learned_count": int(learned),
            "level_range": (
                min_level if min_level == max_level else f"{min_level}–{max_level}"
            ) if min_level else "—",
            "is_locked": (not is_paid) and (name != free_name),
        })
    return {"items": items, "free_collection_name": free_name}
