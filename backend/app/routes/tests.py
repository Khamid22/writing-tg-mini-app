from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerUser
from app.schemas import AnswerRequest, AnswerResponse, CompleteTestResponse, StartTestRequest, StartTestResponse
from app.services.quiz import answer_question, complete_quiz, start_quiz

router = APIRouter(prefix="/api/mini/tests", tags=["tests"])


@router.post("/start", response_model=StartTestResponse)
def start(payload: StartTestRequest, user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    attempt, answers = start_quiz(db, user, payload.question_count, payload.mode)
    if attempt.id is None:
        return {"attempt": {"id": None, "total_questions": 0}, "questions": []}
    return {
        "attempt": {"id": attempt.id, "total_questions": attempt.total_questions},
        "questions": [
            {
                "id": answer.question_id,
                "word_item_id": answer.word_item_id,
                "type": answer.question_type,
                "prompt": answer.prompt,
                "choices": json.loads(answer.choices_json),
            }
            for answer in answers
        ],
    }


@router.post("/{attempt_id}/answer", response_model=AnswerResponse)
def answer(
    attempt_id: int,
    payload: AnswerRequest,
    user: LearnerUser = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict:
    is_correct, correct_choice, mastery_score = answer_question(
        db,
        user,
        attempt_id,
        payload.question_id,
        payload.selected_choice,
    )
    return {"is_correct": is_correct, "correct_choice": correct_choice, "mastery_score": mastery_score}


@router.post("/{attempt_id}/complete", response_model=CompleteTestResponse)
def complete(attempt_id: int, user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    attempt = complete_quiz(db, user, attempt_id)
    accuracy = round((attempt.score / attempt.total_questions) * 100) if attempt.total_questions else 0
    return {"score": attempt.score, "total_questions": attempt.total_questions, "accuracy": accuracy}

