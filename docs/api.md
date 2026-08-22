# API Reference

As implemented in `backend/routes/`. All gameplay routes require an
authenticated session (register/login first). Base URL: `/api`.

## Auth — `/api/auth`

| Method | Path       | Body | Notes |
|--------|------------|------|-------|
| POST   | `/register` | `{ username, password }` | Creates account, starts session |
| POST   | `/login`    | `{ username, password }` | Starts session |

> **Missing:** `POST /logout` — the frontend calls it but the backend has no
> route yet (see roadmap).

## Game — `/api/game`

### Reads

| Method | Path         | Returns |
|--------|--------------|---------|
| GET    | `/state`      | Full game state: balance, level, xp, boosts, streaks, deck |
| GET    | `/inventory`  | Owned cards (one entry per copy) |
| GET    | `/deck`       | Active deck slots |
| GET    | `/progression`| Level/upgrade info |

### Actions

| Method | Path              | Body |
|--------|-------------------|------|
| POST   | `/spin`           | `{ bet }` — runs the full spin pipeline: validate balance, roll reels, apply deck card effects + synergies, apply payout/xp boosts, update streaks, persist |
| POST   | `/set-deck`       | `{ newDeck: [cardId, cardId, cardId] }` — validates ownership and copy counts before saving |
| POST   | `/open-crate`     | `{ type }` — charges cost, rolls reward, adds card(s) to inventory |
| POST   | `/upgrade/payout` | Purchases payout boost upgrade |
| POST   | `/upgrade/xp`     | Purchases XP boost upgrade |

Legacy duplicates kept from an older iteration (superseded by `/upgrade/*`):
`POST /buy-upgrade`, `GET /progression` variants.

## Dev / Debug Routes

⚠️ These exist with **no environment guard** and ship to production:

| Method | Path |
|--------|------|
| POST | `/dev-add-card` |
| POST | `/add-balance` |
| POST | `/reset-account` |
| POST | `/clear-inventory` |
| POST | `/dev-reset` |

Plan: gate them behind `NODE_ENV !== "production"` (see roadmap).

## Spin Response Shape

```json
{
  "reels": ["seven", "seven", "seven"],
  "payout": 500,
  "balance": 2400
}
```

The real spin response includes additional fields for applied multipliers,
card effects triggered, XP gained, streak state, and event results — see the
handler at `backend/routes/gameRoutes.js` (`POST /spin`).

## Deck Validation Rules

A valid deck:

1. Contains exactly 3 cards
2. Has no empty slots
3. Uses only cards the player owns
4. Does not use more copies than owned

Example — inventory `{ lucky_charm: 2, double_down: 1 }`:
- ✅ `["lucky_charm", "lucky_charm", "double_down"]`
- ❌ `["double_down", "double_down", "double_down"]`

Ownership is checked against the normalized `inventory` table converted to a
`{ cardId: count }` map.

## Errors

Non-2xx responses return `{ "error": "message" }`.
