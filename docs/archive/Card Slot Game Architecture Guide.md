# **Card Slot Game — Architecture & Learning Guide** 

A long-term reference document for understanding, maintaining, and extending the Card Slot Game project. 

# **1. Project Overview** 

## **Purpose** 

The Card Slot Game combines: 

1. **Slot Machine Mechanics** — The player spends credits to spin slot reels. 

2. **Collectible Cards** — Crates award cards with rarities and effects. 

3. **Deck Building** — The player selects three owned cards. 

4. **Card Effects** — Selected cards modify slot outcomes and payouts. 

This creates a hybrid game where randomness and strategy work together. 

# **2. Core Gameplay Loop** 

```
Earn Balance
   ↓
Buy/Open Crates
   ↓
Receive Cards
   ↓
Build Deck (3 cards)
   ↓
Spin Slot Machine
   ↓
Card Effects Modify Spin
   ↓
Win More Credits
   ↓
Repeat
```

1 

# **3. High-Level Architecture** 

```
Browser (Frontend)
 ├── index.html
 ├── style.css
 └── app.js
         ↓ HTTP API Calls
Node.js + Express Server
 ├── Routes
 ├── Game Engine
 ├── Card Effect Engine
 └── Save/Load System
```

```
         ↓
JSON Save File
```

# **4. Frontend Files** 

## **<mark>`index.html`</mark>** 

Defines the structure: 

- Balance display • Slot reels • Spin button • Crate buttons • Deck inputs • Result area • Inventory display • Deck display 

## **<mark>`style.css`</mark>** 

Defines appearance: 

- Colors • Layout • Buttons • Typography 

2 

## **<mark>`app.js`</mark>** 

Controls all browser behavior: 

• API calls • Button events • Slot animations • Deck validation • Updating the UI 

# **5. Backend Files (Typical Structure)** 

```
server.js
routes/
  gameRoutes.js
services/
  slotEngine.js
  cardEngine.js
  crateEngine.js
  saveService.js
data/
  cards.json
save/
  gameState.json
public/
  index.html
  style.css
  app.js
```

# **6. Data Model** 

## **Game State** 

```
{
"balance":1000,
"inventory":[],
"deck":["none","none","none"]
}
```

3 

### **Fields** 

|Field|Description|
|---|---|
|balance|Player credits|
|inventory|Owned card objects|
|deck|Active card IDs|



## **Inventory Item** 

```
{
"id":"double_down",
"rarity":"rare",
"weight":25
}
```

### **Fields** 

|Field|Description|
|---|---|
|id|Unique card identifer|
|rarity|common / rare / epic / legendary|
|weight|Used in random selection|



## **Deck** 

`["lucky_charm", "double_down", "reroll"]` Contains exactly three card IDs. 

# **7. API Endpoints** 

Base path: 

```
/api/game
```

4 

## **GET** **<mark>`/state`</mark>** 

Returns complete game state. 

## **GET** **<mark>`/inventory`</mark>** 

Returns owned cards. 

## **GET** **<mark>`/deck`</mark>** 

Returns active deck. 

## **POST** **<mark>`/spin`</mark>** 

Request: 

```
{"bet":100}
```

Response: 

```
{
"reels":["seven","seven","seven"],
"payout":500,
"balance":2400
}
```

## **POST** **<mark>`/open-crate`</mark>** 

Request: 

```
{"type":"basic"}
```

## **POST** **<mark>`/set-deck`</mark>** 

Request: 

```
{
"newDeck":["lucky_charm","double_down","reroll"]
}
```

5 

# **8. Frontend Flow** 

## **Application Startup** 

```
Browser loads index.html
    ↓
style.css applied
    ↓
app.js loaded
    ↓
DOMContentLoaded
    ↓
Event listeners attached
    ↓
loadGame()
    ↓
GET /api/game/state
    ↓
UI populated
```

## **Spin Flow** 

```
Click Spin
    ↓
Disable spin button
    ↓
Check balance >= 100
    ↓
Start reel animation
    ↓
POST /spin
    ↓
Server computes result
    ↓
Wait 1 second
    ↓
Stop animation
    ↓
Show symbols
    ↓
Update balance
```

6 

```
    ↓
Refresh inventory/deck
    ↓
Enable spin button
```

## **Set Deck Flow** 

```
User enters 3 card IDs
    ↓
Fetch inventory
    ↓
Convert inventory to counts
    ↓
Validate ownership
    ↓
POST /set-deck
    ↓
Refresh UI
```

# **9. Backend Flow** 

## **Spin Request** 

```
Receive bet
    ↓
Check balance
    ↓
Subtract bet
    ↓
Generate reel symbols
    ↓
Calculate base payout
    ↓
Apply card effects
    ↓
Add payout to balance
    ↓
Save game state
```

7 

```
    ↓
Return result
```

# **10. Card System** 

## **Card Definition** 

A card is a modular gameplay modifier. 

Examples: 

|Card|Efect|
|---|---|
|lucky_charm|Improves odds|
|double_down|Doubles payout|
|reroll|Re-rolls poor spins|
|jackpot_boost|Increases jackpot rewards|



## **Card Engine Pattern** 

```
Spin Result
    ↓
For each card in deck
    ↓
Apply effect
    ↓
Return modified result
```

This allows effects to stack. 

# **11. Inventory Representation** 

## **API Format** 

Your inventory endpoint currently returns an array of objects: 

8 

```
[
{"id":"lucky_charm"},
{"id":"double_down"},
{"id":"lucky_charm"}
]
```

## **Validation Format** 

Converted to: 

```
{
"lucky_charm":2,
"double_down":1
}
```

This makes ownership checks simple. 

# **12. Deck Validation Logic** 

## **Goal** 

Ensure: 

1. All 3 slots are filled. 

2. Player owns each card. 

3. Duplicate usage does not exceed owned copies. 

## **Example** 

Inventory: 

```
{
"lucky_charm":2,
"double_down":1
}
```

Valid deck: 

```
["lucky_charm","lucky_charm","double_down"]
```

9 

Invalid deck: 

- `["double_down", "double_down", "double_down"]` 

# **13. Slot Machine Concepts** 

## **Reels** 

Each spin generates three symbols. 

Example: 

- `["seven", "seven", "seven"]` 

## **Payout Table** 

|Combination|Payout|
|---|---|
|seven seven seven|500|
|diamond diamond diamond|300|
|any 3 matching symbols|variable|



# **14. Randomness and Weighted Selection** 

## **Weight Concept** 

Higher weight = more likely. 

Example: 

|Card|Weight|
|---|---|
|lucky_charm|50|
|double_down|25|
|jackpot_boost|5|



10 

# **15. Save System** 

## **Purpose** 

Persists progress between sessions. 

## **Storage** 

JSON file on disk. 

## **Save Triggers** 

- After spin • After opening crate 

- After setting deck 

# **16. UI Rendering Strategy** 

The frontend uses: 

```
innerText=JSON.stringify(data,null,2)
```

Advantages: 

- Fast to build 

- Great for debugging 

Future improvement: 

- Replace raw JSON with cards, icons, and styled panels. 

# **17. Error Handling** 

## **Frontend** 

Display errors in the Result panel. 

11 

## **Backend** 

Return: 

```
{"error":"Not enough balance"}
```

# **18. Common Bugs and Fixes** 

## **Runaway Spin Animation** 

Cause: multiple <mark>`setInterval()`</mark> timers. Fix: 

- <mark>`clearInterval()`</mark> before starting a new one. 

- Disable spin button while spinning. 

## **Duplicate Deck Functions** 

Cause: multiple definitions in <mark>`app.js` .</mark> Fix: 

- Keep only one function per name. 

## **<mark>`await`</mark> Outside Async Function** 

Cause: misplaced code. Fix: 

- Ensure all <mark>`await`</mark> calls are inside <mark>`async function` .</mark> 

## **Inventory Format Mismatch** 

Cause: array vs object count map. Fix: 

• Convert inventory array into <mark>`{ cardId: count }` .</mark> 

# **19. JavaScript Concepts Used** 

## **<mark>`async`</mark> /** **<mark>`await`</mark>** 

Allows asynchronous code to read like synchronous code. 

12 

## **<mark>`fetch()`</mark>** 

Makes HTTP requests. 

## **<mark>`Promise.all()`</mark>** 

Runs multiple requests in parallel. 

## **<mark>`setInterval()`</mark>** 

Repeats animation updates. 

## **<mark>`setTimeout()`</mark>** 

Delays a callback. 

## **<mark>`DOMContentLoaded`</mark>** 

Runs setup after the HTML is loaded. 

# **20. Design Principles** 

## **Separation of Concerns** 

|Layer|Responsibility|
|---|---|
|HTML|Structure|
|CSS|Presentation|
|JS|Behavior|
|Backend|Business logic|
|Save File|Persistence|



## **Single Responsibility** 

Each function should do one job. 

## **Data Validation** 

Never trust user input. 

13 

# **21. Why This Project Is Valuable** 

This project teaches: 

- HTML/CSS/JavaScript • Node.js and Express 

- REST APIs • State management • Random systems • Game design • Debugging • Save/load architecture • Modular programming 

# **22. Recommended Next Improvements** 

## **UI Improvements** 

- Dropdowns for owned cards 

- Card icons 

- Better animations 

- Mobile responsiveness 

## **Gameplay Improvements** 

- More cards 

- Synergies 

- Prestige system 

- Daily rewards 

- Achievements 

## **Technical Improvements** 

- TypeScript 

- Unit tests 

- Database (SQLite) 

- Electron desktop app • Cloud save 

14 

# **23. Long-Term Vision** 

## **Version 1.0** 

Core slot + cards + crates. 

## **Version 2.0** 

Beautiful UI and more content. 

## **Version 3.0** 

Desktop app with Electron. 

## **Version 4.0** 

Online leaderboards and cloud sync. 

## **Version 5.0** 

Commercial indie game. 

# **24. Monetization Ideas** 

- Premium themes 

- Cosmetic card skins 

- Steam release • Mobile app 

- Optional cloud account 

# **25. Testing Checklist** 

## **Spin** 

- Deducts balance • Shows symbols • Applies card effects 

15 

## **Crates** 

• Costs balance • Awards cards 

## **Deck** 

• Rejects missing cards • Accepts valid cards 

## **Save System** 

• Progress persists after restart 

# **26. Example Learning Milestones** 

## **Beginner** 

• Understand <mark>`fetch()`</mark> and async functions. 

## **Intermediate** 

• Build new API endpoints. 

## **Advanced** 

• Refactor into modules and classes. 

## **Professional** 

- Add tests and deployment automation. 

# **27. Suggested Refactor Structure** 

```
public/
  index.html
  style.css
  app.js
server/
  routes/
```

16 

```
  services/
  models/
  utils/
  data/
  saves/
```

# **28. Card Ideas Roadmap** 

## **Economy Cards** 

- interest • cashback • rebate 

## **Probability Cards** 

- weighted_dice • lucky_streak 

## **Risk Cards** 

• all_in • cursed_coin 

## **Combo Cards** 

• triple_seven_boost 

# **29. Architectural Strengths of This Project** 

• Clear frontend/backend separation 

- Easy to extend card system 

- Save-based persistence 

- Lightweight deployment 

- Great learning platform 

17 

# **30. Personal Catch-Up Guide** 

When returning after months: 

1. Read this document. 

2. Open <mark>`index.html`</mark> to understand UI structure. 

3. Open <mark>`app.js`</mark> to understand browser logic. 

4. Open server files to review API endpoints. 

5. Run the app and test: 

6. Spin 

7. Open crate 

8. Set deck 

9. Review future roadmap. 

# **31. Quick Mental Model** 

```
Frontend = Sends requests and updates screen
Backend = Applies rules and saves state
Cards = Modify slot behavior
Deck = Active modifiers
Inventory = Owned cards
Balance = Currency
Crates = Card acquisition
```

# **32. Priority Roadmap** 

## **Phase 1 — Stable MVP** 

- Fix bugs • Validate deck • Save state 

## **Phase 2 — Better UX** 

- Dropdown card selector • Pretty inventory cards 

18 

## **Phase 3 — More Content** 

- 50+ cards • More crates 

## **Phase 4 — Desktop App** 

- Electron packaging 

## **Phase 5 — Monetization** 

- Steam release 

# **33. Most Important Lessons** 

1. Keep data formats consistent. 

2. Validate on both client and server. 

- Avoid duplicate function definitions. 

3. 

4. Separate structure, style, and behavior. 

5. Build small and iterate. 

6. Save often. 

7. Make systems modular. 

# **34. Final Summary** 

This project is more than a small game. 

It is a practical training ground for: 

- Full-stack web development 

- Game system design 

- API architecture 

- State management 

- Debugging 

- Product thinking 

By continuing to improve this project, you are building skills directly transferable to: 

- SaaS applications 

- Desktop apps 

- Mobile apps 

- Commercial games 

- Real-world software products 

19 

# **35. Next Recommended Step** 

The highest-value next improvement is: 

#### **Replace manual card ID text inputs with dropdown menus populated from owned inventory.** 

Benefits: 

- Prevents typos 

- Eliminates invalid IDs 

- Makes deck building intuitive 

- Greatly improves usability 

_End of Architecture & Learning Guide._ 

20 

