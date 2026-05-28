from __future__ import annotations

import httpx

from app.config import get_settings

_shared_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _shared_client
    if _shared_client is None:
        _shared_client = httpx.AsyncClient(timeout=10)
    return _shared_client


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
        client = _get_client()
        try:
            response = await client.post(f"{self.base_url}/{method}", json=payload)
            response.raise_for_status()
        except httpx.HTTPError:
            return

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
