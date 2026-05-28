from __future__ import annotations

import json
import random
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import LearnerDailyUsage, LearnerProgress, LearnerUser, PointsEvent, ProgressStatus, QuizAnswer, QuizAttempt, WordItem
from app.services.limits import get_or_create_usage


WEAK_MASTERY_THRESHOLD = 60


def _pick_quiz_words(
    candidates: list[tuple[WordItem, int]],
    question_count: int,
) -> list[WordItem]:
    """Two-bucket rotation: weak words always come first, strong words fill remaining slots.

    Each bucket is shuffled, so consecutive quizzes never repeat the same set
    unless the learner has very few words. Words below the mastery threshold
    keep coming back until improved.
    """
    weak = [w for w, score in candidates if score < WEAK_MASTERY_THRESHOLD]
    strong = [w for w, score in candidates if score >= WEAK_MASTERY_THRESHOLD]
    random.shuffle(weak)
    random.shuffle(strong)
    return (weak + strong)[: max(1, min(question_count, len(candidates)))]


def start_quiz(
    db: Session,
    user: LearnerUser,
    question_count: int,
    mode: str,
    collection: str | None = None,
) -> tuple[QuizAttempt, list[QuizAnswer]]:
    candidates_q = (
        select(WordItem, LearnerProgress.mastery_score)
        .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
        .where(
            LearnerProgress.user_id == user.id,
            LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value]),
        )
    )
    if collection:
        candidates_q = candidates_q.where(WordItem.collection == collection)
    candidates = list(db.execute(candidates_q).all())
    if not candidates:
        return QuizAttempt(user_id=user.id, mode=mode, total_questions=0), []

    distractor_q = select(WordItem).where(WordItem.is_active.is_(True))
    if collection:
        distractor_q = distractor_q.where(WordItem.collection == collection)
    all_words = list(db.scalars(distractor_q))
    selected_words = _pick_quiz_words(candidates, question_count)
    attempt = QuizAttempt(user_id=user.id, mode=mode, total_questions=len(selected_words))
    db.add(attempt)
    db.flush()

    answers: list[QuizAnswer] = []
    for word in selected_words:
        distractors = [item.uzbek_definition for item in all_words if item.id != word.id]
        random.shuffle(distractors)
        choices = [word.uzbek_definition, *distractors[:3]]
        random.shuffle(choices)
        answer = QuizAnswer(
            attempt_id=attempt.id,
            word_item_id=word.id,
            question_id=f"{attempt.id}-{word.id}",
            question_type="uzbek_meaning",
            prompt=f'What does "{word.word}" mean?',
            choices_json=json.dumps(choices, ensure_ascii=False),
            correct_choice=word.uzbek_definition,
        )
        db.add(answer)
        answers.append(answer)

    db.commit()
    db.refresh(attempt)
    return attempt, answers


def answer_question(db: Session, user: LearnerUser, attempt_id: int, question_id: str, selected_choice: str) -> tuple[bool, str, int]:
    attempt = db.get(QuizAttempt, attempt_id)
    if not attempt or attempt.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")

    answer = db.scalar(
        select(QuizAnswer).where(
            QuizAnswer.attempt_id == attempt.id,
            QuizAnswer.question_id == question_id,
        )
    )
    if not answer:
        raise HTTPException(status_code=404, detail="Question not found")
    if answer.selected_choice is not None:
        raise HTTPException(status_code=400, detail="Question already answered")

    is_correct = selected_choice == answer.correct_choice
    answer.selected_choice = selected_choice
    answer.is_correct = is_correct
    answer.answered_at = datetime.now(timezone.utc)
    if is_correct:
        attempt.score += 1
        db.add(PointsEvent(user_id=user.id, event_type="quiz_correct", points=5))

    progress = db.scalar(
        select(LearnerProgress).where(
            LearnerProgress.user_id == user.id,
            LearnerProgress.word_item_id == answer.word_item_id,
        )
    )
    if progress:
        progress.times_answered += 1
        progress.times_correct += 1 if is_correct else 0
        progress.mastery_score = min(100, progress.mastery_score + (15 if is_correct else 3))
        if progress.mastery_score >= 80:
            progress.status = ProgressStatus.MASTERED.value
        progress.last_reviewed_at = datetime.now(timezone.utc)

    db.commit()
    return is_correct, answer.correct_choice, progress.mastery_score if progress else 0


def complete_quiz(db: Session, user: LearnerUser, attempt_id: int) -> QuizAttempt:
    attempt = db.get(QuizAttempt, attempt_id)
    if not attempt or attempt.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")
    if not attempt.completed_at:
        attempt.completed_at = datetime.now(timezone.utc)
        usage: LearnerDailyUsage = get_or_create_usage(db, user)
        usage.tests_completed += 1
        db.commit()
        db.refresh(attempt)
    return attempt

