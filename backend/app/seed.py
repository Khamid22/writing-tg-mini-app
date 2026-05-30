from __future__ import annotations

from sqlalchemy import func, select

from app.data import SEED_WORDS
from app.db.session import SessionLocal, init_db
from app.models import WordItem


def seed_words() -> None:
    init_db()
    db = SessionLocal()
    try:
        if (db.scalar(select(func.count(WordItem.id))) or 0) >= len(SEED_WORDS):
            return
        for item in SEED_WORDS:
            word = db.scalar(select(WordItem).where(WordItem.word == item["word"]))
            if not word:
                db.add(WordItem(**item))
            else:
                for key, value in item.items():
                    setattr(word, key, value)
        db.commit()
        # Order freshly seeded words easiest/most-common first within each level.
        from app.scripts.backfill_difficulty import backfill_difficulty

        backfill_difficulty(db)
    finally:
        db.close()


if __name__ == "__main__":
    seed_words()
    print("Seeded learner words")
