# Gamification Overview

InnoVision uses XP, levels, streaks, badges, leaderboards, and daily quests to encourage consistent learning.

**Dashboard:** `/gamification`

## XP rewards (source of truth)

Values are defined in `src/app/api/gamification/stats/route.js`:

| Action | XP |
|--------|-----|
| View course | 10 |
| Generate course | 10 |
| Complete lesson | 5 |
| Complete chapter | 5 |
| Complete course | 50 |
| Correct answer (MCQ, fill-in, match) | 2 |
| Perfect quiz | 2 |
| Help student | 15 |

## Levels

- Level is calculated as `floor(totalXP / 500) + 1` (500 XP per level).
- Level-up celebrations and milestone toasts are handled in `src/contexts/xp.jsx`.

## Streaks

Streaks count **consecutive calendar days** with qualifying learning activity—not multiple activities on the same day. See [Streaks](streaks.md).

## Real-time updates

The navbar and gamification dashboard poll for updates (typically every 5–10 seconds). See [Real-time updates](real-time.md).

## Further reading

- [XP rewards](xp-rewards.md) — how XP is earned in quizzes and courses
- [Streaks](streaks.md) — streak rules and examples
- [Real-time updates](real-time.md) — polling intervals and components
- [Testing](testing.md) — manual and API testing steps

## API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gamification/stats` | GET/POST | User stats; POST awards XP by `action` |
| `/api/gamification/leaderboard` | GET | Leaderboard rankings |
| `/api/gamification/award-badge` | POST | Award badges |
| `/api/gamification/daily-quests` | GET | Daily quests |
| `/api/gamification/xp-history` | GET | XP history for charts |
| `/api/gamification/fix-streak` | POST | Streak repair (admin/debug) |
| `/api/gamification/test` | GET | Test helpers (development) |
