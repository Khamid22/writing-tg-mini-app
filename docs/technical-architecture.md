# Technical Architecture

## System Shape

The Mini App should be built as a separate frontend application and integrated with the existing backend only through explicit learner-facing APIs.

Recommended folder shape when implementation begins:

```text
telegram-mini-app/
├── README.md
├── docs/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── flashcards/
│   │   │   ├── tests/
│   │   │   ├── dashboard/
│   │   │   ├── leaderboard/
│   │   │   └── account/
│   │   ├── lib/
│   │   └── styles/
│   ├── package.json
│   └── vite.config.ts
└── backend-contract/
```

Backend implementation can later live in the parent Python app, but the API should be designed as if the Mini App is its own client.

## Frontend Responsibilities

- Initialize Telegram Mini App runtime.
- Read Telegram init data.
- Authenticate with backend using Telegram init data.
- Render flashcards, tests, dashboard, leaderboard, and account views.
- Enforce friendly client-side daily limit display.
- Defer authoritative limits and progress writes to the backend.

## Backend Responsibilities

- Verify Telegram init data signature.
- Create or update learner account.
- Serve daily words.
- Enforce free and paid tier limits.
- Store learning progress.
- Generate and grade quizzes.
- Store quiz attempts.
- Serve leaderboard and public profiles.
- Provide pronunciation audio URLs.

## Authentication

Telegram Mini Apps pass signed `initData`.

Flow:

1. User opens Mini App inside Telegram.
2. Frontend reads `window.Telegram.WebApp.initData`.
3. Frontend sends init data to `POST /api/mini/auth/telegram`.
4. Backend verifies the signature with the bot token.
5. Backend creates or updates the learner.
6. Backend returns a session token or sets an HTTP-only session cookie.

For first implementation, an HTTP-only session cookie is preferred if frontend and backend share a domain. A bearer token is acceptable if deployed separately.

## Word Source

The Mini App should eventually reuse the existing vocabulary data, but it needs learner-specific fields.

Required word content:

- English word
- Word type
- Phonetic spelling
- English definition
- Uzbek definition or translation
- Example sentence in English
- Uzbek example translation or explanation
- Level
- Pronunciation audio

If existing word records do not contain Uzbek meanings, add a content enrichment step before exposing words to learners.

## Daily Limit Enforcement

The backend is the source of truth.

Free tier:

- Count newly learned words per user per local day.
- Limit to 10.

Paid tier:

- No daily learning limit.

Timezone:

- Default to `Asia/Tashkent`.
- Store timestamps in UTC.
- Calculate daily limit windows in the user's preferred timezone or `Asia/Tashkent`.

## Testing Strategy

Frontend:

- Component tests for flashcard flip, pronunciation action, quiz selection, and limit states.
- Route smoke tests for all top-level screens.

Backend:

- Telegram auth verification tests.
- Daily limit tests.
- Progress state tests.
- Quiz grading tests.
- Leaderboard ranking tests.

