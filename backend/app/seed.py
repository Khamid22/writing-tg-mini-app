from __future__ import annotations

from sqlalchemy import select

from app.data import SEED_WORDS
from app.db.session import SessionLocal, init_db
from app.models import WordItem


def seed_words() -> None:
    init_db()
    db = SessionLocal()
    try:
        for item in SEED_WORDS:
            word = db.scalar(select(WordItem).where(WordItem.word == item["word"]))
            if not word:
                word = WordItem(**item)
                db.add(word)
            else:
                for key, value in item.items():
                    setattr(word, key, value)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_words()
    print("Seeded learner words")

