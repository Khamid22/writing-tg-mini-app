from __future__ import annotations


def start_keyboard(mini_app_url: str) -> dict:
    return {
        "inline_keyboard": [
            [{"text": "Mini ilovani ochish", "web_app": {"url": mini_app_url}}],
            [{"text": "Premium sotib olish", "callback_data": "premium:buy"}],
        ]
    }


def payment_keyboard(code: str) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "Tasdiqlash", "callback_data": f"payment:approve:{code}"},
                {"text": "Bekor qilish", "callback_data": f"payment:cancel:{code}"},
            ]
        ]
    }
