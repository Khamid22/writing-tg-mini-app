from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import LearnerProgress, LearnerTier, LearnerUser, PointsEvent, ProgressStatus, WordItem, WordQualityStatus
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
KNOWN_EVENTS = {
    "seen",
    "listened",
    "flipped",
    "learned",
    "practice_later",
    "undo_learned",
    "bookmark",
    "unbookmark",
} | REVIEW_EVENTS


LEVEL_ORDER = case(
    (WordItem.level == "A1", 1),
    (WordItem.level == "A2", 2),
    (WordItem.level == "B1", 3),
    (WordItem.level == "B2", 4),
    (WordItem.level == "C1", 5),
    else_=6,
)


# Difficulty gating: the learner climbs this ladder automatically. The next level
# only unlocks once they've covered most of the current one, so beginners are never
# served words above their reach.
LEVEL_SEQUENCE = ("A1", "A2", "B1", "B2", "C1", "C2")
LEVEL_UNLOCK_COVERAGE = 0.8  # learn ~this share of a level before the next opens


def allowed_levels_for_user(db: Session, user: LearnerUser) -> list[str]:
    """Progressive, automatic difficulty gating. Always returns at least the first
    level, and only unlocks a harder level when the learner has learned/mastered most
    of every easier one."""
    published = (
        WordItem.is_active.is_(True),
        WordItem.quality_status == WordQualityStatus.PUBLISHED.value,
    )
    totals = dict(
        db.execute(
            select(WordItem.level, func.count(WordItem.id))
            .where(*published)
            .group_by(WordItem.level)
        ).all()
    )
    learned = dict(
        db.execute(
            select(WordItem.level, func.count(LearnerProgress.id))
            .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
            .where(
                *published,
                LearnerProgress.user_id == user.id,
                LearnerProgress.status.in_(LEARNED_STATUSES),
            )
            .group_by(WordItem.level)
        ).all()
    )

    selected_index = LEVEL_SEQUENCE.index(user.selected_level) if user.selected_level in LEVEL_SEQUENCE else 0
    selected_allowed = list(LEVEL_SEQUENCE[: selected_index + 1])
    allowed: list[str] = []
    for level in LEVEL_SEQUENCE:
        allowed.append(level)
        total = totals.get(level, 0)
        if total == 0:
            continue  # no words at this level → nothing to gate on, keep climbing
        if learned.get(level, 0) < total * LEVEL_UNLOCK_COVERAGE:
            break  # current level not covered yet → harder levels stay locked
    return sorted(set(allowed or [LEVEL_SEQUENCE[0]]) | set(selected_allowed), key=LEVEL_SEQUENCE.index)


def level_progress_for_user(db: Session, user: LearnerUser) -> list[dict]:
    published = (
        WordItem.is_active.is_(True),
        WordItem.quality_status == WordQualityStatus.PUBLISHED.value,
    )
    totals = dict(db.execute(select(WordItem.level, func.count(WordItem.id)).where(*published).group_by(WordItem.level)).all())
    learned = dict(
        db.execute(
            select(WordItem.level, func.count(LearnerProgress.id))
            .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
            .where(*published, LearnerProgress.user_id == user.id, LearnerProgress.status.in_(LEARNED_STATUSES))
            .group_by(WordItem.level)
        ).all()
    )
    allowed = set(allowed_levels_for_user(db, user))
    return [
        {
            "level": level,
            "total": totals.get(level, 0),
            "learned": learned.get(level, 0),
            "unlock_at": round(totals.get(level, 0) * LEVEL_UNLOCK_COVERAGE),
            "is_unlocked": level in allowed,
        }
        for level in LEVEL_SEQUENCE
    ]


def next_word_for_user(
    db: Session,
    user: LearnerUser,
    collection: str | None = None,
    topic: str | None = None,
) -> tuple[WordItem | None, bool]:
    """Return (word, is_review). New unlearned words come first; once exhausted, fall back
    to the learned word that hasn't been reviewed for the longest (with weakest mastery as tiebreaker).
    When `collection` is set, only words from that collection are considered."""
    touched_ids = select(LearnerProgress.word_item_id).where(
        LearnerProgress.user_id == user.id,
    )
    published_filter = (
        WordItem.is_active.is_(True),
        WordItem.quality_status == WordQualityStatus.PUBLISHED.value,
    )

    def apply_scope(q):
        if collection:
            q = q.where(WordItem.collection == collection)
        if topic:
            q = q.where(WordItem.topic == topic)
        return q

    now = datetime.now(timezone.utc)

    def _review_query(statuses: list[str], due_only: bool):
        q = (
            select(WordItem)
            .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
            .where(
                *published_filter,
                LearnerProgress.user_id == user.id,
                LearnerProgress.status.in_(statuses),
            )
            .order_by(LearnerProgress.review_due_at.asc().nulls_first(), LearnerProgress.last_reviewed_at.asc().nulls_first(), LearnerProgress.mastery_score.asc())
            .limit(1)
        )
        if due_only:
            q = q.where((LearnerProgress.review_due_at.is_(None)) | (LearnerProgress.review_due_at <= now))
        return apply_scope(q)

    learning_word = db.scalar(_review_query([ProgressStatus.SEEN.value, ProgressStatus.LEARNING.value], due_only=False))
    if learning_word:
        return learning_word, False

    due_review_word = db.scalar(_review_query(list(LEARNED_STATUSES), due_only=True))
    if due_review_word:
        return due_review_word, True

    # Level-gating applies whether or not a course is selected, so a beginner who opens
    # an advanced course still never receives words above their reach.
    new_q = select(WordItem).where(
        *published_filter,
        WordItem.id.not_in(touched_ids),
        WordItem.level.in_(allowed_levels_for_user(db, user)),
    )
    new_q = apply_scope(new_q)
    new_word = db.scalar(new_q.order_by(LEVEL_ORDER.asc(), WordItem.difficulty_order.asc(), WordItem.id.asc()).limit(1))
    if new_word:
        return new_word, False

    review_word = db.scalar(_review_query(list(LEARNED_STATUSES), due_only=False))
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
        # "Keyinroq" defers the card without progressing it. Never demote a learned
        # word, never bump mastery — we're not committing to learning yet.
        if progress.status not in LEARNED_STATUSES and progress.status != ProgressStatus.LEARNING.value:
            progress.status = ProgressStatus.LEARNING.value
        progress.last_reviewed_at = now
        progress.review_due_at = now + timedelta(days=1)
    elif event == "learned":
        was_learned = progress.status in LEARNED_STATUSES
        usage = get_or_create_usage(db, user)
        settings = get_settings()
        if user.tier != LearnerTier.PAID.value and not was_learned and usage.new_words_learned >= settings.free_daily_word_limit:
            raise HTTPException(status_code=403, detail="Daily free limit reached")

        progress.status = ProgressStatus.LEARNED.value
        progress.mastery_score = max(progress.mastery_score, 25)
        progress.learned_at = progress.learned_at or now
        progress.review_interval_days = max(progress.review_interval_days, 1)
        progress.review_due_at = now + timedelta(days=progress.review_interval_days)
        if not was_learned:
            usage.new_words_learned += 1
            today = today_for_user(user)
            if user.last_learning_date != today:
                user.streak_days += 1
                user.last_learning_date = today
            db.add(PointsEvent(user_id=user.id, event_type="word_learned", points=20))
    elif event == "undo_learned":
        if progress.status in LEARNED_STATUSES:
            today = today_for_user(user)
            if progress.learned_at and progress.learned_at.date() == today:
                usage = get_or_create_usage(db, user)
                usage.new_words_learned = max(0, usage.new_words_learned - 1)
                db.add(PointsEvent(user_id=user.id, event_type="word_learned_undo", points=-20))
            progress.status = ProgressStatus.LEARNING.value
            progress.mastery_score = min(progress.mastery_score, 20)
            progress.learned_at = None
            progress.review_due_at = now
    elif event == "remembered":
        progress.last_reviewed_at = now
        progress.mastery_score = min(100, progress.mastery_score + 5)
        progress.review_interval_days = min(30, max(1, progress.review_interval_days) * 2 + 1)
        progress.review_due_at = now + timedelta(days=progress.review_interval_days)
        if progress.mastery_score >= 80:
            progress.status = ProgressStatus.MASTERED.value
    elif event == "forgot":
        progress.last_reviewed_at = now
        progress.mastery_score = max(0, progress.mastery_score - 10)
        progress.review_interval_days = 1
        progress.review_due_at = now + timedelta(days=1)
        if progress.status == ProgressStatus.MASTERED.value:
            progress.status = ProgressStatus.LEARNED.value
        elif progress.status in LEARNED_STATUSES and progress.mastery_score < 25:
            progress.status = ProgressStatus.LEARNING.value
    elif event == "bookmark":
        progress.is_bookmarked = True
    elif event == "unbookmark":
        progress.is_bookmarked = False

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
