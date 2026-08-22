# Architecture

Current as of the SQLite migration (commit `624e440`).

## High-Level Structure

```
Browser — React SPA (Vercel / localhost:5173)
    ↓ HTTP + session cookie (credentials: include)
Express 5 API (Render / localhost:3000)
    ├── routes/authRoutes.js   → register, login
    ├── routes/gameRoutes.js   → state, inventory, deck, spin, crates, upgrades
    ├── game/                  → pure game logic (cards, slot, crate)
    └── db.js                  → better-sqlite3 (WAL)
        ↓
SQLite file: backend/cardgame.db
```

## Backend

| File | Role |
|------|------|
| `server.js` | Express setup: CORS allowlist, JSON body parsing, `express-session` backed by the SQLite session store, mounts routes under `/api/auth` and `/api/game` |
| `db.js` | Opens `cardgame.db` with WAL mode; applies `schema.sql` automatically if the `users` table doesn't exist |
| `sessionStore.js` | Custom `express-session` store on top of better-sqlite3 |
| `routes/authRoutes.js` | `/register`, `/login`, `/logout` |
| `routes/gameRoutes.js` | All gameplay endpoints (see [api.md](api.md)) — thin handlers that load state, call game modules, and persist results |
| `game/cards.js` | Card definitions and crate weights |
| `game/effects.js` | Deck effects + synergies (pure functions, no DB/RNG) |
| `game/spin.js` | Spin pipeline math: reels, rerolls, random events, payout chain, XP/levels (pure functions; all RNG via `Math.random` so tests can seed it) |
| `schema.sql`, `seed.sql`, `scripts/init-db.js` | Schema definition and manual reset/init |

Note: there is no separate controllers/services layer. Route handlers contain
the request handling directly, calling into `db.js` and `game/` modules.

### CORS

The backend allows exactly two origins with credentials:

- `http://localhost:5173` (Vite dev server)
- `https://card-game-phi-topaz.vercel.app` (production frontend)

Add new deployment URLs to the allowlist in `backend/server.js`.

Sessions use `secure: true` + `sameSite: "none"` cookies in production
(required for the Vercel ↔ Render cross-site split); `lax` locally.

## Frontend

Plain React 19 + Vite SPA (no router, no state library):

| File | Role |
|------|------|
| `src/main.jsx` | Entry point |
| `src/Login.jsx` | Register/login form, calls `/api/auth/*` |
| `src/App.jsx` | Main app shell after login |
| `src/SlotMachine.jsx` | The whole game UI: reels, spin/auto-spin, deck builder, inventory, crates, upgrades |

API base URL comes from `VITE_API_URL`. All requests use `fetch` with
`credentials: "include"` so the session cookie is sent cross-origin.

## Database Schema

SQLite tables (from `backend/schema.sql`):

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `users` | Account + progression | `username`, `password` (hash), `balance`, `xp`, `level`, `payout_boost`, `xp_boost`, `win_streak`, `login_streak`, `claimed_level_rewards`, `inventory` (JSON) |
| `inventory` | Owned cards, one row per copy | `user_id`, `card_id`, `rarity` |
| `deck` | Active 3-card deck | `user_id`, `slot` (1–3), `card_id`, unique per (user, slot) |
| `session` | express-session store | `sid`, `sess`, `expire` |

Notes:

- Progression state (streaks, boosts, claimed rewards) lives as columns on
  `users`; card ownership is in `inventory` rows.
- `users.inventory` (JSON column) is legacy from the pre-SQLite schema — the
  normalized `inventory` table is what gameplay uses.
- The `.db`, `-shm`, `-wal` files are gitignored; a fresh clone recreates the
  database on first boot.

## Deployment

| Piece | Host | Notes |
|-------|------|-------|
| Frontend | Vercel | `frontend/`, Vite build |
| Backend | Render | `backend/`, `npm start` (`node server.js`); cold start ~1 min on free tier |
| Database | Render disk (SQLite file) | Local-first; no external DB service anymore |

## Legacy Cleanup (this repo)

The original prototype was plain HTML/CSS/JS at the repo root (`app.js`,
`index.html`, `style.css`, `public/`, `src/middleware/`). These were never
served by the current stack and were removed when the docs were rewritten.
History remains in git.
