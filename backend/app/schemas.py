from __future__ import annotations

from pydantic import BaseModel, Field


class TelegramAuthRequest(BaseModel):
    init_data: str = ""


class UserPayload(BaseModel):
    id: int
    display_name: str
    username: str | None = None
    tier: str
    premium_until: str | None = None


class AuthResponse(BaseModel):
    user: UserPayload
    token: str


class LimitPayload(BaseModel):
    tier: str
    daily_limit: int | None
    daily_used: int
    daily_remaining: int | None
    can_learn_more: bool


class MeResponse(BaseModel):
    user: UserPayload
    limit: LimitPayload


class WordPayload(BaseModel):
    id: int
    word: str
    word_type: str
    phonetic: str
    english_definition: str
    uzbek_definition: str
    english_example: str
    uzbek_example: str
    level: str
    topic: str
    collection: str
    tags: str
    collocations: str
    common_mistake: str
    writing_prompt: str
    difficulty_order: int
    audio_url: str


class TodayWordResponse(BaseModel):
    item: WordPayload | None
    is_review: bool = False
    limit: LimitPayload


class WordEventRequest(BaseModel):
    event: str


class ProgressPayload(BaseModel):
    status: str
    mastery_score: int


class WordEventResponse(BaseModel):
    ok: bool
    progress: ProgressPayload
    limit: LimitPayload


class StartTestRequest(BaseModel):
    question_count: int = Field(default=5, ge=1, le=20)
    mode: str = "learned_words"


class QuizQuestionPayload(BaseModel):
    id: str
    word_item_id: int
    type: str
    prompt: str
    choices: list[str]


class StartTestResponse(BaseModel):
    attempt: dict
    questions: list[QuizQuestionPayload]


class AnswerRequest(BaseModel):
    question_id: str
    selected_choice: str


class AnswerResponse(BaseModel):
    is_correct: bool
    correct_choice: str
    mastery_score: int


class CompleteTestResponse(BaseModel):
    score: int
    total_questions: int
    accuracy: int

class DashboardResponse(BaseModel):
    stats: dict
    recent_words: list[WordPayload]


class ManualPaymentRequestResponse(BaseModel):
    code: str
    status: str
    plan: str
    plan_days: int
    amount_uzs: int
    card_label: str
    expires_at: str
    instructions: list[str]
    admin_callback_payloads: dict[str, str]


class ManualPaymentSubmitRequest(BaseModel):
    screenshot_file_id: str | None = None
    admin_note: str | None = None


class ManualPaymentDecisionRequest(BaseModel):
    admin_id: str | None = None
    note: str | None = None
