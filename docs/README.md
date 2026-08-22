# Documentation Index

| Doc | Contents |
|-----|----------|
| [architecture.md](architecture.md) | System structure, data flow, database schema, deployment |
| [game-design.md](game-design.md) | Slot odds/RTP, cards, crates, economy balance, build archetypes |
| [api.md](api.md) | HTTP API reference (as implemented) |
| [roadmap.md](roadmap.md) | Known debt/bugs + feature phases |
| [integration.md](integration.md) | Sentinel integration checklist & facts |
| [archive/](archive/) | Superseded docs kept for reference |

## Core Gameplay Loop

```
Spin Slot Machine
      ↓
Earn Coins (+ XP, streaks, random events)
      ↓
Open Crates
      ↓
Collect Cards
      ↓
Build Deck (3 cards)
      ↓
Cards Modify Future Spins
      ↓
Repeat
```

## Mental Model

```
Frontend = sends requests, renders the slot machine and inventory
Backend  = applies rules, computes RNG, persists state in SQLite
Cards    = modify spin odds / payouts / XP
Deck     = the 3 active cards whose effects stack
Crates   = card acquisition (randomized rewards)
Balance  = currency spent on spins, crates, upgrades
```

## Historical Docs

The original design brainstorm and architecture notes were written before the
PostgreSQL → SQLite migration and before the React rewrite. They are preserved
in [archive/](archive/) but describe outdated structures — do not use them as
a reference for the current code.
