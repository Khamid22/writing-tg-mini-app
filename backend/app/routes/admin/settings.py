from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.config import Settings, get_settings, update_settings
from app.routes.admin.auth import require_admin

router = APIRouter(dependencies=[Depends(require_admin)])


class SettingsPatch(BaseModel):
    free_daily_word_limit: int | None = Field(default=None, ge=1, le=100)
    manual_payment_amount_uzs: int | None = Field(default=None, ge=1000)
    manual_payment_plan_days: int | None = Field(default=None, ge=1, le=365)
    manual_payment_card_label: str | None = Field(default=None, min_length=1, max_length=200)


def _public_settings(s: Settings) -> dict:
    return {
        "free_daily_word_limit": s.free_daily_word_limit,
        "manual_payment_amount_uzs": s.manual_payment_amount_uzs,
        "manual_payment_plan_days": s.manual_payment_plan_days,
        "manual_payment_card_label": s.manual_payment_card_label,
    }


@router.get("/settings")
def get_admin_settings() -> dict:
    return _public_settings(get_settings())


@router.patch("/settings")
def patch_admin_settings(payload: SettingsPatch) -> dict:
    overrides = payload.model_dump(exclude_none=True)
    return _public_settings(update_settings(**overrides) if overrides else get_settings())
