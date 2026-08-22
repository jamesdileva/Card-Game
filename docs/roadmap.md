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
- [x] Auto-spin doesn't update deck multiplier on stats display
      (root cause: spin response returned event-mutated effects; backend now
      returns pure deck effects, events applied to an internal copy)
- [x] Auto-spin doesn't update payout correctly when using buttons
      (root cause: `spinLock` was a render-local `let` — recreated every
      render, so no real lock. Now a `useRef`, and auto-spin chains after
      animation unlock instead of a blind 800ms interval)
- [x] Add `POST /api/auth/logout` route (destroys session, clears cookie)

### Security & hygiene
- [x] Gate dev routes (`/dev-add-card`, `/add-balance`, `/reset-account`,
      `/clear-inventory`, `/dev-reset`) behind `NODE_ENV !== "production"`
      (`devOnly` middleware returns 404 in production)
- [x] Remove debug `console.log` calls from the spin/deck pipeline
      (`console.error` kept in catch blocks)
- [x] Remove commented-out debug hack (`FORCE LEVEL UP`) in spin handler
### Security & hygiene
- [x] Add input validation on POST bodies (`backend/game/validate.js`:
      bet sanitization, crate type enum, deck shape + server-side
      ownership/copy-count checks; auth format checks)

### Code health
- [x] Fix pre-existing frontend lint errors in `SlotMachine.jsx` —
      `npm run lint` is green (0 errors; 3 exhaustive-deps warnings remain)
- [x] Deduplicate logic: spin pipeline extracted into `backend/game/effects.js`
      (deck effects + synergies) and `backend/game/spin.js` (reels, events,
      payout chain, XP/levels); routes are thin handlers now. Dead modules
      `game/slot.js`/`game/crate.js` deleted. Pipeline unit-tested in
      `backend/test/pipeline.test.js`
- [x] Remove legacy duplicate route `/buy-upgrade` (`/upgrade/payout` remains)
- [x] Drop unused deps: `bcrypt` removed from backend package.json;
      frontend `cors` removed
- [x] Wild-pair synergy `bonusPayout` (+300) now actually paid out by
      `computePayout` (flat, on top of chain; does not count as a win for
      streaks). `effects.luck` deliberately still display-only — needs a
      design pass before it touches RNG
- [x] Fix mojibake/corrupted comments — U+FFFD scan found none in live code;
      the corrupted files were legacy and were deleted in the docs-rewrite
      sprint. Closed as no-op.
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

- [x] Two-column desktop layout: machine left, Deck/Inventory/Store tabs
      right (sticky HUD bar with balance/level/XP/streak/logout); mobile
      stacks vertically
- [x] Card visuals: display-name map + rarity-colored text/borders +
      count badges (`components/Card.jsx`, `cardNames.js`) — no more
      mid-word ID breaks
- [x] Crate opening reveal shows Card visuals instead of raw ids
- [x] Toast feedback for upgrades/errors (bottom-center, auto-dismiss)
- [x] Win/loss feedback: floating win amounts on payouts
- [x] Balance/payout number transitions (count up/down instead of jump)
- [x] Session expiry UX: graceful "Session expired" overlay with
      Back-to-Login instead of silent failed fetches
- [x] Micro-interactions: reel-spin blur/dim while spinning, crate reveal
      animation (shaking gift suspense beat + staggered card pop-in)
- [ ] Game switcher in HUD when second game ships (coinflip/high-low)

## Track 4 — Feature Phases

### Phase 1 — Stable MVP (current)
- [x] Slot machine with animated reels + multipliers
- [x] Auth, balance, persistence (SQLite)
- [x] Crates → cards → inventory
- [x] 3-card deck with validation + stacking effects/synergies
- [x] Upgrades, XP/levels, streaks, random events
- [ ] All Track 1 debt cleared

### Phase 2 — More games & crates
- [x] Coin Flip (50/50 even money; streak bonus + flat synergy bonuses apply;
      deck payout multipliers deliberately excluded for balance — see
      `backend/game/coinflip.js`; HUD game switcher swaps Slots/Coin Flip)
- [x] 0–100 High/Low (stateful rounds via session base number; ties lose;
      payout = fair odds × 0.95 scaled by outcomes, up to 95x; chained runs;
      same deck-effect policy as coinflip)
- [x] Remaining crate types (corrupted, timed) + crate modifiers from deck
      (corrupted: trash 30%/high 50%/insane 20%; timed: $400, 2-min unlock,
      rare+ guaranteed; Lucky Charm improves spin-drop odds — full deck-based
      crate modifiers still open for future tuning)
- [x] Crate-in-crate mechanic (4–10% chance by tier; bonus rewards shown in
      the reveal modal)
- [x] Slot spin bonus drops (10% per spin: coins / random card / free elite
      crate pull; Lucky Charm bumps to 15%)

### Phase 3 — Depth
- [x] Card catalog expanded to 10 cards incl. luck design pass
      (`effects.luck` now drives reel-harmony procs + improved spin-drop
      odds; new cards: Safety Net, Hot Streak, Jackpot Surge). Remaining
      original concepts (Sticky Symbols, Bonus Reel, Glitch Engine, Reel
      Bias, Loss Streak Saver) need reel-level rewrite mechanics — future
      work if wanted; balance tuning is ongoing via play
- [ ] Build archetypes emerge naturally (High Roller / Safe Grinder / Chaos / Combo)
- [ ] Corruption system on cards
- [ ] Card evolution: merge duplicates, mutations
- [ ] Near-miss presentation + streak smoothing (verify odds unchanged)

### Phase 4 — Platform
- [ ] UI polish: card icons/animations instead of raw JSON panels, mobile responsive
- [ ] Achievements
- [ ] Leaderboards
- [ ] Battle system: cards become playable units (dual-use)
