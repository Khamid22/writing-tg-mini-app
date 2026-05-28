from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py  →  backend/app/  →  backend/  →  project root
_ROOT_DIR = Path(__file__).parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    secret_key: str = Field(default="change-me", alias="SECRET_KEY")
    database_url: str = Field(default="sqlite:///./mini_app.db", alias="DATABASE_URL")
    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    telegram_webhook_secret: str = Field(default="", alias="TELEGRAM_WEBHOOK_SECRET")
    telegram_admin_ids: str = Field(default="", alias="TELEGRAM_ADMIN_IDS")
    mini_app_url: str = Field(default="https://uzbek-words-mini-app.onrender.com", alias="MINI_APP_URL")
    allow_dev_auth: bool = Field(default=True, alias="ALLOW_DEV_AUTH")
    cors_origins: str = Field(
        default="http://localhost:5174,http://127.0.0.1:5174",
        alias="CORS_ORIGINS",
    )
    free_daily_word_limit: int = Field(default=10, alias="FREE_DAILY_WORD_LIMIT")
    default_timezone: str = Field(default="Asia/Tashkent", alias="DEFAULT_TIMEZONE")
    seed_default_words: bool = Field(default=True, alias="SEED_DEFAULT_WORDS")
    manual_payment_amount_uzs: int = Field(default=49000, alias="MANUAL_PAYMENT_AMOUNT_UZS")
    manual_payment_card_label: str = Field(default="Card number will be configured soon", alias="MANUAL_PAYMENT_CARD_LABEL")
    manual_payment_plan_days: int = Field(default=30, alias="MANUAL_PAYMENT_PLAN_DAYS")
    admin_approval_token: str = Field(default="", alias="ADMIN_APPROVAL_TOKEN")
    admin_password: str = Field(default="", alias="ADMIN_PASSWORD")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def telegram_admin_id_list(self) -> list[int]:
        ids: list[int] = []
        for raw_id in self.telegram_admin_ids.split(","):
            raw_id = raw_id.strip()
            if raw_id and raw_id.isdigit():
                ids.append(int(raw_id))
        return ids

    @property
    def resolved_database_url(self) -> str:
        """Resolve sqlite:///./filename to an absolute path at the project root."""
        if self.database_url.startswith("sqlite:///./"):
            filename = self.database_url[len("sqlite:///./"):]
            return f"sqlite:///{_ROOT_DIR / filename}"
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"prod", "production"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
