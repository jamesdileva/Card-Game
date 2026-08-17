# Card Slot Game


A hybrid game that combines slot machine mechanics, collectible cards, deck building, and card-based modifiers.


---


## Features


- 🎰 Slot machine with animated reels
- 🃏 Collectible cards with rarity tiers
- 📦 Crates that award random cards
- 🧩 3-card deck building system
- ✨ Card effects that modify payouts and odds
- 💾 Persistent save system
- 🌐 Full-stack architecture (Frontend + Backend + Database)


---


## Tech Stack


### Frontend
- HTML / CSS / JavaScript (or React if using the separate frontend deployment)


### Backend
- Node.js
- Express


### Database
- Supabase (production)
- Local JSON or local development database (optional)


### Deployment
- Vercel (frontend)
- Render (backend)
- Supabase (database)


---


## Project Architecture


```text
Frontend (Vercel / Local Dev Server)
        ↓ HTTP API Calls
Backend API (Render / Local Node.js)
        ↓ Database Queries
Supabase
```


---


## Core Gameplay Loop


```text
Spin Slot Machine
      ↓
Earn Credits
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


---


## Repository Structure


```text
project/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── services/
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── .env
│
└── README.md
```


---


## Data Model


### Game State


```json
{
  "balance": 1000,
  "inventory": [
    { "id": "lucky_charm", "rarity": "common" },
    { "id": "double_down", "rarity": "rare" }
  ],
  "deck": ["lucky_charm", "double_down", "reroll"]
}
```


### Inventory Count Map (used for validation)


```json
{
  "lucky_charm": 2,
  "double_down": 1
}
```


---


## API Endpoints


Base URL:


```text
/api/game
```


### GET `/state`
Returns full game state.


### GET `/inventory`
Returns owned cards.


### GET `/deck`
Returns active deck.


### POST `/spin`


Request:


```json
{ "bet": 100 }
```


Response:


```json
{
  "reels": ["seven", "seven", "seven"],
  "payout": 500,
  "balance": 2400
}
```


### POST `/open-crate`


Request:


```json
{ "type": "basic" }
```


### POST `/set-deck`


Request:


```json
{
  "newDeck": ["lucky_charm", "double_down", "reroll"]
}
```


---


## Local Development


### Backend


```bash
cd backend
npm install
npm run dev
```


Runs at:


```text
http://localhost:3000
```


### Frontend


```bash
cd frontend
npm install
npm run dev
```


Runs at:


```text
http://localhost:5173
```


### Open in Browser


```text
http://localhost:5173
```


---


## Frontend Environment Variables


Create `frontend/.env`:


```env
VITE_API_URL=http://localhost:3000
```


---


## Backend Environment Variables


Create `backend/.env`:


```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```


---


## Production URLs


### Frontend
Hosted on Vercel.


### Backend
Hosted on Render.


### Database
Hosted on Supabase.


---


## Key JavaScript Concepts Used


- `async / await`
- `fetch()`
- `Promise.all()`
- `setInterval()`
- `setTimeout()`
- `DOMContentLoaded`


---


## Deck Validation Rules


A valid deck must:


1. Contain exactly 3 cards.
2. Have no empty slots.
3. Use only cards you own.
4. Not use more copies than you possess.


Example:


Inventory:
- lucky_charm ×2
- double_down ×1


Valid:
- lucky_charm
- lucky_charm
- double_down


Invalid:
- double_down
- double_down
- double_down


---


## Card Effect System


Each card modifies the spin result.


Examples:


| Card | Effect |
|------|--------|
| lucky_charm | Improves odds |
| double_down | Doubles payout |
| reroll | Re-rolls weak outcomes |
| jackpot_boost | Increases jackpot payouts |


Execution flow:


```text
Spin Result
   ↓
Apply Card 1
   ↓
Apply Card 2
   ↓
Apply Card 3
   ↓
Final Payout
```


---


## Common Bugs and Fixes


### `await is only valid in async functions`
Ensure all `await` calls are inside `async function`.


### `inventory.filter is not a function`
Your inventory is likely an array of objects or a count map, not a plain array of strings.


### Spin animation speeds up indefinitely
Call `clearInterval()` before starting a new interval and disable the spin button while spinning.


### Invalid deck despite owning cards
Convert inventory array into a `{ cardId: count }` object before validation.


---


## Testing Checklist


### Spin
- Deducts bet
- Returns reels
- Applies card effects
- Updates balance


### Crates
- Costs credits
- Awards cards


### Deck
- Rejects missing cards
- Rejects too many duplicates
- Accepts valid cards


### Persistence
- State remains after restarting


---


## Roadmap


### Phase 1 — Stable MVP
- Core slot machine
- Crates
- Inventory
- Deck validation


### Phase 2 — Better UX
- Dropdown card selectors
- Card icons
- Improved animations


### Phase 3 — More Content
- 50+ cards
- Additional crate tiers
- Achievements


### Phase 4 — Desktop App
- Electron packaging


### Phase 5 — Commercial Release
- Steam release
- Cloud saves
- Leaderboards


---


## Monetization Ideas


- Cosmetic themes
- Card skins
- Premium soundtrack
- Steam sales


---


## Why This Project Matters


This project teaches:


- Frontend development
- Backend APIs
- Database integration
- State management
- Randomized systems
- Game design
- Debugging
- Deployment
- Product thinking


These skills transfer directly to:
- SaaS applications
- Desktop apps
- Mobile apps
- Games
- Real-world software products


---


## Catch-Up Guide


If you return after several months:


1. Read this README.
2. Start backend and frontend locally.
3. Open the app and test:
   - Spin
   - Open crates
   - Set deck
4. Review API endpoints.
5. Review roadmap and choose the next feature.


---


## Recommended Next Improvement


Replace manual card ID text inputs with dropdown menus populated from owned cards.


Benefits:
- Prevents typos
- Eliminates invalid IDs
- Improves usability significantly


---


## License


MIT License



