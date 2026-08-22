# Roadmap

Two tracks: **debt & fixes** (near-term, keeps the game trustworthy and
maintainable) and **feature phases** (new content). Items marked ✅ are done.

## Track 1 — Debt & Fixes

### In progress / known bugs
- [ ] Auto-spin doesn't update deck multiplier on stats display
- [ ] Auto-spin doesn't update payout correctly when using buttons
  (from `frontend/src/notes.md`)
- [ ] Add `POST /api/auth/logout` route (frontend calls it; backend 404s)

### Security & hygiene
- [ ] Gate dev routes (`/dev-add-card`, `/add-balance`, `/reset-account`,
      `/clear-inventory`, `/dev-reset`) behind `NODE_ENV !== "production"`
- [ ] Remove debug `console.log` calls from the spin/deck pipeline
- [ ] Remove commented-out debug hack (`FORCE LEVEL UP`) in spin handler
- [ ] Add input validation on POST bodies

### Code health
- [ ] Fix pre-existing frontend lint errors in `SlotMachine.jsx` (12 errors:
      unused state vars — toast/floatingWin/winFaded/spinningReels/upgradeXP/
      upgradePayout/handleSpinResult, empty catch block, `spinLock` reassign
      flagged by react-hooks/immutability) — `npm run lint` currently fails
- [ ] Deduplicate logic: `backend/game/slot.js` and `backend/game/crate.js`
      exist but `gameRoutes.js` re-implements their logic inline — make routes
      call the modules
- [ ] Remove legacy duplicate routes (`/buy-upgrade` vs `/upgrade/*`)
- [ ] Drop unused deps: `bcrypt` (keep bcryptjs), frontend `cors`;
      rename `erroHandler.js` typo (done — file removed in legacy cleanup)
- [ ] Fix mojibake/corrupted comments in a few files (`Login.jsx`, etc.)
- [x] Remove legacy root-level prototype files (app.js, index.html,
      style.css, public/, src/middleware/) — done during docs rewrite
- [x] Migrate PostgreSQL/Supabase → SQLite (commit `624e440`)
- [x] Backend test suite via `node:test` (`npm test`)

## Track 2 — Feature Phases

### Phase 1 — Stable MVP (current)
- [x] Slot machine with animated reels + multipliers
- [x] Auth, balance, persistence (SQLite)
- [x] Crates → cards → inventory
- [x] 3-card deck with validation + stacking effects/synergies
- [x] Upgrades, XP/levels, streaks, random events
- [ ] All Track 1 debt cleared

### Phase 2 — More games & crates
- [ ] Coin Flip
- [ ] 0–100 High/Low
- [ ] Remaining crate types (corrupted, timed) + crate modifiers from deck
- [ ] Crate-in-crate mechanic
- [ ] Slot spin bonus drops (coins / slot crates / jackpot crates)

### Phase 3 — Depth
- [ ] Full 10-starter-card set balanced to design targets (see game-design.md)
- [ ] Build archetypes emerge naturally (High Roller / Safe Grinder / Chaos / Combo)
- [ ] Corruption system on cards
- [ ] Card evolution: merge duplicates, mutations
- [ ] Near-miss presentation + streak smoothing (verify odds unchanged)

### Phase 4 — Platform
- [ ] UI polish: card icons/animations instead of raw JSON panels, mobile responsive
- [ ] Achievements
- [ ] Leaderboards
- [ ] Battle system: cards become playable units (dual-use)
