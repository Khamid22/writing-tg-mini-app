"""Backfill `WordItem.difficulty_order` so words are served easiest/most-common first
within each CEFR level.

`difficulty_order` ships as 0 for every word, which makes within-level ordering fall
back to insertion order (effectively alphabetical) — so beginners can hit rare words
before common ones. This ranks each level by English word frequency (most frequent =
lowest `difficulty_order` = served first).

Run once after seeding/importing:  python -m app.scripts.backfill_difficulty
It is idempotent and safe to re-run.
"""
from __future__ import annotations

import argparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import WordItem, WordQualityStatus

try:  # Optional dependency — gives a real frequency ranking when installed.
    from wordfreq import zipf_frequency
except Exception:  # pragma: no cover - fallback keeps the script usable without the dep
    zipf_frequency = None


def _ease_score(word: str) -> float:
    """Higher = easier/more common, so it should come first within a level."""
    if zipf_frequency is not None:
        # zipf is ~1 (very rare) .. ~7 (extremely common); take the first token.
        return zipf_frequency(word.split()[0].lower(), "en") if word.strip() else 0.0
    # Dependency-free fallback: common words are usually short.
    return -len(word.strip())


def backfill_difficulty(db: Session, *, dry_run: bool = False) -> int:
    """Re-rank every published, active word within its level. Returns rows updated."""
    words = list(
        db.scalars(
            select(WordItem).where(
                WordItem.is_active.is_(True),
                WordItem.quality_status == WordQualityStatus.PUBLISHED.value,
            )
        )
    )
    by_level: dict[str, list[WordItem]] = {}
    for word in words:
        by_level.setdefault(word.level, []).append(word)

    updated = 0
    for level_words in by_level.values():
        # Most common first; stable tiebreak on the word itself for determinism.
        level_words.sort(key=lambda w: (-_ease_score(w.word), w.word.lower()))
        for order, word in enumerate(level_words):
            if word.difficulty_order != order:
                word.difficulty_order = order
                updated += 1
    if dry_run:
        db.rollback()
    else:
        db.commit()
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill WordItem.difficulty_order by word frequency.")
    parser.add_argument("--dry-run", action="store_true", help="Calculate changes without writing to the database.")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        updated = backfill_difficulty(db, dry_run=args.dry_run)
        engine = "wordfreq" if zipf_frequency is not None else "length-fallback"
        mode = "would update" if args.dry_run else "updated"
        print(f"difficulty_order backfilled via {engine}: {updated} rows {mode}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
