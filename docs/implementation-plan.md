# Implementation Plan

## Phase 1: Architecture And Prototype

Goal: validate the Mini App experience without changing the existing project.

Deliverables:

- Architecture documents
- Static frontend prototype
- Flashcard flip interaction
- Audio button placeholder
- Test mode mock flow
- Dashboard mock state
- Leaderboard mock state

## Phase 2: Mini App Frontend

Goal: build the production frontend shell.

Deliverables:

- Vite + React + TypeScript app inside `telegram-mini-app/frontend`
- Telegram WebApp initialization
- Mobile-first routes
- Learn screen
- Test screen
- Dashboard screen
- Leaderboard screen
- Profile screen
- Shared design tokens

## Phase 3: Learner Backend API

Goal: add real learner APIs without interfering with admin publishing flows.

Deliverables:

- `/api/mini/auth/telegram`
- `/api/mini/me`
- `/api/mini/words/today`
- `/api/mini/words/:id/events`
- `/api/mini/tests/*`
- `/api/mini/dashboard`
- `/api/mini/leaderboard`
- Telegram init data verification

## Phase 4: Database Integration

Goal: persist accounts, progress, limits, quizzes, and leaderboard data.

Deliverables:

- Learner user table
- Learner progress table
- Daily usage table
- Quiz attempt and answer tables
- Points event table
- Subscription table

## Phase 5: Content Enrichment

Goal: ensure every learner word has Uzbek learning content.

Deliverables:

- Uzbek definition field
- Uzbek example translation field
- Learner-ready content validation
- Admin or script path to enrich missing Uzbek fields

## Phase 6: Paid Tier

Goal: unlock unlimited learning.

Deliverables:

- Payment provider decision
- Subscription state sync
- Upgrade UI
- Paid tier daily limit bypass
- Payment webhook handling

## Phase 7: Launch Readiness

Goal: make the app reliable enough to publish.

Deliverables:

- Error states
- Loading states
- Empty states
- Backend tests
- Frontend smoke tests
- Telegram BotFather Mini App configuration
- Production deployment plan

## First Build Recommendation

Start with Phase 1 and Phase 2 only.

Reason:

The user experience should be felt on a phone before backend details harden. Once the flashcard, test mode, and progress screens feel right, the backend can be connected with fewer product reversals.

