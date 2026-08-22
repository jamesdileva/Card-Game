# AGENTS.md

Working notes, conventions, and changelog for anyone (human or agent) working
on this repo. Newest entries at the top.

## Project Snapshot

- **What:** slot machine + collectible cards + 3-card deck + crates web game
- **Stack:** React 19/Vite + Tailwind · Express 5 · SQLite (better-sqlite3)
- **Deploy:** Vercel (frontend) · Render (backend) · SQLite file on Render disk
- **Docs:** start at [docs/README.md](docs/README.md) — architecture,
  game design/economy, API reference, roadmap

## Commands

| Task | Command |
|------|---------|
| Backend dev server | `cd backend && npm run dev` (port 3000) |
| Backend prod start | `cd backend && npm start` |
| Backend tests | `cd backend && npm test` (`node --test`, no extra deps) |
| Reset database | `cd backend && npm run db:init` |
| Frontend dev | `cd frontend && npm run dev` (port 5173) |
| Frontend build | `cd frontend && npm run build` |
| Frontend lint | `cd frontend && npm run lint` |

Notes:

- The SQLite DB (`backend/cardgame.db`) is auto-created on first boot;
  `.db*` files are gitignored.
- Frontend has no test framework yet; its quality gate is `npm run build` +
  `npm run lint`.

## Conventions & Gotchas

- CORS allowlist in `backend/server.js` is explicit — new deployment URLs
  must be added there.
- Sessions are cookie-based (`credentials: include` everywhere);
  `secure`/`sameSite: none` in prod, `lax` locally.
- Deck/inventory ownership checks use the normalized `inventory` table
  converted to a `{ cardId: count }` map.
- Dev/debug routes (`/dev-add-card`, `/add-balance`, …) are unguarded —
  see roadmap before relying on them outside local dev.

## Changelog / History

### 2026-08-22 — Sprint: extract spin pipeline from routes (roadmap item 3)

- Created `backend/game/effects.js`: `calculateDeckEffects` +
  `calculateSynergies` moved verbatim out of `gameRoutes.js`.
- Created `backend/game/spin.js`: pure spin pipeline math —
  `rollSpin` (reels + reroll), `rollRandomEvent`, `applyEventToEffects`,
  `computePayout` (bet → deck mult → player boost → streak → event, same
  order as before), `computeXP`, `applyLevels`. No DB access; all RNG via
  `Math.random` so tests seed it.
- `/spin` and `/state` handlers are now thin: load state → call modules →
  persist → respond. Response shape unchanged.
- Deleted dead modules `game/slot.js` + `game/crate.js` (old 3-reel logic,
  never imported; superseded by spin.js). Removed unused `bcrypt` require
  from `gameRoutes.js` (authRoutes uses bcryptjs).
- Tests rewritten: dropped outdated slot/crate suites; added
  `test/pipeline.test.js`. **24 tests, all passing** — effects, synergies,
  base payouts, reroll trigger, event rolls, full payout chain with exact
  numbers, XP tiers, level-up rewards incl. multi-level jumps and
  already-rewarded levels.
- Behavior parity notes for future work:
  - Win/streak decided BEFORE streak bonus applies; DOUBLE_PAYOUT event
    applies after everything else.
  - XP gain tiers off BASE payout (pre bet-scaling): 5 base, +10 win,
    +25 if base ≥ 500.
  - Level rewards only for levels above `last_rewarded_level`; route saves
    `last_rewarded_level = newLevel` each spin.
  - Known quirk preserved: `effects.luck` exists but nothing consumes it yet;
    wild-pair `bonusPayout` (+300) is granted by synergy but not paid out in
    computePayout — candidate bug fix for next sprint.

### 2026-08-22 — Security fixes + logout endpoint (roadmap items 1–2)

- Added `devOnly` middleware in `backend/routes/gameRoutes.js`: dev/debug
  routes (`/dev-add-card`, `/add-balance`, `/reset-account`,
  `/clear-inventory`, `/dev-reset`) now return 404 when
  `NODE_ENV=production`; still work locally (401 without session).
- Added `POST /api/auth/logout` to `authRoutes.js` (destroys session,
  clears `connect.sid` cookie). Frontend's logout button now works.
- Stripped ~20 debug `console.log` calls from the spin/deck pipeline and
  removed the commented-out `FORCE LEVEL UP` hack. `console.error` kept
  in catch blocks.
- Verified: `npm test` (10 pass), server boots, prod-mode smoke test shows
  dev routes 404 + logout 200.
- Decision: API/pipeline tests deferred until the spin logic is extracted
  out of route handlers (roadmap "Deduplicate logic" item) — then they can
  be unit-tested directly instead of needing an HTTP harness.

### 2026-08-22 — Docs rewrite, legacy cleanup, test suite

- Removed legacy root-level prototype: `app.js`, `index.html`, `style.css`,
  `public/` (app.js, login.html), `src/middleware/` (auth.js, erroHandler.js),
  stale root `package-lock.json` + `node_modules`. Nothing referenced them.
- Rewrote documentation:
  - New `README.md` (overview, stack, quick start)
  - `docs/README.md` (index + gameplay loop)
  - `docs/architecture.md` (real structure, schema, deployment)
  - `docs/game-design.md` (distilled odds/RTP/cards/crates/economy)
  - `docs/api.md` (actual endpoints, incl. missing logout + unguarded dev routes)
  - `docs/roadmap.md` (debt track + feature phases)
- Archived superseded docs to `docs/archive/`: old `README.md`,
  `core-game.md`, `Code_structure.md`, `Card Slot Game Architecture Guide.md`.
- Added backend test suite `backend/test/game.test.js` using built-in
  `node:test` (10 tests: cards catalog, slot payouts via seeded Math.random,
  crate pools). Wired `npm test`.
- Created this AGENTS.md.

### Earlier history (from git log)

- `624e440` migrate backend from PostgreSQL to better-sqlite3
- `3985881` README update
- `ca76434`…`4cc65c6` run of payout-multiplier bug fixes: ghost cards in deck,
  deck mult not clearing last card, double payout stacking into deck
  multiplier (up to 14x), snapshotting of deck mult/payout boost

### Known unfinished work

Tracked in [docs/roadmap.md](docs/roadmap.md). Highlights: auto-spin UI bugs,
missing `/api/auth/logout` endpoint, unguarded dev routes, debug logging in
spin pipeline, `game/slot.js`+`game/crate.js` logic duplicated inline in
`gameRoutes.js`, coinflip/high-low not started.
