# Game Design & Economy

Distilled from the original design brainstorm (`archive/core-game.md`).
Design targets first, with notes where the live implementation differs.

## Core Concept

A **customizable RNG ecosystem**: gambling games whose odds and payouts are
modified by an equippable deck of utility cards collected from crates.

## Gambling Games

- **Slot machine** — main system (5 reels in the current build)
- **Coin Flip** — shipped: 50/50 pick, even money (2× total return on win).
  Deck payout multipliers / player boosts do NOT apply (would break even
  odds); streak bonus and flat synergy bonuses do
- **0–100 High/Low** — shipped: free base roll 1–100, bet strictly
  higher/lower; **ties lose**. Payout is fair odds × 0.95 (up to 95× on a
  single-outcome pick); impossible sides rejected. Same deck-effect policy
  as Coin Flip

All games are affected by utility card decks.

## Slot Machine Balance (as implemented)

### Reels and base payout

5 reels, 8 symbols each rolled uniformly: cherry, lemon, orange, grape,
clover, gem, star, crown. Base payout (at bet 100) is by unique-symbol
count — fewer unique symbols pay more:

| Unique symbols | Base payout |
|----------------|-------------|
| 1 (all match)  | 1000        |
| 2              | 500         |
| 3              | 200         |
| 4–5            | 0 (loss, may trigger reroll) |

The payout chain then applies, in order: bet scaling → deck multiplier →
player boost → win-streak bonus → synergy flat bonus → jackpot surge proc
(winning spins may pay ×5) → DOUBLE_PAYOUT event doubling.

Luck (`lucky_charm`, `wild_symbol`, Chaos Engine…) works two ways: after
the roll, up to 12% chance to harmonize one reel toward another (fewer
uniques), and it widens the spin bonus-drop window below.

### Random events (15% per spin)

💰 DOUBLE_PAYOUT (winnings ×2) · ⚡ DOUBLE_XP (XP ×2) · 🍀 LUCK SURGE
(+50% Luck this spin). Events never mutate the displayed deck effects.

### RTP target

90–94%. The player loses ~6–10% per spin over time but wins often enough to
feel rewarded. Crate drops, login rewards, and level-up rewards offset the
house edge.

### Card power rule

Deck effects must never break the economy:

- Max total deck advantage: **+10–15% effective RTP shift**
- Example: base jackpot chance 0.0125% → up to ~0.02–0.03% with cards
- Power levels by rarity: Common +1–2%, Rare +2–4%, Epic +5–7%,
  Legendary +8–10%
- Effects use diminishing returns / hard caps — no infinite stacking

## Card System

Utility cards modify RNG, payouts, and rewards. The 3-card deck's effects
stack; combinations unlock set bonuses.

> Full code-accurate reference (all cards, all 16 sets, evolution /
> mutation / corruption): [cards-and-sets.md](cards-and-sets.md). The table
> below is the original design sketch — several listed cards were never
> implemented; treat the new page as canonical.

### Card catalog and sets

See [cards-and-sets.md](cards-and-sets.md) — the table that used to live
here described pre-implementation design concepts (Reel Bias, Sticky
Symbols, Bonus Reel, Loss Streak Saver, Glitch Engine were never built)
and has been retired in favor of the code-accurate reference.

## Crates

Five types (2 picks each; all can contain a bonus crate-in-crate):

| Crate           | Cost | Pool                         | Crate-in-crate |
|-----------------|------|------------------------------|----------------|
| 🟡 Basic        | 100  | common/common/rare           | 4%             |
| 🔵 Premium      | 250  | common/rare/epic             | 6%             |
| 🟣 Elite        | 500  | rare/epic/legendary          | 8%             |
| 🔴 Corrupted    | 700  | Trash 30% (1 common) / high tier 50% (rares+epics) / insane 20% (legendaries); each reward 35% to be a corrupted variant (×2 effect, −XP while equipped) | 10% |
| ⏳ Timed        | 400  | Guaranteed rare+ (rare/rare/epic/legendary); unlocks 2 min after purchase, one timed pending at a time (free bonus pulls stack alongside) | 10% |

### Slot spin bonus drops (per spin)

Nothing ~90% / coins ~7% (0.5–2× bet) / random card ~2% / free Elite
pull ~1%. Deck Luck shifts up to +8 points from "nothing" into drops.

### Special mechanics

- **Crate-in-crate:** chance to pull another crate (rates above)
- **Jackpot Drop:** spins can drop coins, cards, or a free Elite pull
- **Corruption:** corrupted-crate rewards roll corrupted variants (see
  [cards-and-sets.md](cards-and-sets.md))

## Currency Flow Model

Target loop: gamble → earn → open crates → improve deck → gamble better.

Example: player starts with 1,000 coins, bets 50/spin. After 20 spins expect
~900–940 coins from pure RTP, offset by crate drops, login streaks, and
level-up rewards so the net experience feels balanced.

## Hidden Systems (design intent)

- **Near miss:** show almost-winning visuals slightly more often *without*
  changing actual odds
- **Streak smoothing:** dampen extreme win/loss runs

> Implementation note: verify whether these are actually implemented before
> relying on them; the spin pipeline lives in `backend/routes/gameRoutes.js`.

## Build Archetypes

| Build        | Playstyle               | Key cards / sets                              |
|--------------|-------------------------|-----------------------------------------------|
| High Roller  | Big wins, big losses    | Mythic Multiplier, Jackpot Surge, Vault Buster |
| Safe Grinder | Consistent small wins   | Safety Net, Reroll, Safety Inspector          |
| Chaos        | Unpredictable outcomes  | Wild Symbol, Jackpot Surge, Chaos Engine, corruption |
| Combo        | Streak-focused          | Hot Streak, Multiplier Chain, Steady Burn     |

## Progression (implemented)

- XP and levels from spins
- Payout boost and XP boost upgrades (purchased with coins)
- Win streaks, daily login streaks, level-up reward claims
- Random events

## Future Expansion

- ⚔️ Battle system — cards become playable units (dual-use)
