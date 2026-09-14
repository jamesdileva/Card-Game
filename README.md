# Card Game

A hybrid web game combining slot machine mechanics, collectible cards, deck
building, and card-based modifiers. Spin slots, open crates, collect cards,
and build a 3-card deck that modifies your odds and payouts.

**Live:** local-only now — the old Vercel/Render deploy is retired.

## Desktop app (Windows, portable — no install, no Node needed)

```bash
cd electron
npm install
npm run pack        # → release/win-unpacked/CardGame.exe (~400MB)
```

Double-click `CardGame.exe` to play. Your save data lives in
`%APPDATA%/card-game-electron/cardgame.db`; if something goes wrong,
check `%TEMP%/cardgame-electron.log`. Notes:

- Portable `win-unpacked` build on purpose — there is no installer.
- Unsigned build, so Windows SmartScreen will ask for confirmation on
  first launch. That's expected for self-built apps.
- For development, `cd electron && npm run dev` runs the desktop shell
  against your local backend (set `CARDGAME_RENDERER_URL=http://localhost:5173`
  to point it at the Vite dev server).

## Features

- 5-reel slot machine with layered payout multipliers
- Collectible cards with rarity tiers and gameplay effects
- 3-card deck builder (effects stack and synergize)
- Crates that award random cards
- Upgrades, XP/levels, win streaks, login streaks, random events

## Tech Stack

| Layer    | Tech                                    |
|----------|-----------------------------------------|
| Frontend | React 19 + Vite + Tailwind              |
| Backend  | Node.js + Express 5                     |
| Database | SQLite via better-sqlite3 (WAL mode)    |
| Auth     | express-session, bcryptjs, SQLite store |
| Deploy   | Electron portable exe, local-only (old Vercel/Render retired) |

> The database was migrated from PostgreSQL/Supabase to SQLite in commit
> `624e440`. Older docs referencing Supabase are archived under `docs/archive/`.

## Repository Layout

```
├── backend/          Express API + SQLite database
│   ├── server.js         entry point
│   ├── db.js             opens cardgame.db, applies schema.sql on first run
│   ├── routes/           authRoutes.js, gameRoutes.js
│   ├── game/             pure game logic (cards, slot, crate)
│   └── schema.sql        SQLite schema
├── frontend/         React SPA
│   └── src/              App.jsx, Login.jsx, SlotMachine.jsx
└── docs/             documentation (see docs/README.md for index)
```

## Quick Start

### Backend

```bash
cd backend
npm install
npm run dev        # http://localhost:3000
```

The SQLite database (`backend/cardgame.db`) is created automatically on first
run — no manual init needed. To reset it from scratch: `npm run db:init`.

Environment (`backend/.env`):

```env
SESSION_SECRET=any_random_string
PORT=3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api → localhost:3000)
```

The frontend talks to the API same-origin (`/api`) — no `VITE_API_URL`
needed. In dev, the Vite proxy forwards `/api` to the backend; packaged
builds serve API + renderer from one server.

### Tests

```bash
cd backend
npm test
```

## Gameplay Loop

```
Spin Slots → Earn Coins → Open Crates → Collect Cards → Build Deck
     ↑                                                      │
     └────────────── Cards Modify Future Spins ←────────────┘
```

## Documentation

See [docs/README.md](docs/README.md) for the full index: architecture,
game design/economy, API reference, roadmap, and the Sentinel integration
checklist.

## License

MIT
