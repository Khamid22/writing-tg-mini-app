from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import current_user
from app.models import LearnerUser, WordItem, WordQualityStatus, WordReport
from app.schemas import TodayWordResponse, WordEventRequest, WordEventResponse
from app.services.limits import limit_payload
from app.services.progress import apply_word_event, next_word_for_user
from app.services.pronunciation import apply_pronunciation, lookup_pronunciation

router = APIRouter(prefix="/api/mini/words", tags=["words"])


class WordReportRequest(BaseModel):
    reason: Literal["too_difficult", "wrong_meaning", "audio_broken", "bad_example", "already_know"]
    details: str = Field(default="", max_length=500)


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
        "audio_url": word.audio_url,  # null until resolved via /audio endpoint
    }


@router.get("/today", response_model=TodayWordResponse)
def today_word(
    collection: str | None = None,
    user: LearnerUser = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict:
    limit = limit_payload(db, user)
    word, is_review = next_word_for_user(db, user, collection=collection or None)
    # Daily-limit cap only blocks NEW words; review practice is unlimited.
    if not limit["can_learn_more"] and not is_review:
        return {"item": None, "is_review": False, "limit": limit}
    return {
        "item": word_payload(word) if word else None,
        "is_review": is_review,
        "limit": limit,
    }


@router.post("/{word_id}/events", response_model=WordEventResponse)
def word_event(
    word_id: int,
    payload: WordEventRequest,
    user: LearnerUser = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict:
    word = db.get(WordItem, word_id)
    if not word or word.quality_status != WordQualityStatus.PUBLISHED.value or not word.is_active:
        raise HTTPException(status_code=404, detail="Word not found")
    progress = apply_word_event(db, user, word, payload.event)
    return {
        "ok": True,
        "progress": {"status": progress.status, "mastery_score": progress.mastery_score},
        "limit": limit_payload(db, user),
    }


@router.get("/{word_id}/audio")
async def word_audio(word_id: int, db: Session = Depends(get_db)) -> dict:
    word = db.get(WordItem, word_id)
    if not word or word.quality_status != WordQualityStatus.PUBLISHED.value or not word.is_active:
        raise HTTPException(status_code=404, detail="Word not found")
    if word.audio_url:
        return {"word": word.word, "audio_url": word.audio_url}
    result = await lookup_pronunciation(word.word)
    if apply_pronunciation(word, result):
        word.audio_status = "ready"
        db.commit()
    elif not word.audio_url:
        word.audio_status = "missing"
        db.commit()
    return {"word": word.word, "audio_url": word.audio_url}


@router.post("/{word_id}/reports")
def report_word(
    word_id: int,
    payload: WordReportRequest,
    user: LearnerUser = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict:
    word = db.get(WordItem, word_id)
    if not word or word.quality_status != WordQualityStatus.PUBLISHED.value or not word.is_active:
        raise HTTPException(status_code=404, detail="Word not found")
    report = WordReport(
        user_id=user.id,
        word_item_id=word.id,
        reason=payload.reason,
        details=payload.details.strip(),
    )
    db.add(report)
    db.commit()
    return {"ok": True, "report_id": report.id}
