from __future__ import annotations

import json
import random
import re
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
        question_type, prompt, correct, choices = _build_question(word, all_words)
        answer = QuizAnswer(
            attempt_id=attempt.id,
            word_item_id=word.id,
            question_id=f"{attempt.id}-{word.id}",
            question_type=question_type,
            prompt=prompt,
            choices_json=json.dumps(choices, ensure_ascii=False),
            correct_choice=correct,
        )
        db.add(answer)
        answers.append(answer)

    db.commit()
    db.refresh(attempt)
    return attempt, answers


QUESTION_TYPES = ("uzbek_meaning", "english_word", "example_cloze")


def _pick_distractors(pool: list[str], correct: str, n: int = 3) -> list[str]:
    """Pick N distinct distractors that aren't the correct answer."""
    seen = {correct}
    out: list[str] = []
    for candidate in pool:
        if candidate and candidate not in seen:
            out.append(candidate)
            seen.add(candidate)
            if len(out) == n:
                break
    return out


def _build_question(word: WordItem, all_words: list[WordItem]) -> tuple[str, str, str, list[str]]:
    """Return (question_type, prompt, correct_choice, choices).

    Three types rotate to keep tests challenging:
      - uzbek_meaning: word shown, pick the Uzbek meaning.
      - english_word: Uzbek meaning shown, pick the English word.
      - example_cloze: example with the word blanked out, pick the word.
    """
    available = list(QUESTION_TYPES)
    if not (word.english_example or "").strip():
        available = [t for t in available if t != "example_cloze"]
    qtype = random.choice(available)

    if qtype == "uzbek_meaning":
        pool = [w.uzbek_definition for w in all_words if w.id != word.id and w.uzbek_definition]
        random.shuffle(pool)
        distractors = _pick_distractors(pool, word.uzbek_definition)
        correct = word.uzbek_definition
        prompt = f'"{word.word}" — bu nima degani?'
    elif qtype == "english_word":
        pool = [w.word for w in all_words if w.id != word.id and w.word]
        random.shuffle(pool)
        distractors = _pick_distractors(pool, word.word)
        correct = word.word
        prompt = f"Qaysi so'z bu ma'noga to'g'ri keladi: «{word.uzbek_definition}»?"
    else:  # example_cloze
        cloze = _blank_out_word(word.english_example, word.word)
        pool = [w.word for w in all_words if w.id != word.id and w.word]
        random.shuffle(pool)
        distractors = _pick_distractors(pool, word.word)
        correct = word.word
        prompt = f"Bo'sh joyni to'ldiring: {cloze}"

    choices = [correct, *distractors]
    random.shuffle(choices)
    return qtype, prompt, correct, choices


def _blank_out_word(sentence: str, word: str) -> str:
    """Replace the target word in a sentence with _____ as a whole word match.
    Tries common English inflections so the cloze never leaves dangling letters."""
    if not sentence or not word:
        return sentence
    base = word.lower()
    if base.endswith("e"):
        candidates = [word, word + "d", word + "s", word[:-1] + "ing"]
    elif base.endswith("y") and len(base) > 1 and base[-2] not in "aeiou":
        candidates = [word, word[:-1] + "ies", word[:-1] + "ied", word + "ing"]
    else:
        candidates = [word, word + "s", word + "es", word + "ed", word + "ing"]

    for candidate in candidates:
        pattern = rf"\b{re.escape(candidate)}\b"
        new_sentence, count = re.subn(pattern, "_____", sentence, count=1, flags=re.IGNORECASE)
        if count:
            return new_sentence
    return sentence


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

