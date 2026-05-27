from __future__ import annotations


def payment_keyboard(code: str) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "Tasdiqlash", "callback_data": f"payment:approve:{code}"},
                {"text": "Bekor qilish", "callback_data": f"payment:cancel:{code}"},
            ]
        ]
    }
