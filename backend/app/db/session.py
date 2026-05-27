from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.resolved_database_url.startswith("sqlite") else {}

engine = create_engine(settings.resolved_database_url, connect_args=connect_args, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    ensure_schema_compatibility()


def ensure_schema_compatibility() -> None:
    inspector = inspect(engine)
    if "learner_users" not in inspector.get_table_names():
        return
    learner_columns = {column["name"] for column in inspector.get_columns("learner_users")}
    with engine.begin() as connection:
        if "premium_until" not in learner_columns:
            if settings.resolved_database_url.startswith("sqlite"):
                connection.execute(text("ALTER TABLE learner_users ADD COLUMN premium_until DATETIME"))
            else:
                connection.execute(text("ALTER TABLE learner_users ADD COLUMN premium_until TIMESTAMP WITH TIME ZONE"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
