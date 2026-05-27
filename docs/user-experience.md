# User Experience

## Visual Direction

The app should feel:

- Simple
- Formal
- Comfortable
- Calm
- Trustworthy

Base styling:

```css
:root {
  font-family: "Times New Roman", Times, serif;
  background: #f3f3f2;
  color: #1f1f1d;
}
```

Recommended palette:

- Background: `#f3f3f2`
- Text: `#1f1f1d`
- Muted text: `#6f6f69`
- Border: `#d8d8d2`
- Card: `#ffffff`
- Primary: `#242421`
- Primary text: `#ffffff`
- Positive: `#2f6f4e`
- Warning: `#9a6a12`

## Navigation

Bottom navigation is recommended for mobile:

- Learn
- Test
- Dashboard
- Leaders
- Profile

Telegram Mini Apps are small surfaces, so each screen should have one obvious main action.

## Learn Screen

Purpose: study the next word.

Layout:

- Top usage row: `3 / 10 words today`
- Center flashcard
- Pronunciation button
- Flip / back side action
- Learned and practice later actions

Flashcard front:

```text
resilient
adjective
/rɪˈzɪliənt/
```

Flashcard back:

```text
Able to recover quickly from difficulty.

Uzbek:
Qiyinchilikdan tez tiklana oladigan.

Example:
She stayed resilient during a hard year.

Uzbek example:
U qiyin yil davomida bardoshli bo'lib qoldi.
```

## Test Screen

Purpose: practice learned words.

States:

- Empty state if user has not learned enough words.
- Active question state.
- Answer feedback state.
- Completed result state.

Question layout:

- Prompt
- Four choices
- Next button after answer
- Progress count, for example `2 / 5`

## Dashboard Screen

Purpose: show personal progress.

Sections:

- Daily progress
- Total learned
- Streak
- Quiz accuracy
- Mastered words
- Recent words

Keep the dashboard compact. It should feel like a progress notebook, not an analytics admin page.

## Leaderboard Screen

Purpose: gentle competition.

Tabs:

- Weekly
- All time

Rows:

- Rank
- Name
- Points
- Learned words

Highlight the current user row.

## Profile Screen

Purpose: account, plan, and public profile.

Sections:

- Telegram name
- Current tier
- Daily limit status
- Upgrade action
- Public profile preview

## Limit State

When a free user reaches 10 words:

Title:

```text
Daily limit reached
```

Body:

```text
You learned 10 words today. Come back tomorrow or unlock unlimited learning.
```

Actions:

- Practice learned words
- View dashboard
- Upgrade

The limit should not block test mode.

