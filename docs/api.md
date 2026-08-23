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
| POST   | `/spin`           | `{ bet }` — validated: positive integer ≤ 1,000,000 (400 otherwise). Runs the full spin pipeline: roll reels, apply deck card effects + synergies + random events to an internal copy, apply payout/xp boosts, update streaks, persist |
| POST   | `/coinflip`       | `{ bet, choice }` — `choice` must be `"heads"` or `"tails"`; same bet validation. 50/50 even money; deck streak bonus and flat synergy bonuses apply, payout multipliers deliberately do not |
| POST   | `/highlow`        | `{ action }`: `"start"` rolls a 1–100 base number into your session (free); `"guess"` needs `{ direction: "higher"\|"lower", bet }` against that number. Strictly over/under wins, ties lose; payout is fair odds × 0.95 scaled by winning outcomes (1 outcome → 95x). The roll becomes the next round's base |
| POST   | `/set-deck`       | `{ newDeck: [cardId|null, …] }` — **server-side validation**: shape (≤3 slots) and ownership/copy-count checks against inventory (400 on violation). No longer trusts the client |
| POST   | `/open-crate`     | `{ type }` — `basic` ($100), `premium` ($250), `elite` ($500), `corrupted` ($700, high variance: trash 30% / high-tier 50% / insane 20%), `timed` ($400). All crates can trigger crate-in-crate (4–10% by tier): response includes `bonusRewards`. **Timed flow**: first call buys → `{ pending: true, unlockAt }` (2 min); re-calling while locked → 400 with `remainingSeconds`; after unlock the same call opens it (guaranteed rare+) and clears the slot |
| POST   | `/evolve`         | `{ cardId }` — merges 3 owned copies into one **random card of the next rarity** with a random **mutation** (✦5–25% stronger effect for that card id everywhere). Legendary is terminal. Validated server-side; transactional. Response includes `mutation` |
| POST   | `/upgrade/payout` | Purchases payout boost upgrade |
| POST   | `/upgrade/xp`     | Purchases XP boost upgrade |

### Deck effects & mutations

Deck effects (`calculateDeckEffects`) are computed from the equipped card
ids plus the player's mutation map: a mutated copy empowers *every copy of
that card id* used in any deck by its mutation factor. Synergies stack on
top — including archetype sets (Safety Inspector 🛡️, Surge Rider 🔥,
Vault Buster 💰, Chaos Engine 🌪️, Steady Burn 🧯).

### Spin bonus drops

Every `/spin` rolls a drop (10% base chance; Lucky Charm in deck raises it
to 15%): ~70% of drops are coins (0.5–2× bet, added to balance), ~20% a
random card inserted into inventory, ~10% a free Elite Crate opened on the
spot. Response carries `drop: { type, ... }`; `null` when nothing dropped.

Removed legacy routes: `/buy-upgrade` (superseded by `/upgrade/*`).

### Input validation summary

All gameplay POST bodies are validated (`backend/game/validate.js`, unit-tested):
bets must be positive integers within cap; crate types are enum-checked;
decks are shape-checked **and** ownership-checked against the inventory
table before persisting. Auth endpoints enforce username/password format
(3–20 chars letters/digits/underscore; password 4–100 chars).

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
