from __future__ import annotations

import json
import random
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import LearnerDailyUsage, LearnerProgress, LearnerUser, PointsEvent, ProgressStatus, QuizAnswer, QuizAttempt, WordItem
from app.services.limits import get_or_create_usage


def start_quiz(db: Session, user: LearnerUser, question_count: int, mode: str) -> tuple[QuizAttempt, list[QuizAnswer]]:
    learned_words = list(
        db.scalars(
            select(WordItem)
            .join(LearnerProgress, LearnerProgress.word_item_id == WordItem.id)
            .where(
                LearnerProgress.user_id == user.id,
                LearnerProgress.status.in_([ProgressStatus.LEARNED.value, ProgressStatus.MASTERED.value]),
            )
            .order_by(WordItem.id.asc())
        )
    )
    if not learned_words:
        return QuizAttempt(user_id=user.id, mode=mode, total_questions=0), []

    all_words = list(db.scalars(select(WordItem).where(WordItem.is_active.is_(True))))
    selected_words = learned_words[: max(1, min(question_count, len(learned_words)))]
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

