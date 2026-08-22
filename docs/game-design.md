# Game Design & Economy

Distilled from the original design brainstorm (`archive/core-game.md`).
Design targets first, with notes where the live implementation differs.

## Core Concept

A **customizable RNG ecosystem**: gambling games whose odds and payouts are
modified by an equippable deck of utility cards collected from crates.

## Gambling Games

- **Slot machine** — main system (implemented; 5 reels in the current build)
- Coin Flip — planned
- 0–100 High/Low — planned

All games are affected by utility card decks.

## Slot Machine Balance Targets

### Symbol odds (per reel)

| Symbol | Tier    | Chance |
|--------|---------|--------|
| 🍒     | Common  | 35%    |
| 🍋     | Common  | 30%    |
| 🔷     | Rare    | 20%    |
| ⭐     | Epic    | 10%    |
| ⚡     | Jackpot | 5%     |

### Match probabilities & payouts (3-of-a-kind)

| Combo   | Chance   | Payout |
|---------|----------|--------|
| 🍒🍒🍒 | ~4.3%    | 2x     |
| 🍋🍋🍋 | ~2.7%    | 3x     |
| 🔷🔷🔷 | ~0.8%    | 6x     |
| ⭐⭐⭐ | ~0.1%    | 15x    |
| ⚡⚡⚡ | ~0.0125% | 100x   |

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

Utility cards modify RNG, payouts, and rewards. Planned future: battle cards
(same cards, dual purpose).

### The 10 starter utility cards

| Category   | Card              | Effect                                  |
|------------|-------------------|-----------------------------------------|
| Probability | Lucky Charm      | +3% rare symbol chance                  |
| Probability | Reel Bias        | Slightly favors matching symbols        |
| Outcome    | Double Down       | 10% chance to double winnings           |
| Outcome    | Safety Net        | Refund 20% on losses                    |
| Reel       | Sticky Symbols    | Winning symbols stay for 1 spin         |
| Reel       | Bonus Reel        | 5% chance to add an extra reel          |
| Trigger    | Loss Streak Saver | After 3 losses → boosted next spin      |
| Trigger    | Hot Streak        | Consecutive wins increase multiplier    |
| Chaos      | Glitch Engine     | Randomizes outcomes slightly            |
| Chaos      | Jackpot Surge     | Tiny chance for massive payout          |

Some cards also apply to crates (Lucky Charm → better drop rates,
Double Down → extra crate rewards, Glitch Engine → random bonus items).

## Crates

Five types:

| Crate           | Cost (target) | Character                              |
|-----------------|---------------|----------------------------------------|
| 🟡 Basic        | 100           | Mostly common cards                    |
| 🔵 Premium      | 300           | Better odds, some rares                |
| 🟣 Slot Crate   | 500 / drop    | Rare drop from slots, high-value       |
| 🔴 Corrupted    | 700           | High variance: trash 30% / good 50% / insane 20% |
| ⏳ Timed        | 400           | Takes time to open; +5% odds or guaranteed rare+ |

### Drop rate targets

- Basic: common 70% / rare 25% / epic 5%
- Premium: common 40% / rare 45% / epic 13% / legendary 2%
- Slot Crate: rare 40% / epic 40% / legendary 18% / jackpot item 2%

### Slot spin bonus drops (per spin)

Nothing 90% / small coin bonus 7% / slot crate 2.5% / jackpot crate 0.5%

### Special mechanics

- **Crate-in-Crate:** chance to pull another crate
- **Jackpot Drop:** spins can drop coins, cards, or slot crates
- **Corruption:** increased rarity OR chaotic outcomes (crates now, cards later)

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

| Build        | Playstyle               | Key cards                       |
|--------------|-------------------------|---------------------------------|
| High Roller  | Big wins, big losses    | Jackpot Surge, Double Down      |
| Safe Grinder | Consistent small wins   | Safety Net, Lucky Charm         |
| Chaos        | Unpredictable outcomes  | Glitch Engine, corruption       |
| Combo        | Streak-focused          | Hot Streak, Loss Streak Saver   |

## Progression (implemented)

- XP and levels from spins
- Payout boost and XP boost upgrades (purchased with coins)
- Win streaks, daily login streaks, level-up reward claims
- Random events

## Future Expansion

- ⚔️ Battle system — cards become playable units (dual-use)
- 🧬 Card evolution — merge duplicates, mutations
- Coinflip + High/Low games
- All five crate types + modifiers
