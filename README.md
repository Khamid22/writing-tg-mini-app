# Telegram Mini App Architecture

This folder contains the planned architecture for a Telegram Mini App that helps Uzbek learners study new English words every day.

The Mini App is intentionally designed as a separate learner-facing product. The existing publishing/admin project should remain untouched until integration work is explicitly planned.

## Product Goal

Help Uzbek users learn English vocabulary through a simple daily flashcard experience:

- Learn up to 10 words per day on the free tier.
- Learn unlimited words on the paid tier.
- Listen to pronunciation.
- Flip cards to reveal English and Uzbek meanings, usage examples, and notes.
- Practice learned words through multiple choice tests.
- Track personal progress, streaks, accuracy, and mastery.
- Compare progress through public profiles and leaderboards.

## Architecture Documents

- [Product Scope](docs/product-scope.md)
- [Technical Architecture](docs/technical-architecture.md)
- [Data Model](docs/data-model.md)
- [API Contract](docs/api-contract.md)
- [User Experience](docs/user-experience.md)
- [Implementation Plan](docs/implementation-plan.md)

## Guiding Principles

- Mobile-first because Telegram Mini Apps are primarily used inside Telegram on phones.
- Fast first session: users should try a word immediately without a manual signup form.
- Telegram identity is the default account system.
- Formal, comfortable, minimal visual design.
- Use `Times New Roman` as the primary font.
- Use `#f3f3f2` as the app background.
- Keep learning gentle: progress and competition should motivate without making the app feel noisy.

## Stack

The app now runs as an independent full-stack project:

- Frontend: Vite, React, TypeScript
- Telegram SDK: Telegram WebApp JavaScript API
- Styling: plain CSS with a restrained theme
- Backend: FastAPI, SQLAlchemy
- Database: SQLite locally, PostgreSQL on Render
- Bot integration: Telegram webhook for manual payment screenshots and admin approval buttons
- Pronunciation: browser speech synthesis in the Mini App

## Run Locally

From this folder, run the backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=.. uvicorn app.main:app --reload --port 8000
```

In a second terminal, run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Then open the frontend:

```text
http://localhost:5174
```

Build checks:

```bash
cd frontend
npm run build

cd ../backend
PYTHONPATH=.. python -m compileall app ../telegram_bot
```

## Deploy To Render

This project includes a `render.yaml` Blueprint. On Render, create a new Blueprint instance from the repository root. It will create:

- One Docker web service
- One PostgreSQL database
- Required generated secrets where possible

Fill these environment variables in Render:

```bash
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_IDS=123456789,987654321
CORS_ORIGINS=https://your-render-service.onrender.com
MANUAL_PAYMENT_CARD_LABEL=8600 0000 0000 0000
```

The Docker service starts with Render's `$PORT` automatically through the existing `Dockerfile`.

## Telegram Bot Webhook

After Render gives you the public app URL, register the webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-render-service.onrender.com/api/telegram/webhook",
    "secret_token": "your TELEGRAM_WEBHOOK_SECRET"
  }'
```

Payment flow:

- User creates a premium payment request in the Mini App and gets a code like `UZ-123456`.
- User sends the payment screenshot to the bot with that code in the caption or message.
- The bot sends the screenshot to every ID in `TELEGRAM_ADMIN_IDS`.
- Admin presses `Tasdiqlash` or `Bekor qilish`.
- Approved users become paid for `MANUAL_PAYMENT_PLAN_DAYS`.

## Move To Another Folder

This Mini App is self-contained. You can move or copy the whole `telegram-mini-app` folder into a different project directory.

After moving it, run:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=.. uvicorn app.main:app --reload --port 8000

cd ../frontend
npm install
npm run dev
```

The app does not import files from the parent repository.

## Current Prototype Features

- Telegram Mini App initialization through `telegram-web-app.js`
- Daily flashcard flow
- Card flip interaction
- Pronunciation button using browser speech synthesis
- English and Uzbek definitions
- English and Uzbek example sentences
- Free tier limit of 10 learned words per day
- Manual premium payment flow with Telegram admin approval
- Multiple choice test mode based on learned words
- Progress dashboard
- Leaderboard
- Public profile modal
- Profile and plan screen

## Non-Goals For This Folder

- No changes to the existing admin panel.
- No changes to existing publishing, scheduling, Google Drive, or Telegram channel code.
- No changes to parent project database migrations.
- No card processor integration yet; payments are manual screenshot approvals.
