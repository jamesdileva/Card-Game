const API = "/api/game";
let spinInterval;
console.log("APP LOADED");

// --- HELPER: normalize any array from API ---
function normalizeArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  return [];
}

// --- RENDER INVENTORY ---
function renderInventory(inventoryArray) {
  const invEl = document.getElementById("inventory");
  console.log("RENDER INVENTORY HIT");
  if (!invEl) {
    console.error("Inventory element missing");
    return;
  }

  invEl.innerHTML = '';

  inventoryArray.forEach(card => {
    if (!card) return;

    const cardEl = document.createElement('div');
    cardEl.classList.add('card');

    const cardId = card.id || card;
    const rarity = card.rarity || 'common';

    cardEl.textContent = cardId;
    cardEl.classList.add(`rarity-${rarity}`);

    cardEl.draggable = true;

    cardEl.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("cardId", cardId);
      console.log("Dragging:", cardId);
    });

    invEl.appendChild(cardEl);
  });
}

async function addCardToDeck(cardId) {
  try {
    const deckData = await fetch(`${API}/deck`).then(r => r.json());
    let deckArray = normalizeArray(deckData, 'deck');

    console.log("Current deck:", deckArray);

    // Replace first "none" instead of blocking
    const emptyIndex = deckArray.findIndex(c => c === null); 

    if (emptyIndex !== -1) {
      deckArray[emptyIndex] = cardId;
    } else {
      document.getElementById("result").innerText = "Deck is full!";
      return;
    }

    console.log("New deck:", deckArray);

    const res = await fetch(`${API}/set-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDeck: deckArray })
    });

    await res.json();

    document.getElementById("result").innerText = "Card added to deck!";
    update();

  } catch (err) {
    console.error("Failed to add card:", err);
  }
}

// --- RENDER DECK ---
function renderDeck(deckArray) {
  const deckEl = document.getElementById("deck");
  deckEl.innerHTML = '';

  deckArray.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card', 'deck-slot');

    if (!card) {
      cardEl.textContent = "+";
      cardEl.classList.add('empty-slot');
    } else {
      const cardId = typeof card === "string" ? card : card.id;

      cardEl.textContent = cardId;

      // 👇 OPTIONAL: fake rarity so it still looks good
      cardEl.classList.add('rarity-common');
    }

    // drag/drop
    cardEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      cardEl.classList.add("hovered");
    });

    cardEl.addEventListener("dragleave", () => {
      cardEl.classList.remove("hovered");
    });

    cardEl.addEventListener("drop", async (e) => {
      e.preventDefault();
      cardEl.classList.remove("hovered");

      const cardId = e.dataTransfer.getData("cardId");
      await replaceDeckSlot(index, cardId);
    });

    deckEl.appendChild(cardEl);
  });
}

// --- VALIDATE DECK ---
function validateDeck(deck, inventoryObj) {
  const counts = {};
  for (const card of deck) {
    if (!card) return false;
    counts[card] = (counts[card] || 0) + 1;
  }
  for (const [card, count] of Object.entries(counts)) {
    if (!inventoryObj[card] || inventoryObj[card] < count) return false;
  }
  return true;
}

// --- SET DECK ---
/**async function setDeck() {
  const newDeck = [
    document.getElementById("card1").value.trim(),
    document.getElementById("card2").value.trim(),
    document.getElementById("card3").value.trim()
  ];

  try {
    const inventoryData = await fetch(`${API}/inventory`).then(r => r.json());
    const inventoryArray = normalizeArray(inventoryData, 'inventory');

    const inventoryObj = {};
    for (const item of inventoryArray) {
      if (!item || !item.id) continue;
      inventoryObj[item.id] = (inventoryObj[item.id] || 0) + 1;
    }

    if (!validateDeck(newDeck, inventoryObj)) {
      document.getElementById("result").innerText = "Invalid deck: duplicates or cards you don't own";
      return;
    }

    const res = await fetch(`${API}/set-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDeck })
    });
    const data = await res.json();
    document.getElementById("result").innerText = JSON.stringify(data, null, 2);

    update();
  } catch (err) {
    console.error(err);
    document.getElementById("result").innerText = "Error setting deck. See console for details.";
  }
} **/

// --- SPIN FUNCTIONS ---
async function spin() {
  const spinBtn = document.getElementById("spin-btn");
  spinBtn.disabled = true;

  const balance = parseInt(document.getElementById("balance").innerText.replace(/\D/g,''), 10);
  if (balance < 100) {
    document.getElementById("result").innerText = "Not enough balance!";
    spinBtn.disabled = false;
    return;
  }

  stopSpinAnimation();
  startSpinAnimation();

  try {
    const res = await fetch(`${API}/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet: 100 })
    });
    const data = await res.json();

    if (data.error) {
      document.getElementById("result").innerText = data.error;
      spinBtn.disabled = false;
      return;
    }

    setTimeout(() => {
      stopSpinAnimation();

      const symbols = {
        cherry: "🍒", lemon: "🍋", orange: "🍊",
        grape: "🍇", bar: "🔲", seven: "7️⃣",
        diamond: "💎", star: "⭐"
      };
      const reels = normalizeArray(data.reels);
      const getSymbol = s => symbols[s] || "❓";

      document.getElementById("slot-reels").innerHTML =
        reels.map(s => `<span class="glow">${getSymbol(s)}</span>`).join(' ');

      document.getElementById("balance").innerText = `Balance: $${data.balance}`;
      document.getElementById("result").innerText = `Payout: ${data.payout}`;

      update();
      spinBtn.disabled = false;
    }, 1000);

  } catch (err) {
    console.error(err);
    spinBtn.disabled = false;
  }
}

function startSpinAnimation() {
  const fakeSymbols = ["🍒","🍋","🍊","🍇","🔲","7️⃣","💎","⭐"];
  spinInterval = setInterval(() => {
    const r = Array.from({length:3}, () => fakeSymbols[Math.floor(Math.random() * fakeSymbols.length)]);
    document.getElementById("slot-reels").innerText = r.join(" ");
  }, 100);
}

function stopSpinAnimation() {
  clearInterval(spinInterval);
}

// --- OPEN CRATE ---
async function openCrate(type) {
  try {
    const res = await fetch(`${API}/open-crate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });
    const data = await res.json();

    if (data.error) {
      document.getElementById("result").innerText = data.error;
      return;
    }

    const rewards = normalizeArray(data, 'rewards');
    const rewardText = rewards.map(r => `${r.id} (${r.rarity || 'unknown'})`).join("\n") || "No rewards";

    document.getElementById("result").innerText = `Opened ${type} crate:\n${rewardText}`;
    if (data.balance !== undefined) {
      document.getElementById("balance").innerText = `Balance: $${data.balance}`;
    }

    update();
  } catch (err) {
    console.error(err);
    document.getElementById("result").innerText = "Error opening crate. See console for details.";
  }
}

// --- UPDATE UI ---
async function update() {
  console.log("CALLING RENDER");
  try {
    const [invRes, deckRes] = await Promise.all([
      fetch(`${API}/inventory`),
      fetch(`${API}/deck`)
    ]);

    const invData = await invRes.json();
    const deckData = await deckRes.json();

    const inventoryArray = invData.inventory || [];
    const deckArray = deckData.deck || [];

    console.log("Inventory:", inventoryArray);
    console.log("Deck:", deckArray);

    renderInventory(inventoryArray);
    renderDeck(deckArray);

  } catch (err) {
    console.error("Update failed:", err);
  }
}

// --- LOAD GAME ---
async function loadGame() {
  try {
    const res = await fetch(`${API}/state`);
    const data = await res.json();

    document.getElementById("balance").innerText =
      `Balance: $${data.balance || 0}`;

    // ❌ REMOVE old JSON rendering
    // document.getElementById("inventory").innerText = ...
    // document.getElementById("deck").innerText = ...

    update(); // ✅ this handles rendering now

  } catch (err) {
    console.error("Failed to load game:", err);
  }
}
async function replaceDeckSlot(slotIndex, cardId) {
  try {
    // get current deck + inventory
    const [deckData, invData] = await Promise.all([
      fetch(`${API}/deck`).then(r => r.json()),
      fetch(`${API}/inventory`).then(r => r.json())
    ]);

    let deckArray = normalizeArray(deckData, 'deck');
    const inventoryArray = normalizeArray(invData, 'inventory');

    // 🔥 count how many of this card exist in inventory
    const ownedCount = inventoryArray.filter(c => c.id === cardId).length;

    // 🔥 count how many already in deck
    const currentDeckCount = deckArray.filter(c => c === cardId).length;

    // 🔥 if replacing same slot, ignore that slot
    const isReplacingSameCard = deckArray[slotIndex] === cardId;
    const adjustedDeckCount = isReplacingSameCard
      ? currentDeckCount - 1
      : currentDeckCount;

    if (adjustedDeckCount >= ownedCount) {
      document.getElementById("result").innerText =
        `You only own ${ownedCount} copy(s) of ${cardId}`;
      return;
    }

    // ✅ allowed → update deck
    deckArray[slotIndex] = cardId;

    const res = await fetch(`${API}/set-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDeck: deckArray })
    });

    await res.json();

    document.getElementById("result").innerText =
      `Placed ${cardId} in slot ${slotIndex + 1}`;

    update();

  } catch (err) {
    console.error("Replace slot failed:", err);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  // --- BUTTONS ---
  document.getElementById("spin-btn").addEventListener("click", spin);

  document.querySelectorAll(".btn-crate").forEach(btn => {
    btn.addEventListener("click", () => openCrate(btn.dataset.crate));
  });
  loadGame();
});

