# API Contract

All learner-facing endpoints should use a dedicated namespace:

```text
/api/mini/*
```

## Auth

### POST /api/mini/auth/telegram

Authenticates a Telegram Mini App user.

Request:

```json
{
  "init_data": "telegram-signed-init-data"
}
```

Response:

```json
{
  "user": {
    "id": 1,
    "display_name": "Ali",
    "username": "ali",
    "tier": "free"
  }
}
```

## Current User

### GET /api/mini/me

Response:

```json
{
  "user": {
    "id": 1,
    "display_name": "Ali",
    "tier": "free",
    "daily_limit": 10,
    "daily_used": 3,
    "daily_remaining": 7
  }
}
```

## Flashcards

### GET /api/mini/words/today

Returns the next learner-ready word.

Response:

```json
{
  "item": {
    "id": 101,
    "word": "resilient",
    "word_type": "adjective",
    "phonetic": "/rɪˈzɪliənt/",
    "english_definition": "Able to recover quickly from difficulty.",
    "uzbek_definition": "Qiyinchilikdan tez tiklana oladigan.",
    "english_example": "She stayed resilient during a hard year.",
    "uzbek_example": "U qiyin yil davomida bardoshli bo'lib qoldi.",
    "level": "B2",
    "audio_url": "/api/mini/words/101/audio"
  },
  "limit": {
    "tier": "free",
    "daily_limit": 10,
    "daily_used": 3,
    "daily_remaining": 7,
    "can_learn_more": true
  }
}
```

### POST /api/mini/words/:id/events

Stores learner interactions.

Request:

```json
{
  "event": "flipped"
}
```

Allowed events:

- `seen`
- `listened`
- `flipped`
- `learned`
- `practice_later`

Response:

```json
{
  "ok": true,
  "progress": {
    "status": "learned",
    "mastery_score": 20
  },
  "limit": {
    "daily_used": 4,
    "daily_remaining": 6
  }
}
```

## Audio

### GET /api/mini/words/:id/audio

Returns pronunciation audio.

The endpoint can redirect to a stored audio URL or stream an MP3 file.

## Tests

### POST /api/mini/tests/start

Starts a multiple choice test from learned words.

Request:

```json
{
  "question_count": 5,
  "mode": "learned_words"
}
```

Response:

```json
{
  "attempt": {
    "id": 501,
    "total_questions": 5
  },
  "questions": [
    {
      "id": "q1",
      "word_item_id": 101,
      "type": "uzbek_meaning",
      "prompt": "What does resilient mean?",
      "choices": [
        "Bardoshli",
        "Ehtiyotkor",
        "Shoshqaloq",
        "Tinch"
      ]
    }
  ]
}
```

### POST /api/mini/tests/:attempt_id/answer

Request:

```json
{
  "question_id": "q1",
  "selected_choice": "Bardoshli"
}
```

Response:

```json
{
  "is_correct": true,
  "correct_choice": "Bardoshli",
  "mastery_score": 35
}
```

### POST /api/mini/tests/:attempt_id/complete

Response:

```json
{
  "score": 4,
  "total_questions": 5,
  "accuracy": 80
}
```

## Dashboard

### GET /api/mini/dashboard

Response:

```json
{
  "stats": {
    "learned_total": 42,
    "learned_today": 3,
    "daily_limit": 10,
    "daily_remaining": 7,
    "streak_days": 5,
    "quiz_accuracy": 82,
    "mastered_total": 11
  },
  "recent_words": []
}
```

## Public Profile

### GET /api/mini/users/:user_id

Response:

```json
{
  "user": {
    "id": 2,
    "display_name": "Madina",
    "username": "madina"
  },
  "stats": {
    "learned_total": 120,
    "streak_days": 9,
    "weekly_points": 340,
    "mastered_total": 55
  }
}
```

## Leaderboard

### GET /api/mini/leaderboard?period=weekly

Response:

```json
{
  "items": [
    {
      "rank": 1,
      "user_id": 2,
      "display_name": "Madina",
      "points": 340,
      "learned_total": 120
    }
  ]
}
```

