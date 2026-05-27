from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class LearnerTier(str, Enum):
    FREE = "free"
    PAID = "paid"


class ProgressStatus(str, Enum):
    NEW = "new"
    SEEN = "seen"
    LEARNING = "learning"
    LEARNED = "learned"
    MASTERED = "mastered"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class LearnerUser(Base):
    __tablename__ = "learner_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_user_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(120), index=True)
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    display_name: Mapped[str] = mapped_column(String(160))
    language_code: Mapped[str | None] = mapped_column(String(16))
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Tashkent")
    tier: Mapped[str] = mapped_column(String(16), default=LearnerTier.FREE.value, index=True)
    premium_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_learning_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    progress: Mapped[list["LearnerProgress"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    daily_usage: Mapped[list["LearnerDailyUsage"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class WordItem(Base):
    __tablename__ = "word_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    word: Mapped[str] = mapped_column(String(255), index=True)
    word_type: Mapped[str] = mapped_column(String(80))
    phonetic: Mapped[str] = mapped_column(String(255))
    english_definition: Mapped[str] = mapped_column(Text)
    uzbek_definition: Mapped[str] = mapped_column(Text)
    english_example: Mapped[str] = mapped_column(Text)
    uzbek_example: Mapped[str] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String(32), index=True)
    audio_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    progress: Mapped[list["LearnerProgress"]] = relationship(back_populates="word")


class LearnerProgress(Base):
    __tablename__ = "learner_progress"
    __table_args__ = (UniqueConstraint("user_id", "word_item_id", name="uq_progress_user_word"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("learner_users.id"), index=True)
    word_item_id: Mapped[int] = mapped_column(ForeignKey("word_items.id"), index=True)
    status: Mapped[str] = mapped_column(String(24), default=ProgressStatus.NEW.value, index=True)
    mastery_score: Mapped[int] = mapped_column(Integer, default=0)
    times_seen: Mapped[int] = mapped_column(Integer, default=0)
    times_listened: Mapped[int] = mapped_column(Integer, default=0)
    times_flipped: Mapped[int] = mapped_column(Integer, default=0)
    times_answered: Mapped[int] = mapped_column(Integer, default=0)
    times_correct: Mapped[int] = mapped_column(Integer, default=0)
    first_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    learned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped[LearnerUser] = relationship(back_populates="progress")
    word: Mapped[WordItem] = relationship(back_populates="progress")


class LearnerDailyUsage(Base):
    __tablename__ = "learner_daily_usage"
    __table_args__ = (UniqueConstraint("user_id", "usage_date", name="uq_usage_user_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("learner_users.id"), index=True)
    usage_date: Mapped[date] = mapped_column(Date, index=True)
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Tashkent")
    new_words_learned: Mapped[int] = mapped_column(Integer, default=0)
    tests_completed: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped[LearnerUser] = relationship(back_populates="daily_usage")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("learner_users.id"), index=True)
    mode: Mapped[str] = mapped_column(String(40), default="learned_words")
    score: Mapped[int] = mapped_column(Integer, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("quiz_attempts.id"), index=True)
    word_item_id: Mapped[int] = mapped_column(ForeignKey("word_items.id"), index=True)
    question_id: Mapped[str] = mapped_column(String(80), index=True)
    question_type: Mapped[str] = mapped_column(String(80))
    prompt: Mapped[str] = mapped_column(Text)
    choices_json: Mapped[str] = mapped_column(Text)
    correct_choice: Mapped[str] = mapped_column(Text)
    selected_choice: Mapped[str | None] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PointsEvent(Base):
    __tablename__ = "points_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("learner_users.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    points: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class PaymentRequest(Base):
    __tablename__ = "payment_requests"
    __table_args__ = (UniqueConstraint("code", name="uq_payment_request_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("learner_users.id"), index=True)
    plan: Mapped[str] = mapped_column(String(80), default="premium_30_days")
    plan_days: Mapped[int] = mapped_column(Integer, default=30)
    amount_uzs: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(24), default=PaymentStatus.PENDING.value, index=True)
    screenshot_file_id: Mapped[str | None] = mapped_column(String(255))
    admin_note: Mapped[str | None] = mapped_column(Text)
    approved_by: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[LearnerUser] = relationship()
