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

### 2026-08-22 — Sprint: UI layout pass (tabs + component split)

First UI/UX pass, planned from user screenshots. Dark theme untouched.

- **Layout restructure:** single `max-w-md` vertical column replaced by a
  two-column desktop layout (`max-w-5xl`): game column (stats/effects bars,
  reels, result, controls) + right sidebar with **Deck/Inventory/Store as
  tabs**. Mobile keeps the same order stacked vertically.
- **Sticky HUD bar** (`components/HudBar.jsx`): balance, level + XP progress,
  login streak, logout — always visible while scrolling/spinning. Replaces
  the old balance/level block inside the machine card.
- **Component split** (`frontend/src/components/`):
  - `cardNames.js` — display-name map (`mythic_multiplier` → "Mythic
    Multiplier") + rarity border/text classes; fixes the ugly mid-word
    breaks ("mythic_mul tiplier")
  - `Card.jsx` — reusable card visual: rarity-colored text + border, count
    badge top-right
  - `DeckPanel.jsx` — drag-and-drop deck builder (logic moved verbatim,
    `validDropRef` now internal to the panel)
  - `InventoryPanel.jsx` — grid of draggable cards
  - `StorePanel.jsx` — upgrades + crates (calls handlers passed from parent)
- `SlotMachine.jsx` is now the stateful orchestrator: spin/audio logic +
  game column + tab state + modals (crate rewards modal now shows Card
  visuals instead of raw ids). Crate opening extracted to named
  `openCrate(type)`; logout to `logout()`. Removed collapse toggles
  (deckMin/inventoryMin/storeOpen) — tabs replace them.
- Future games hook: new games (coinflip, high-low) should get a **top-level
  game switcher in the HUD**, swapping the main column — side tabs stay for
  account panels. Components structured so SlotMachine can become one of
  several "game" components later (separate sprint).
- Verified: lint green (0 errors), build passes. No backend changes.

### 2026-08-22 — Sprint: auto-spin bug fixes + wild-pair payout + frontend hygiene

Root causes found and fixed for both `notes.md` auto-spin bugs:

- **`spinLock` was a render-local `let`** — recreated as `false` on every
  render, so rapid clicks/auto-spin overlapped spins and racing responses
  clobbered balance/payout. Now `spinLockRef` (useRef). Spin button disables
  on `spinning` state alone.
- **Auto-spin was a blind `setInterval`(800ms)** — replaced with chaining:
  when the animation unlock timeout fires, it re-calls spin via
  `spinFnRef.current()` if `autoSpinRef.current`. Toggling AUTO kicks one
  spin from the effect via setTimeout(0) (satisfies react-hooks/set-state-
  in-effect).
- **Stats bar showed corrupted deck mult/XP/luck after event spins** —
  backend applied random-event modifiers to the same `effects` object it
  returned, so UI stats jumped (DOUBLE_XP doubled xpMult display, etc).
  `/spin` now returns pure deck effects; events apply to an internal copy.
- **Wild-pair synergy bonus now paid**: `computePayout` adds
  `effects.bonusPayout` (+300 Wild Surge) on top of the chain, before
  DOUBLE_PAYOUT doubling. Bonus alone does not count as a win for streaks.
  Two new tests.
- Frontend cleanup: removed duplicate set-deck save effect (was POSTing twice
  per change); store upgrade buttons call named `upgradeXP`/`upgradePayout`
  which now set `xpBoost`/`playerBoost` correctly instead of writing boosts
  into `effects.payoutMult/xpMult`; built minimal toast UI (bottom-center,
  2.5s auto-dismiss) that upgrades already fed via setToast; deleted dead
  code (`handleSpinResult`, floatingWin/winFaded/spinningReels states,
  inline store handler dupes); stripped frontend debug console.logs.
- Backend cleanup: removed legacy `/buy-upgrade` route (`/upgrade/payout`
  is the real one), dropped unused `bcrypt` dep.
- Verified: 26 backend tests pass, `npm run lint` green (0 errors, 3
  exhaustive-deps warnings remain), frontend builds, server boots.
- Still open by design: `effects.luck` remains display-only until we do an
  RNG/balance design pass.

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
