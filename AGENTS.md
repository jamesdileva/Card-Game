# AGENTS.md

Working notes, conventions, and changelog for anyone (human or agent) working
on this repo. Newest entries at the top.

## Project Snapshot

- **What:** slot machine + collectible cards + 3-card deck + crates web game
- **Stack:** React 19/Vite + Tailwind · Express 5 · SQLite (better-sqlite3)
- **Deploy:** local-only Electron portable exe (`release/win-unpacked/CardGame.exe`).
  The old Vercel (frontend) / Render (backend) deploy is retired.
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
| Frontend tests | `cd frontend && npm test` (vitest + testing-library) |
| Electron dev | `cd electron && npm install && npm run dev` (spawns backend via plain node; set `CARDGAME_RENDERER_URL=http://localhost:5173` for Vite HMR) |
| Electron package (portable) | `cd electron && npm run pack` → `release/win-unpacked/CardGame.exe` (no installer, `dir` target only) |

Notes:

- The SQLite DB (`backend/cardgame.db`) is auto-created on first boot;
  `.db*` files are gitignored.
- Frontend quality gate is `npm test` + `npm run lint` + `npm run build`.

## Conventions & Gotchas

- Local-only now: CORS allowlist in `backend/server.js` is localhost-only;
  session cookies are `secure: false` / `sameSite: lax` (same-origin).
- Frontend API base is relative (`/api` in Login.jsx/SlotMachine.jsx) —
  Vite dev proxies `/api` → `localhost:3000`; packaged/single-server builds
  serve API + renderer from one origin. `VITE_API_URL` is gone.
- `backend/server.js` exports `startServer({ port, serveDir })`; standalone
  boot serves `../frontend/dist` when present. DB path honors
  `CARDGAME_DB_PATH` (Electron points it at `%APPDATA%/card-game-electron/`).
- Electron (`electron/main.cjs`): packaged = in-process backend over
  `http://localhost:3000` (never `file://`); dev = spawns plain-node backend
  child (native-module ABI). Backend errors mirror to
  `%TEMP%/cardgame-electron.log` via the console.error hook.
- Native modules: better-sqlite3 v13 ships N-API prebuilds — NO rebuild
  needed for Electron (`npmRebuild: false`). Do NOT run
  `electron-builder install-app-deps` / electron-rebuild here (no compiler
  toolchain); the bundled `prebuilds/*.node` load under both Node and Electron.
- `release/` + `release-staging/` are gitignored (400MB build output).
- Repack gotcha: if `pack` fails `EBUSY ... app.asar`, something holds the
  old build open — diagnosed via Sysinternals `handle.exe`; VS Code holding
  `release/win-unpacked/resources/app.asar` blocked repack on 2026-09-14
  (worked around via staging output `--c.directories.output=../release-staging`).
- Sessions are cookie-based (`credentials: include` everywhere).
- Deck/inventory ownership checks use the normalized `inventory` table
  converted to a `{ cardId: count }` map.
- Dev/debug routes (`/dev-add-card`, `/add-balance`, …) are unguarded —
  see roadmap before relying on them outside local dev.

## Changelog / History

### 2026-09-14 — Fix: coins-drop spin crash + silent manual failures

- **One bug, two symptoms:** every coins bonus drop (~7% of spins) 500'd
  with `TypeError: Assignment to constant variable` — `const newBalance`
  reassigned at the `+= dropInfo.amount` line (log showed 9 crashes in
  90s of auto-spin). Auto-spin halted with "…Server error"; manual spins
  died silently (`data.error` only hit console + auto-only toast).
- **Fix:** `let newBalance` (sibling routes audited clean) + toast
  `data.error` on manual spins (covers 500s and "Not enough balance").
- Verified live in exe: 50 spins, 0 errors, 4 coins drops with exact
  balance math; no new backend-error lines. Backend 84/84, frontend
  64/64, lint 0 errors, repacked.

### 2026-09-14 — Fix: login focus freeze after failed attempts

- **Symptom:** after a wrong password, the "Invalid login" blocking
  `alert()` deactivated the app window in Electron — fields wouldn't
  focus/type until clicking back in. Code confirmed the inputs are never
  disabled; it was native-dialog focus theft.
- **Fix** (`Login.jsx` only): inline `role="alert"` notice under the buttons
  replaces both `alert()`s (register success is inline green now too);
  failed login focuses the password field; the silent network-error catch
  shows "Connection error". New `Login.test.jsx` (4 tests incl. inputs stay
  enabled/typeable + retry goes through after a 401).
- Verified: frontend 64/64 (9 files), lint 0 errors, build passes, backend
  84/84 untouched, repacked exe serves the new bundle, james/123 login OK.

### 2026-09-14 — Fix: inventory collapse + snappier dwell

- **Inventory showed 1 card:** `/state` and `/inventory` ran
  `MAX(corrupted)` with no `GROUP BY` (regression from `5a0604e`), so
  SQLite collapsed every inventory to a single row. Data was never lost
  (78 rows intact). Fix: per-row `corrupted` in both queries + extracted
  pure `stackInventory()` helper (`backend/game/inventory.js`) used by both
  routes, with 4 regression tests. Verified live: 10 stacks / 78 cards.
- **Dwell retune:** 1200/2500ms felt slow → 800/1800ms in `spinDwell.js`
  (boundary-based tests needed no changes).
- Verified: backend 84/84, frontend 60/60, lint 0 errors, repacked exe
  serves the new bundle + full inventory.

### 2026-09-14 — Fix: auto-spin result dwell (tiered)

- **Problem:** auto-spin chained the next spin ~120ms after results landed
  (results at ~830ms, unlock+chain at ~950ms), so the payout count-up
  (400ms), floating win (1200ms), winner glow, and toasts never finished
  displaying.
- **Fix** (`SlotMachine.jsx` + new `src/spinDwell.js`): input still unlocks
  at ~950ms (manual spins feel identical), but the auto chain waits out a
  dwell — 1200ms normally, 2500ms on wins ≥ 5× bet — via `autoTimerRef`.
  Manual SPIN / STOP / AUTO-off / game-switch clear the queued chain, so no
  double-fires or stray spins. Threshold helper `dwellFor(payout, bet)` is
  unit-tested (3 tests). Backend untouched.
- Verified: frontend 60/60 (8 files), lint 0 errors, build passes, backend
  80/80, repacked exe serves the new bundle.

### 2026-09-14 — Fix: packaged-app login + account carry-over

- **Root cause of "Login failed" in the exe:** the packaged app uses a fresh
  DB (`%APPDATA%/card-game-electron/cardgame.db`) — dev accounts were never
  there — and Register silently lied: it always alerted "Registered!" even
  on 400/`{"error":"User exists"}`. The user's `james`/`123` (valid in dev,
  created before the 4-char rule in `b7820ff`) was rejected on re-register
  and then correctly 401'd on login, with zero backend trace.
- **Carried over `james` only** (users + 3 deck + 60 inventory rows, ids
  preserved; smoke account removed; sessions not copied; backup at
  `cardgame.db.bak-20260914`). `james`/`123` now logs into the exe with its
  dev balance/deck.
- **Honest auth UI** (`Login.jsx` only, no backend change): Register/Login
  surface the server's message; rule hint under the inputs. Deliberately did
  NOT relax the 4-char password minimum.
- Verified live: james/123 → 200 + carried-over state; wrong password →
  clean 401 "Invalid login". Backend 80/80, frontend 57/57, lint 0 errors.

### 2026-09-14 — Sprint: Electron portable exe (local-only)

- **Packaged as portable Windows app** (`release/win-unpacked/CardGame.exe`,
  `dir` target — no installer, double-click to play, no Node needed).
  New `electron/` host: `main.cjs` runs the Express backend in-process and
  serves the bundled renderer over `http://localhost:3000` (never `file://`,
  so no CORS/cookie/router issues); SQLite lives at
  `%APPDATA%/card-game-electron/cardgame.db`; backend errors mirror to
  `%TEMP%/cardgame-electron.log`; single-instance lock; EADDRINUSE dialog.
- **Local-only pivot:** frontend API base is now relative `/api`
  (`VITE_API_URL` removed; Vite dev proxy covers local dev);
  `backend/server.js` exposes `startServer({ port, serveDir })` + serves
  `../frontend/dist` in single-server mode; CORS is localhost-only;
  cookies `secure: false` / `sameSite: lax`. Vercel/Render retired.
- **Native-module non-issue:** better-sqlite3 v13's N-API prebuilds load
  under Electron with no rebuild (`npmRebuild: false`).
- Verified: full smoke of staged build (health → register → login →
  state → spin payout → userData DB → no orphan on quit), backend 80/80,
  frontend 57/57, lint 0 errors. Stale `release/win-unpacked` repack was
  blocked by a VS Code lock on `app.asar` — verified via
  `release-staging/` build instead; needs one final `npm run pack` once
  the lock is released.

### 2026-08-22 — Sprint: vitest suite + set-effect tooltips + store click guards

- **Frontend test framework shipped (vitest + @testing-library/react + jsdom)**:
  `cd frontend && npm test` runs **57 tests** across 7 files —
  - `cardNames.test.js`: name/rarity maps, evolution ladder, and a
    **coverage test asserting every synergy label the backend emits has a
    tooltip description** (`synergyTooltip` over all 16 labels from
    `backend/game/effects.js`)
  - `Card.test.jsx`: rarity/count badges, ✦ mutation, ☠ corruption ring,
    hover-title sections
  - `DeckPanel.test.jsx`: click-to-equip into earliest empty slot, copy-count
    limits, deck-full/no-copies toasts, equipped-badge + dimming
  - `StorePanel.test.jsx`: crate type ids, busy-state disabling, timed-crate
    countdown → OPEN! transition
  - `CoinFlip.test.jsx` / `HiLo.test.jsx`: pick/flip/disable states, odds math
    previews (x1.90 at 50; x0.95 lower-than-100), chained rounds, impossible
    sides
  - `useCountUp.test.js` with a manual rAF stub (deterministic frames;
    fake-timer rAF proved flaky)
- **Gotchas worth keeping:** userEvent hangs under vitest fake timers unless
  clicks go through `fireEvent`; RTL `waitFor` also deadlocks under fake
  timers (assert directly after `act(() => vi.advanceTimersByTime(...))`);
  `globalThis.IS_REACT_ACT_ENVIRONMENT = true` needed in `src/test/setup.js`
  when using React's `act` directly. Test setup lives in
  `frontend/vitest.config.js` + `src/test/setup.js`.
- **Set/synergy hover tooltips:** new `SYNERGY_EFFECTS` map +
  `synergyTooltip()` in `cardNames.js` (keyed by *normalized* label — backend
  labels are emoji-prefixed and "Triple Mythic" ships with a stray leading
  space). The effects-bar synergy strip now shows "Name · required cards ·
  effect" per active set on hover; the four stat tiles (DECK/BOOST/XP/Luck)
  got explanatory titles via `STAT_TOOLTIPS`. Native `title`, consistent with
  card tooltips.
- **Store double-click guard:** `openCrate`/`upgradeXP`/`upgradePayout` now
  take ref locks (same pattern as spin/coinflip/hilo) + a shared `storeBusy`
  state that disables all StorePanel buttons while a request is in flight.
- `/dev-reset` balance aligned with `/reset-account` ($1,000, was $10,000).
- Verified: 57 frontend tests pass, lint green (0 errors), build passes,
  backend 80 tests still green.

### 2026-08-22 — Sprint: Sentinel coverage expansion + test top-ups

- **Sentinel (external repo, `C:\Users\j\Projects\Sentinel`) now covers the
  full game** — commit `93de4c7` there:
  - Tier-1 smoke drives the HTTP API end-to-end (register/login → spin →
    coinflip → highlow start+guess → basic crate → rejection paths)
  - Click-through features grew 1 → 4: slots spin, Coin Flip round,
    Hi-Lo round, BASIC crate opening with reveal modal
  - Balance locator fixed for the HUD layout pass via our new
    `[data-testid="balance"]` hook in HudBar.jsx — keep that attribute when
    touching the HUD
- **Two integration gotchas from app-side changes:** auth validation rejects
  hyphens and >20-char usernames, so Sentinel throwaway accounts became
  `tester_<ns%10^9>`; shared-page dialog listeners in Playwright must be
  idempotent across features
- Card-game tests: corruption rate band (~35%) + standard crates never emit
  corrupted rewards — **80 backend tests passing**
- Verified: full E2E against dev servers (API block + 4 features, non-blank
  screenshots), Sentinel lint gate (black/isort/flake8 @100) clean,
  test_testers.py 40 passed; card-game lint/build green

### 2026-08-22 — Sprint: corruption on cards + card effect tooltips

- **Corrupted variants:** rewards from corrupted crates roll `corrupted:
  true` at 35% (`CORRUPTION_CHANCE` in crates.js); persisted via
  `inventory.corrupted` column (migration). Equipping a corrupted id
  amplifies its per-card contributions ×2 (combined mutation×corruption
  factor capped ×4) while each corrupted deck slot taxes XP −15%
  (floored ×0.5). `getCorruptedSet(userId)` wired into /state, /spin,
  /coinflip, /highlow next to the mutation map. Safety Net refund also
  amplifies now but is capped independently (×0.4).
- **Card tooltips:** `Card.jsx` renders a native hover title with name +
  plain-English effect (new `CARD_EFFECTS` map in cardNames.js) +
  mutation/corruption notes; ✦ and ☠️ badges moved INTO Card so deck slots,
  inventory, and crate reveals all get them consistently. Corrupted cards
  show a red ring.
- Tests: 78 backend tests passing (corruption amp/penalty/cap suites).
- Live smoke: corrupted mythic_multiplier equipped → payoutMult ×5,
  xpMult 0.85 through /state; inventory carries `corrupted: true`.
- Gotcha: refactoring `rollCorruptedRewards` to mark corruption initially
  returned the trash-tier reward as a bare object instead of an array —
  caught by existing tier tests.

### 2026-08-22 — Sprint: archetype synergies + card mutations

- **Five new synergies** in `effects.js` for archetype identity:
  🛡️ Safety Inspector (safety_net+reroll: refund +12pts, reroll +15),
  🔥 Surge Rider (hot_streak+jackpot_surge: surge +3, streak rate +1),
  💰 Vault Buster (jackpot_boost+jackpot_surge: mult ×1.5),
  🌪️ Chaos Engine (wild_symbol+jackpot_surge: luck +0.4),
  🧯 Steady Burn (safety_net+hot_streak: refund +5pts, streak rate +2).
- **Safety Net is numeric now**: `effects.safetyNetRefund` (0 default)
  replaces the boolean; `computePayout` refunds
  `floor(bet × min(refund, 0.5))` on losses.
- **Mutations:** `inventory.mutation` column (`ensureColumn` migration);
  `/evolve` rolls ✦5–25% (rounded to 2dp) on the evolved card. A mutated
  copy empowers **every copy of that card id in any deck**:
  `calculateDeckEffects(deck, mutationMap)` multiplies each per-card
  additive contribution by `mutations[id] || 1`. `getMutationMap(userId)`
  helper wired into /state, /spin, /coinflip, /highlow. Inventory payloads
  (/state, /inventory) now carry max mutation per card id; frontend shows
  ✦N% badges in Deck + Inventory panels.
- Tests: 75 backend tests passing (mutation amplification + new synergy
  suites; safetyNet assertions migrated to the numeric field).
- Live smoke: evolve double_down → multiplier_chain ✦1.13 → deck payoutMult
  1.226 (= 1 + 0.2×1.13) confirmed through /state.
- Smoke-test lesson: `pickEvolvedCard` is random — assert against the
  evolved card's *actual* stats, not assumptions about which card you got.

### 2026-08-22 — Fix: auto-spin stall + blur-on-results

- **Auto-spin silent stop:** the chained loop only re-triggered from the
  success path (`finishSpin` unlock). Any `data.error` response (e.g.
  "Not enough balance") or network error released the lock and ended the
  chain forever with no explanation. Now `stopAutoSpin()` flips AUTO off
  and toasts the reason; successful spins keep chaining via
  `endSpinUnlock()`.
- **Winner glow rendered blurred:** reel blur was tied to `spinning`, which
  stays true until the *unlock* timer — ~120ms AFTER results land — so
  wins appeared blurred (constant during auto-spin). New `reelsMoving`
  state drives blur/glow and clears the moment the last reel settles;
  `spinning` remains purely the input lock.

### 2026-08-22 — Sprint: card evolution (merge duplicates)

- **Mechanic:** merge 3 owned copies of a card → 1 **random card of the
  next rarity** (common→rare→epic→legendary; legendary is terminal).
  "Mutations" (variant stats) intentionally deferred as future flavor.
- `backend/game/evolution.js` pure module (`MERGE_COST`, `nextRarity`,
  `canEvolve`, `pickEvolvedCard`) + 4 tests; `/api/game/evolve {cardId}`
  route — transactional, server-side ownership/count/rarity validation.
- Frontend: ✨ Evolve buttons in the Inventory tab on cards with ≥3 copies
  (with confirm dialog + toast), state refresh after success. `refreshState`
  extracted from the mount effect so handlers can re-sync. Rarity ladder +
  MERGE_COST mirrored in `components/cardNames.js`.
- **Gotcha:** `SELECT rowid ...` on a table with an INTEGER PRIMARY KEY
  returns the value under that column's name (`"id"`), not `"rowid"` — the
  first version deleted by `undefined` and silently consumed nothing. E2E
  smoke caught it (inventory unchanged after evolve). Fixed with an explicit
  `SELECT id AS inv_id`.
- Tests: 73 backend tests passing. Live smoke: 4 copies → evolve → 1 left +
  evolved card; unowned/no-id/legendary → clean 400s.

### 2026-08-22 — Sprint: Phase 3 — luck design pass + card catalog to 10

- **`effects.luck` is finally consumed** (was display-only since forever):
  - *Reel harmony*: after the initial roll, chance
    `min((luck−1)×0.2, 12%)` converts one reel to match another, nudging
    spins toward paid match tiers. Modest by design — one proc rarely
    changes the payout class alone.
  - *Drop odds*: spin-drop window widens with luck
    (`0.9 − min((luck−1)×0.15, 0.08)`); replaces the old luckyCharm flag,
    so wild_symbol decks and luck synergies now help drops too. Capped.
- **Three new cards** (catalog 7 → 10):
  - `safety_net` (rare): refund 20% of bet on losing spins; never counts
    as a win for streaks
  - `hot_streak` (epic): +2% per card on the per-win streak bonus rate
    (5% → 7% with one; stacks)
  - `jackpot_surge` (legendary): +3% per card chance a winning spin pays
    ×5 (capped at 6%); procs after the synergy bonus, before DOUBLE_PAYOUT
- Deliberately NOT added: Sticky Symbols / Bonus Reel / Glitch Engine /
  Reel Bias / Loss Streak Saver concepts need reel-level mechanics the
  current unique-count engine doesn't have — documented as future work.
- Tests: 69 backend tests passing (new effect + harmony + drop-cap suites;
  neutral-effects assertion updated for new default fields).
- Live smoke: deck of all three new cards → state shows streakRate 0.07 /
  surge 0.03 / safetyNet true; losing spin paid exactly $20 refund.

### 2026-08-22 — Sprint: corrupted/timed crates, crate-in-crate, spin drops (Phase 2 crates complete)

- **Crate logic extracted** to `backend/game/crates.js` (`CRATE_TYPES` map +
  `openCrate(type)`) — the inline pool code is gone from gameRoutes.js.
- **Corrupted Crate ($700):** trash 30% (1 common) / high tier 50% (rares/
  epics ×2) / insane 20% (legendaries ×2).
- **Timed Crate ($400):** buy → `pending_crate` JSON column on users (new
  `ensureColumn` migration helper in db.js + schema.sql updated) → unlocks
  after 2 min → same endpoint opens it; guaranteed rare+ pool. One pending
  at a time. `/state` now returns `pendingCrate`.
- **Crate-in-crate:** 4/6/8/10% by tier; response `bonusRewards`, shown as a
  "CRATE-IN-CRATE BONUS!" section in the reveal modal.
- **Spin bonus drops:** `rollSpinDrop` in spin.js — 10%/spin (15% with
  Lucky Charm): coins 0.5–2× bet added to balance / random catalog card
  inserted / free Elite pull opened on the spot. Response `drop` field;
  frontend toasts it.
- Store UI: 5-crate grid, timed button shows live countdown then pulses
  "OPEN!" when ready.
- **Bug caught in E2E:** the first wiring put `drop: dropInfo` into the
  coinflip response instead of spin (identical closing blocks — edit anchor
  matched the wrong route), which would have ReferenceError'd every flip and
  silently swallowed all drops. Caught because 60 spins produced no drop.
  Lesson: don't anchor edits on duplicate response blocks.
- Tests: 60 backend tests passing (crates + drops suites). Live smoke:
  corrupted roll correct tiers, timed buy→locked→pending in state, bad type
  400, drop fired with crate rewards inserted.

### 2026-08-22 — Sprint: 0–100 High/Low (third game)

- `backend/game/hilo.js` pure module: stateful rounds — server rolls a
  base number (1–100) into the session, player bets strictly higher/lower,
  **ties lose** (house edge #1); payout = fair odds × 0.95, floored to 2
  decimals (house edge #2): outcomes-based, from x0.96 up to **x95** on a
  single-outcome pick. The roll chains into the next round's base.
  Deck-effect policy identical to coinflip: streak bonus + flat synergy
  bonuses apply; payoutMult/playerBoost excluded.
- `POST /api/game/highlow {action:"start"}` (free roll) /
  `{action:"guess", direction, bet}` — bet sanitized, impossible sides
  rejected with 400, guessing without a started round → 400.
- Frontend `HiLo.jsx`: big number tile (green/red border on result),
  Higher/Lower buttons showing live payout multiplier and disabling on
  impossible sides, free "New number" reroll, shared multiplier row.
  Third entry in the game switcher (`🔢 Hi-Lo`).
- Tests: 43 backend tests passing (hilo suite added). Live E2E smoke:
  start→guess→chained guess all correct incl. odds math and balance flow;
  bogus action/bad bet → 400s.
- Gotcha recorded: "lower than 99" has 98 winning outcomes (~0.96x), NOT
  one — single-outcome picks are higher-than-99 / lower-than-2.

### 2026-08-22 — Sprint: input validation + Coin Flip (Phase 2 starts)

- **Input validation** (`backend/game/validate.js`, unit-tested):
  - `/spin` + `/coinflip`: bet must be a positive integer ≤ 1,000,000 (400)
  - `/open-crate`: type enum-checked (400) — no more silent default to basic
  - `/set-deck`: **server-side ownership validation now enforced** — shape
    (≤3 slots, string|null) plus per-card copy counts against the inventory
    table. Was client-trust before; the known exploit is closed
  - auth: username 3–20 chars `[a-zA-Z0-9_]`, password 4–100 chars
- **Coin Flip shipped**:
  - `backend/game/coinflip.js` pure module: 50/50 even money (2x total on
    win). Design decision: deck payoutMult/playerBoost deliberately NOT
    applied (50% × x8 mythic deck would print money vs slots RTP); streak
    bonus and flat `bonusPayout` synergies DO apply. XP: 5 base / +10 win,
    scaled by xpMult/xpBoost. Level-ups reuse `applyLevels`
  - `POST /api/game/coinflip {bet, choice}` route wired like /spin
  - Frontend: `CoinFlip.jsx` (coin spin animation via `coinSpin` keyframes,
    heads/tails pick, own multiplier row sharing parent state), game
    switcher above the machine column (`activeGame` state). Switching away
    from Slots cancels auto-spin. Balance/xp/streak/level-up flow shared
    with slots
- Tests: 35 backend tests passing (validate suite + coinflip suite added).
- E2E smoke verified live: flip pays 210 on first 100-bet win (streak
  bonus), bad bets/choice/unowned deck → 400s with clear errors.
- Verified: lint green, build passes, server boots.

### 2026-08-22 — Sprint: micro-interactions + small debt riders

- **Crate reveal animation:** `openCrate` now has a suspense beat — full-
  screen modal with a shaking 🎁 ("Opening...", ~900ms) before rewards
  appear; cards pop in staggered (`crateShake`/`popIn` keyframes in
  index.css). Balance still updates immediately; inventory/rewards land at
  reveal time.
- **Reel-spin polish:** reel tiles blur/dim/scale down while `spinning`
  (winner glow suppressed during the spin so it only fires on results).
- Debt riders: removed unused `cors` dep from frontend package.json;
  audited for mojibake with a U+FFFD scan — none left in live code (the
  corrupted files were legacy, deleted earlier) — roadmap item closed.
- Verified: lint green (0 errors, same 3 exhaustive-deps warnings), build
  passes. No backend changes.

### 2026-08-22 — Sprint: UI polish (floating wins, count-up, session expiry)

- **Floating win amounts:** winning spins spawn "+$X" that floats up and
  fades over the reels (`floatUp` keyframes in index.css, auto-cleared after
  1.2s). Fires from `finishSpin` when payout > 0.
- **Number count-up:** new `hooks/useCountUp.js` (rAF, ease-out, resumes
  from displayed value if interrupted). HUD balance counts to new value;
  result box payout counts up over 400ms.
- **Session expiry UX:** `authedFetch` wrapper in SlotMachine checks every
  authed call (state/spin/upgrades/crates) for 401 → flips
  `sessionExpired` state → full-screen "Session expired" overlay with
  Back-to-Login button. Callers treat `null` response as bail-out. Logout
  intentionally NOT wrapped (it destroys the session on purpose).
- Verified: lint green (0 errors), build passes. No backend changes.

### 2026-08-22 — Fix: deck builder self-contained after tabs split

Splitting Deck/Inventory into separate tabs broke cross-panel drag-and-drop.
Fix: the **Deck tab now contains everything needed** — deck slots on top,
owned card pool below:

- **Click a pool card → equips to first empty slot** (respects owned copy
  counts; dimmed when all copies are in the deck; green badge shows copies
  equipped). Toast feedback for "deck full" / "no more copies". Also fixes
  mobile, where HTML5 drag never worked.
- **Drag still works** within the panel: pool → specific slot, drag slot
  card off to remove. Click an equipped card to remove it.
- Inventory tab remains as read-only collection browser.
- Note: `/set-deck` on the backend still trusts client-side validation —
  covered by the existing "input validation" roadmap item.

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
