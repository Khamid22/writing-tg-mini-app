from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import LearnerProgress, LearnerTier, LearnerUser, PointsEvent, ProgressStatus, WordItem
from app.services.limits import get_or_create_usage, today_for_user


def get_or_create_progress(db: Session, user: LearnerUser, word: WordItem) -> LearnerProgress:
    progress = db.scalar(
        select(LearnerProgress).where(
            LearnerProgress.user_id == user.id,
            LearnerProgress.word_item_id == word.id,
        )
    )
    if not progress:
        progress = LearnerProgress(user_id=user.id, word_item_id=word.id)
        db.add(progress)
        db.flush()
    return progress


LEARNED_STATUSES = (ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value)
REVIEW_EVENTS = {"remembered", "forgot"}
KNOWN_EVENTS = {"seen", "listened", "flipped", "learned", "practice_later"} | REVIEW_EVENTS


def next_word_for_user(db: Session, user: LearnerUser) -> tuple[WordItem | None, bool]:
    """Return (word, is_review). New unlearned words come first; once exhausted, fall back
    to the learned word that hasn't been reviewed for the longest (with weakest mastery as tiebreaker)."""
    touched_ids = select(LearnerProgress.word_item_id).where(
        LearnerProgress.user_id == user.id,
    )
    new_word = db.scalar(
        select(WordItem)
        .where(WordItem.is_active.is_(True), WordItem.id.not_in(touched_ids))
        .order_by(WordItem.id.asc())
        .limit(1)
    )
    if new_word:
        return new_word, False

    learning_word = db.scalar(
        select(WordItem)
        .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
        .where(
            WordItem.is_active.is_(True),
            LearnerProgress.user_id == user.id,
            LearnerProgress.status.in_([ProgressStatus.SEEN.value, ProgressStatus.LEARNING.value]),
        )
        .order_by(LearnerProgress.last_reviewed_at.asc().nulls_first(), LearnerProgress.mastery_score.asc())
        .limit(1)
    )
    if learning_word:
        return learning_word, False

    review_word = db.scalar(
        select(WordItem)
        .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
        .where(
            WordItem.is_active.is_(True),
            LearnerProgress.user_id == user.id,
            LearnerProgress.status.in_(LEARNED_STATUSES),
        )
        .order_by(LearnerProgress.last_reviewed_at.asc().nulls_first(), LearnerProgress.mastery_score.asc())
        .limit(1)
    )
    return review_word, review_word is not None


def apply_word_event(db: Session, user: LearnerUser, word: WordItem, event: str) -> LearnerProgress:
    if event not in KNOWN_EVENTS:
        raise HTTPException(status_code=400, detail="Unknown word event")

    now = datetime.now(timezone.utc)
    progress = get_or_create_progress(db, user, word)
    if not progress.first_seen_at:
        progress.first_seen_at = now

    if event == "seen":
        progress.times_seen += 1
        if progress.status == ProgressStatus.NEW.value:
            progress.status = ProgressStatus.SEEN.value
    elif event == "listened":
        progress.times_listened += 1
    elif event == "flipped":
        progress.times_flipped += 1
        progress.mastery_score = max(progress.mastery_score, 5)
        if progress.status == ProgressStatus.NEW.value:
            progress.status = ProgressStatus.SEEN.value
    elif event == "practice_later":
        progress.status = ProgressStatus.LEARNING.value
        progress.mastery_score = max(progress.mastery_score, 10)
    elif event == "learned":
        was_learned = progress.status in LEARNED_STATUSES
        usage = get_or_create_usage(db, user)
        settings = get_settings()
        if user.tier != LearnerTier.PAID.value and not was_learned and usage.new_words_learned >= settings.free_daily_word_limit:
            raise HTTPException(status_code=403, detail="Daily free limit reached")

        progress.status = ProgressStatus.LEARNED.value
        progress.mastery_score = max(progress.mastery_score, 25)
        progress.learned_at = progress.learned_at or now
        if not was_learned:
            usage.new_words_learned += 1
            today = today_for_user(user)
            if user.last_learning_date != today:
                user.streak_days += 1
                user.last_learning_date = today
            db.add(PointsEvent(user_id=user.id, event_type="word_learned", points=20))
    elif event == "remembered":
        progress.last_reviewed_at = now
        progress.mastery_score = min(100, progress.mastery_score + 5)
    elif event == "forgot":
        progress.last_reviewed_at = now
        progress.mastery_score = max(0, progress.mastery_score - 10)
        if progress.status == ProgressStatus.MASTERED.value:
            progress.status = ProgressStatus.LEARNED.value

    db.commit()
    db.refresh(progress)
    return progress


def learned_count(db: Session, user_id: int) -> int:
    return db.scalar(
        select(func.count(LearnerProgress.id)).where(
            LearnerProgress.user_id == user_id,
            LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value]),
        )
    ) or 0
