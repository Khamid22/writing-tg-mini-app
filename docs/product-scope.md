# Product Scope

## Audience

Uzbek learners who want to improve English vocabulary in small daily sessions.

The app should work for casual users who only want one quick word, and for motivated users who want to study more, compete, and track progress.

## Core Jobs

1. Learn a new English word.
2. Hear the word pronounced.
3. Understand the word in English and Uzbek.
4. See examples of real usage.
5. Test memory with multiple choice questions.
6. Track progress over time.
7. Compare progress with other learners.

## User Tiers

### Guest / Telegram User

Every Telegram user can open the Mini App and start learning immediately.

Expected behavior:

- Telegram profile is used as the initial account.
- No signup form is required before the first flashcard.
- Progress is saved against the Telegram user ID when available.

### Free Tier

Free users can learn up to 10 new words per day.

Allowed:

- Daily flashcards
- Pronunciation
- Practice tests
- Personal dashboard
- Leaderboard

Limited:

- Maximum 10 newly learned words per day

### Paid Tier

Paid users can learn unlimited words.

Allowed:

- Unlimited daily learning
- All free tier features
- Future expansion: advanced review, saved lists, custom topics, downloadable summaries

## Main Features

### Daily Flashcard

The flashcard has two sides.

Front:

- Word
- Word type
- Phonetic spelling if available
- Pronunciation button

Back:

- English definition
- Uzbek meaning
- Example sentence
- Uzbek translation or explanation
- Difficulty or level

Primary actions:

- Flip card
- Listen
- Mark as learned
- Practice later
- Next word

### Test Mode

Users can test themselves based on words they have learned.

Question types:

- Choose the Uzbek meaning.
- Choose the English definition.
- Choose the correct example sentence.
- Choose the word that matches the meaning.

The first version should use multiple choice only.

### Dashboard

Personal dashboard should show:

- Words learned today
- Daily limit remaining
- Total learned words
- Current streak
- Quiz accuracy
- Mastered words
- Recent learned words

### Public User Dashboard

Users can view another learner's public progress.

Visible:

- Display name
- Total learned words
- Streak
- Weekly score
- Mastered words

Hidden:

- Private Telegram data
- Payment state
- Sensitive identifiers

### Competition

Competition should be simple and positive.

Leaderboard options:

- Weekly points
- Total learned words
- Longest current streak
- Quiz accuracy with minimum attempt count

## Success Metrics

- First flashcard viewed
- First word learned
- First pronunciation played
- First quiz completed
- Day 2 return
- Seven day streak
- Free limit reached
- Paid upgrade clicked

