from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import quote

import httpx

from app.models import WordItem

_DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en/"
_LOOKUP_TIMEOUT = 5.0


@dataclass(frozen=True)
class PronunciationResult:
    audio_url: str | None = None
    phonetic: str | None = None
    source: str | None = None


def _normalize_audio_url(value: str) -> str:
    audio = value.strip()
    if audio.startswith("//"):
        return f"https:{audio}"
    return audio


async def lookup_pronunciation(word_text: str) -> PronunciationResult:
    """Fetch pronunciation metadata from the free dictionary API.

    The result is intentionally small because WordItem only stores phonetic and audio_url today.
    Later we can add provider/source columns and put Merriam-Webster ahead of this provider.
    """
    try:
        async with httpx.AsyncClient(timeout=_LOOKUP_TIMEOUT) as client:
            response = await client.get(f"{_DICTIONARY_API}{quote(word_text.strip())}")
            if response.status_code != 200:
                return PronunciationResult()
            phonetic_text: str | None = None
            for entry in response.json():
                phonetic_text = phonetic_text or (entry.get("phonetic") or "").strip() or None
                for phonetic in entry.get("phonetics", []):
                    phonetic_text = phonetic_text or (phonetic.get("text") or "").strip() or None
                    if audio := (phonetic.get("audio") or "").strip():
                        return PronunciationResult(
                            audio_url=_normalize_audio_url(audio),
                            phonetic=phonetic_text,
                            source="dictionaryapi.dev",
                        )
            return PronunciationResult(phonetic=phonetic_text, source="dictionaryapi.dev" if phonetic_text else None)
    except (httpx.HTTPError, ValueError, TypeError):
        return PronunciationResult()


def apply_pronunciation(word: WordItem, result: PronunciationResult) -> bool:
    changed = False
    if result.audio_url and result.audio_url != word.audio_url:
        word.audio_url = result.audio_url
        changed = True
    if result.phonetic and (not word.phonetic or word.phonetic == "-"):
        word.phonetic = result.phonetic
        changed = True
    return changed
