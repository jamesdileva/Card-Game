# Card Game

A hybrid web game combining slot machine mechanics, collectible cards, deck
building, and card-based modifiers. Spin slots, open crates, collect cards,
and build a 3-card deck that modifies your odds and payouts.

**Live:** [Frontend (Vercel)](https://card-game-phi-topaz.vercel.app/) ·
[Backend (Render)](https://card-game-1-odgy.onrender.com)
(backend cold start takes ~1 minute)

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
| Deploy   | Vercel (frontend), Render (backend)     |

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
npm run dev        # http://localhost:5173
```

Environment (`frontend/.env`):

```env
VITE_API_URL=http://localhost:3000
```

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
