from __future__ import annotations

import httpx

from app.config import get_settings


class TelegramBotClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.token = settings.telegram_bot_token
        self.base_url = f"https://api.telegram.org/bot{self.token}"

    @property
    def enabled(self) -> bool:
        return bool(self.token)

    async def request(self, method: str, payload: dict) -> None:
        if not self.enabled:
            return
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(f"{self.base_url}/{method}", json=payload)
            response.raise_for_status()

    async def send_message(self, chat_id: int | str, text: str, reply_markup: dict | None = None) -> None:
        payload: dict = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        await self.request("sendMessage", payload)

    async def send_photo(self, chat_id: int | str, photo: str, caption: str, reply_markup: dict | None = None) -> None:
        payload: dict = {"chat_id": chat_id, "photo": photo, "caption": caption, "parse_mode": "HTML"}
        if reply_markup:
            payload["reply_markup"] = reply_markup
        await self.request("sendPhoto", payload)

    async def answer_callback_query(self, callback_query_id: str, text: str) -> None:
        await self.request("answerCallbackQuery", {"callback_query_id": callback_query_id, "text": text})

    async def edit_message_reply_markup(self, chat_id: int | str, message_id: int) -> None:
        await self.request("editMessageReplyMarkup", {"chat_id": chat_id, "message_id": message_id, "reply_markup": None})
