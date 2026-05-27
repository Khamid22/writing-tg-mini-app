from __future__ import annotations

from sqlalchemy.orm import Session

from telegram_bot.payments import handle_payment_callback, handle_payment_message


async def handle_update(db: Session, update: dict) -> None:
    if "message" in update:
        await handle_payment_message(db, update["message"])
    elif "callback_query" in update:
        await handle_payment_callback(db, update["callback_query"])
