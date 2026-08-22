# Roadmap

Tracks: **debt & fixes** → **quality** → **UI/UX** (near-term, keeps the game
trustworthy and maintainable), then **feature phases** (new content).
Items marked ✅ are done.

## Suggested execution order

1. **Guard dev routes** — security hole live in prod, ~5-line fix
2. **Logout endpoint** — small, user-visible breakage
3. **Deduplicate slot/crate logic + strip debug logging** — same file
   (`gameRoutes.js`), makes the spin pipeline unit-testable before touching it
4. **Auto-spin bugs** — most visible player-facing bugs
5. **Frontend lint cleanup** — gets `npm run lint` green as a usable gate
6. Then quality/UI items in any order; feature work only after 1–4

## Track 1 — Debt & Fixes

### In progress / known bugs
- [ ] Auto-spin doesn't update deck multiplier on stats display
- [ ] Auto-spin doesn't update payout correctly when using buttons
  (from `frontend/src/notes.md`)
- [x] Add `POST /api/auth/logout` route (destroys session, clears cookie)

### Security & hygiene
- [x] Gate dev routes (`/dev-add-card`, `/add-balance`, `/reset-account`,
      `/clear-inventory`, `/dev-reset`) behind `NODE_ENV !== "production"`
      (`devOnly` middleware returns 404 in production)
- [x] Remove debug `console.log` calls from the spin/deck pipeline
      (`console.error` kept in catch blocks)
- [x] Remove commented-out debug hack (`FORCE LEVEL UP`) in spin handler
- [ ] Add input validation on POST bodies

### Code health
- [ ] Fix pre-existing frontend lint errors in `SlotMachine.jsx` (12 errors:
      unused state vars — toast/floatingWin/winFaded/spinningReels/upgradeXP/
      upgradePayout/handleSpinResult, empty catch block, `spinLock` reassign
      flagged by react-hooks/immutability) — `npm run lint` currently fails
- [x] Deduplicate logic: spin pipeline extracted into `backend/game/effects.js`
      (deck effects + synergies) and `backend/game/spin.js` (reels, events,
      payout chain, XP/levels); routes are thin handlers now. Dead modules
      `game/slot.js`/`game/crate.js` deleted. Pipeline unit-tested in
      `backend/test/pipeline.test.js`
- [ ] Remove legacy duplicate routes (`/buy-upgrade` vs `/upgrade/*`)
- [ ] Drop unused deps: `bcrypt` (keep bcryptjs), frontend `cors`;
      rename `erroHandler.js` typo (done — file removed in legacy cleanup)
- [ ] Fix mojibake/corrupted comments in a few files (`Login.jsx`, etc.)
- [x] Remove legacy root-level prototype files (app.js, index.html,
      style.css, public/, src/middleware/) — done during docs rewrite
- [x] Migrate PostgreSQL/Supabase → SQLite (commit `624e440`)
- [x] Backend test suite via `node:test` (`npm test`)

## Track 2 — Quality Improvements

### Backend
- [ ] Shared error-handling middleware instead of per-route try/catch
      (consistent `{ error }` responses, no stack leaks)
- [ ] Input validation helper for POST bodies (bet > 0, crate type enum,
      deck array shape) — reject early with 400s
- [ ] Warn/refuse to boot without `SESSION_SECRET` in production
- [x] Expand backend tests: spin pipeline unit-tested in
      `backend/test/pipeline.test.js` (24 tests total) — possible now that
      the logic is extracted into importable modules
- [ ] bcrypt: `gameRoutes.js` no longer uses it (only authRoutes does, via
      bcryptjs) — drop the dep from package.json

### Frontend
- [ ] Add a test framework (vitest + @testing-library/react) — start with
      deck validation and payout display components
- [ ] Central fetch wrapper: consistent error toasts, session-expiry handling
      (redirect to login on 401)
- [ ] Optimistic UI states or loading guards so double-clicks can't fire
      double spins/crate opens

## Track 3 — UI/UX Improvements

- [ ] Fix auto-spin control polish: disable bet/upgrade buttons while active,
      show live stats updating (overlaps Track 1 auto-spin bugs)
- [ ] Win/loss feedback: toast or floating win amounts on payouts
      (dead `toast`/`floatingWin` state in SlotMachine.jsx suggests this was started)
- [ ] Card visuals: rarity-colored borders/icons in inventory + deck builder
      instead of plain text lists
- [ ] Crate opening animation / reveal moment
- [ ] Mobile-responsive layout (reels and controls currently desktop-sized)
- [ ] Balance/payout number transitions (count up/down instead of jump)
- [ ] Session expiry UX: graceful "logged out" screen instead of failed fetches

## Track 4 — Feature Phases

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
