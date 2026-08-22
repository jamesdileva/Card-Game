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
