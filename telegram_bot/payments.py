from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import LearnerUser, PaymentRequest
from app.services.payments import (
    approve_payment,
    cancel_payment,
    create_payment_request,
    payment_payload,
    submit_payment_screenshot,
)
from telegram_bot.client import TelegramBotClient
from telegram_bot.keyboards import payment_keyboard, start_keyboard

PAYMENT_CODE_PATTERN = re.compile(r"\bUZ-\d{6}\b", re.IGNORECASE)


def extract_payment_code(text: str | None) -> str | None:
    if not text:
        return None
    match = PAYMENT_CODE_PATTERN.search(text)
    return match.group(0).upper() if match else None


def is_admin(telegram_user_id: int | None) -> bool:
    if telegram_user_id is None:
        return False
    return telegram_user_id in get_settings().telegram_admin_id_list


def user_label(user: LearnerUser) -> str:
    username = f"@{user.username}" if user.username else "username yo'q"
    return f"{user.display_name} ({username}, Telegram ID: {user.telegram_user_id})"


def upsert_bot_user(db: Session, from_user: dict, chat_id: int | str | None) -> LearnerUser:
    settings = get_settings()
    telegram_user_id = str(from_user.get("id") or chat_id)
    first_name = from_user.get("first_name") or "Telegram"
    last_name = from_user.get("last_name")
    username = from_user.get("username")
    display_name = " ".join(part for part in (first_name, last_name) if part).strip() or username or "Telegram user"

    user = db.scalar(select(LearnerUser).where(LearnerUser.telegram_user_id == telegram_user_id))
    if not user:
        user = LearnerUser(
            telegram_user_id=telegram_user_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            display_name=display_name,
            language_code=from_user.get("language_code"),
            timezone=settings.default_timezone,
        )
        db.add(user)
    else:
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.display_name = display_name
        user.language_code = from_user.get("language_code")
    db.commit()
    db.refresh(user)
    return user


def admin_payment_caption(payment: PaymentRequest) -> str:
    payload = payment_payload(payment)
    return "\n".join(
        [
            "<b>Premium to'lov tekshiruvi</b>",
            f"Kod: <code>{payment.code}</code>",
            f"Holat: {payment.status}",
            f"Summa: {payload['amount_uzs']:,} UZS".replace(",", " "),
            f"Reja: {payload['plan_days']} kun",
            f"Foydalanuvchi: {user_label(payment.user)}",
        ]
    )


async def notify_admins_about_payment(payment: PaymentRequest) -> None:
    settings = get_settings()
    bot = TelegramBotClient()
    caption = admin_payment_caption(payment)
    keyboard = payment_keyboard(payment.code)
    for admin_id in settings.telegram_admin_id_list:
        if payment.screenshot_file_id:
            await bot.send_photo(admin_id, payment.screenshot_file_id, caption, keyboard)
        else:
            await bot.send_message(admin_id, caption, keyboard)


async def notify_user_payment_result(payment: PaymentRequest, approved: bool) -> None:
    bot = TelegramBotClient()
    chat_id = payment.user.telegram_user_id
    if approved:
        text = "To'lov tasdiqlandi. Premium limitingiz faollashtirildi."
    else:
        text = "To'lov so'rovingiz bekor qilindi. Agar xato bo'lsa, screenshotni kod bilan qayta yuboring."
    await bot.send_message(chat_id, text)


def premium_text() -> str:
    settings = get_settings()
    return "\n".join(
        [
            "<b>Premium tarif</b>",
            "",
            f"Narxi: <b>{settings.manual_payment_amount_uzs:,} UZS</b>".replace(",", " "),
            f"Muddati: <b>{settings.manual_payment_plan_days} kun</b>",
            f"Karta: <code>{settings.manual_payment_card_label}</code>",
            "",
            "Premium bilan kunlik limit yo'q. Istagancha so'z o'rganasiz, test ishlaysiz va reytingda yuqoriga chiqasiz.",
            "",
            "To'lov qilganingizdan keyin screenshotni shu botga yuboring. Kod yozish shart emas.",
        ]
    )


async def send_start_message(chat_id: int | str) -> None:
    settings = get_settings()
    bot = TelegramBotClient()
    text = "\n".join(
        [
            "<b>Assalomu alaykum!</b>",
            "",
            "Bu mini ilova har kuni yangi inglizcha so'zlarni oson va tartibli o'rganishga yordam beradi.",
            "",
            "Bepul tarifda kuniga 10 ta so'z o'rganasiz. Premium tarifda esa limit yo'q.",
            "",
            "Boshlash uchun mini ilovani oching yoki premium tarifni tanlang.",
        ]
    )
    await bot.send_message(chat_id, text, start_keyboard(settings.mini_app_url))


async def handle_payment_message(db: Session, message: dict) -> None:
    chat = message.get("chat") or {}
    from_user = message.get("from") or {}
    chat_id = chat.get("id")
    telegram_user_id = str(from_user.get("id") or chat_id)
    text = message.get("caption") or message.get("text")
    code = extract_payment_code(text)
    photos = message.get("photo") or []
    screenshot_file_id = photos[-1]["file_id"] if photos else None
    bot = TelegramBotClient()

    if message.get("text") == "/start":
        await send_start_message(chat_id)
        return

    if screenshot_file_id:
        user = upsert_bot_user(db, from_user, chat_id)
        payment = create_payment_request(db, user)
        payment = submit_payment_screenshot(db, payment.code, screenshot_file_id, f"Telegram chat: {chat_id}")
        await bot.send_message(chat_id, "Screenshot qabul qilindi. Admin tasdiqlagandan keyin premium avtomatik faollashadi.")
        await notify_admins_about_payment(payment)
        return

    if not code:
        await send_start_message(chat_id)
        return

    payment = db.scalar(select(PaymentRequest).where(PaymentRequest.code == code))
    if not payment:
        await bot.send_message(chat_id, f"<code>{code}</code> kodi topilmadi. Iltimos, ilovadan yangi to'lov so'rovi yarating.")
        return

    if payment.user.telegram_user_id != telegram_user_id:
        await bot.send_message(chat_id, "Bu kod boshqa foydalanuvchiga tegishli. Iltimos, o'zingizning kodingizni yuboring.")
        return

    payment = submit_payment_screenshot(db, code, screenshot_file_id, f"Telegram chat: {chat_id}")
    await bot.send_message(chat_id, "Screenshot qabul qilindi. Admin tekshirgandan keyin premium faollashadi.")
    await notify_admins_about_payment(payment)


async def handle_payment_callback(db: Session, callback_query: dict) -> None:
    callback_id = callback_query.get("id")
    from_user = callback_query.get("from") or {}
    admin_id = from_user.get("id")
    data = callback_query.get("data") or ""
    message = callback_query.get("message") or {}
    bot = TelegramBotClient()

    if data == "premium:buy":
        if callback_id:
            await bot.answer_callback_query(callback_id, "Premium ma'lumotlari yuborildi.")
        chat = message.get("chat") or {}
        if chat.get("id"):
            await bot.send_message(chat["id"], premium_text())
        return

    if not is_admin(admin_id):
        if callback_id:
            await bot.answer_callback_query(callback_id, "Ruxsat yo'q.")
        return

    parts = data.split(":")
    if len(parts) != 3 or parts[0] != "payment":
        if callback_id:
            await bot.answer_callback_query(callback_id, "Noma'lum amal.")
        return

    action, code = parts[1], parts[2].upper()
    if action == "approve":
        payment = approve_payment(db, code, str(admin_id), "Telegram admin approved")
        await notify_user_payment_result(payment, approved=True)
        result = f"{code} tasdiqlandi."
    elif action == "cancel":
        payment = cancel_payment(db, code, str(admin_id), "Telegram admin cancelled")
        await notify_user_payment_result(payment, approved=False)
        result = f"{code} bekor qilindi."
    else:
        result = "Noma'lum amal."

    if callback_id:
        await bot.answer_callback_query(callback_id, result)
    if message.get("chat") and message.get("message_id"):
        await bot.edit_message_reply_markup(message["chat"]["id"], message["message_id"])
