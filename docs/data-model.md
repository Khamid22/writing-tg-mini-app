# Data Model

This model is proposed for the learner-facing Mini App. Names can be adjusted during implementation.

## learner_users

Stores Telegram Mini App users.

```text
id
telegram_user_id
username
first_name
last_name
photo_url
display_name
language_code
timezone
tier
created_at
updated_at
last_seen_at
```

`tier` values:

- `free`
- `paid`

## learner_word_items

Learner-ready vocabulary records.

This can either reference the existing `words` table or become a dedicated table.

```text
id
source_word_id
word
word_type
phonetic
english_definition
uzbek_definition
english_example
uzbek_example
level
audio_url
is_active
created_at
updated_at
```

## learner_progress

One row per user and word.

```text
id
user_id
word_item_id
status
mastery_score
times_seen
times_listened
times_flipped
times_answered
times_correct
first_seen_at
learned_at
last_reviewed_at
next_review_at
created_at
updated_at
```

`status` values:

- `new`
- `seen`
- `learning`
- `learned`
- `mastered`

## learner_daily_usage

Tracks daily free tier limits.

```text
id
user_id
usage_date
timezone
new_words_learned
tests_completed
created_at
updated_at
```

Unique key:

```text
user_id + usage_date
```

## learner_quiz_attempts

Stores test sessions.

```text
id
user_id
mode
score
total_questions
started_at
completed_at
created_at
```

## learner_quiz_answers

Stores answers inside a quiz attempt.

```text
id
attempt_id
word_item_id
question_type
prompt
choices
correct_choice
selected_choice
is_correct
answered_at
```

`choices` should be stored as JSON.

## learner_subscriptions

Tracks paid access.

```text
id
user_id
provider
provider_customer_id
provider_subscription_id
status
current_period_start
current_period_end
created_at
updated_at
```

`status` values:

- `active`
- `past_due`
- `cancelled`
- `expired`

## learner_points_events

Immutable points log for leaderboards.

```text
id
user_id
event_type
points
payload
created_at
```

Example event types:

- `word_learned`
- `quiz_correct`
- `daily_streak`
- `mastered_word`

