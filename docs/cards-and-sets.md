# Card Catalog & Set Bonuses

Player-facing reference for the deck builder. Numbers match the
implementation (`backend/game/cards.js`, `backend/game/effects.js`, and the
in-game hover tooltips); a test (`backend/test/docs.test.js`) fails if a card
or set is missing from this page, so it cannot silently fall behind the code.

Your deck holds **3 cards**. Per-card effects stack additively; equipping
certain combinations (or multiples) unlocks the set bonuses below on top.

## Card catalog

| Card | ID | Rarity | Equipped effect | Crate weight |
|------|----|--------|-----------------|--------------|
| Lucky Charm | `lucky_charm` | common | +10% Luck — nudges reels toward matches, widens bonus-drop odds | 50 |
| Reroll | `reroll` | common | +25% chance to re-roll a losing spin | 50 |
| Double Down | `double_down` | rare | +50% payout multiplier | 25 |
| Jackpot Boost | `jackpot_boost` | rare | +100% payout multiplier | 25 |
| Safety Net | `safety_net` | rare | Refunds 20% of bet on losing spins (never counts as a win; total refund capped at 50% of bet) | 25 |
| Wild Symbol | `wild_symbol` | epic | +30% Luck | 10 |
| Multiplier Chain | `multiplier_chain` | epic | +20% payout multiplier | 10 |
| Hot Streak | `hot_streak` | epic | Win-streak bonus rate +2% per win | 10 |
| Mythic Multiplier | `mythic_multiplier` | legendary | +200% payout multiplier | 2 |
| Jackpot Surge | `jackpot_surge` | legendary | +3% chance a winning spin pays ×5 (total surge chance capped at 15%) | 2 |

Rarity ladder for evolution and crates: common → rare → epic → legendary.

## Set bonuses

Equipped combinations unlock these automatically; active sets show in the
purple synergy strip (hover it for this same breakdown in game).

### Pair sets

| Set | Required cards | Effect |
|-----|----------------|--------|
| 🍀 Lucky Jackpot | Lucky Charm + Jackpot Boost | payout ×1.5, +10% Luck |
| 🔁 Chain Reroll | Reroll + Multiplier Chain | +20% reroll chance, payout ×1.3 |
| 💥 Mythic Double | Double Down + Mythic Multiplier | payout ×2 |

### Count sets (multiples of one card)

| Set | Required cards | Effect |
|-----|----------------|--------|
| Triple Mythic | 3× Mythic Multiplier | payout +7x, +20% Luck |
| 🍀 Lucky Pair | 2× Lucky Charm | +30% reroll chance |
| 🔁 Reroll Engine | 2× Reroll | +50% reroll chance |

### Mixed sets

| Set | Required cards | Effect |
|-----|----------------|--------|
| ✨ Luck Engine | Lucky Charm + Reroll | +25% reroll chance, +20% Luck |
| ⛓️ Chain Scaling | 2× Multiplier Chain | payout +1x, XP gain +50% |
| 🃏 Wild Surge | 2× Wild Symbol | +$300 flat bonus on winning spins |
| 👑 Jackpot Overload | 2× Jackpot Boost | payout +2x |

### God tier

| Set | Required cards | Effect |
|-----|----------------|--------|
| 💀 GOD BUILD | Mythic Multiplier + Jackpot Boost + Multiplier Chain | payout ×2, +50% Luck |

### Archetype sets

| Set | Required cards | Effect |
|-----|----------------|--------|
| 🛡️ Safety Inspector | Safety Net + Reroll | refund +12% of bet, +15% reroll chance |
| 🔥 Surge Rider | Hot Streak + Jackpot Surge | surge chance +3%, streak rate +1% |
| 💰 Vault Buster | Jackpot Boost + Jackpot Surge | payout ×1.5 |
| 🌪️ Chaos Engine | Wild Symbol + Jackpot Surge | +40% Luck |
| 🧯 Steady Burn | Safety Net + Hot Streak | refund +5% of bet, streak rate +2% |

## Evolution, mutations, corruption

- **Evolution:** merge 3 owned copies of a card (✨ Evolve button in the
  Inventory tab) into 1 random card of the next rarity. Legendary is
  terminal and cannot evolve.
- **Mutations:** the evolved card rolls a ✦ variant bonus of +5–25%. A
  mutated copy empowers **every copy of that card id in any deck**
  (each per-card contribution × the mutation). Badges show in deck,
  inventory, and crate reveals.
- **Corruption:** rewards from corrupted crates may be corrupted variants
  (35% chance per reward). An equipped corrupted card amplifies its
  contributions ×2 (combined mutation×corruption factor capped at ×4),
  but each corrupted deck slot taxes XP gains −15% (floored at half).
  Corrupted cards show a red ring and a ☠️ badge.

## Seeing it in game

- Hover any card for its effect text (plus ✦/☠️ notes).
- Hover the purple synergy strip for your active sets: name ·
  required cards · effect.
- Hover the DECK / BOOST / XP / Luck tiles for what each stat means.
