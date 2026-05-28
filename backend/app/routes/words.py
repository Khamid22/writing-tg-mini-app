from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerUser, WordItem
from app.schemas import TodayWordResponse, WordEventRequest, WordEventResponse
from app.services.limits import limit_payload
from app.services.progress import apply_word_event, next_word_for_user

router = APIRouter(prefix="/api/mini/words", tags=["words"])


def word_payload(word: WordItem) -> dict:
    return {
        "id": word.id,
        "word": word.word,
        "word_type": word.word_type,
        "phonetic": word.phonetic,
        "english_definition": word.english_definition,
        "uzbek_definition": word.uzbek_definition,
        "english_example": word.english_example,
        "uzbek_example": word.uzbek_example,
        "level": word.level,
        "topic": word.topic,
        "collection": word.collection,
        "tags": word.tags,
        "collocations": word.collocations,
        "common_mistake": word.common_mistake,
        "writing_prompt": word.writing_prompt,
        "difficulty_order": word.difficulty_order,
        "audio_url": word.audio_url or f"/api/mini/words/{word.id}/audio",
    }


@router.get("/today", response_model=TodayWordResponse)
def today_word(user: LearnerUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    limit = limit_payload(db, user)
    if not limit["can_learn_more"]:
        return {"item": None, "limit": limit}
    word = next_word_for_user(db, user)
    return {"item": word_payload(word) if word else None, "limit": limit}


@router.post("/{word_id}/events", response_model=WordEventResponse)
def word_event(
    word_id: int,
    payload: WordEventRequest,
    user: LearnerUser = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict:
    word = db.get(WordItem, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    progress = apply_word_event(db, user, word, payload.event)
    return {
        "ok": True,
        "progress": {"status": progress.status, "mastery_score": progress.mastery_score},
        "limit": limit_payload(db, user),
    }


@router.get("/{word_id}/audio")
def word_audio(word_id: int, db: Session = Depends(get_db)) -> dict:
    word = db.get(WordItem, word_id)
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    return {"word": word.word, "audio_url": word.audio_url, "fallback": "Use browser speech synthesis if audio_url is empty."}
