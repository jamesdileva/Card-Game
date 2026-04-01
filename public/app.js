const API = "/api/game";
let spinInterval;

console.log("APP LOADED");

// --- HELPER ---
function normalizeArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  return [];
}

// --- SAFE FETCH (returns JSON) ---
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);

    if (res.status === 401) {
      window.location.href = "/login.html";
      return null;
    }
    if (!res.ok) {
      console.error("Bad response:", res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("Fetch failed:", err);
    return null;
  }
}
// LOG OUT 
async function logout() {
  await safeFetch("/api/auth/logout");
  window.location.href = "/login.html";
}
// ADD BALANCE DEV TOOL 
async function addBalance() {
  await safeFetch("/api/game/add-balance", { method: "POST" });
  await update(); // 🔥 THIS is what you were missing
}

function cleanCardId(id) {
  if (!id) return "Unknown";

  //  Force it into a real card object first
  const card = normalizeCard(id);
  const safeId = card.id;

  return safeId
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}


// --- RENDER INVENTORY ---
function renderInventory(inventoryArray) {
  const invEl = document.getElementById("inventory");
  if (!invEl) return;

  invEl.innerHTML = '';

  inventoryArray.forEach(rawCard => {
    const card = normalizeCard(rawCard); // ✅ FIXED
    if (!card) return;

    const cardEl = document.createElement('div');
    cardEl.classList.add('card');

    const rawId = card.id;
    const displayId = cleanCardId(rawId);
    const rarity = card.rarity || "common";
    const count = card.count || 1;

    cardEl.innerHTML = `
      <span class="card-name">${displayId}</span>
      ${count > 1 ? `<span class="card-count">x${count}</span>` : ""}
    `;

    cardEl.classList.add(`rarity-${rarity}`);
    cardEl.draggable = true;

    cardEl.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("cardId", rawId);
    });

    invEl.appendChild(cardEl);
  });
}


// --- RENDER DECK ---
function renderDeck(deckArray) {
  const deckEl = document.getElementById("deck");
  if (!deckEl) return;

  console.log("RENDER DECK:", deckArray);

  deckEl.innerHTML = '';

  deckArray.forEach((rawCard, index) => {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card', 'deck-slot');

    if (!rawCard || !rawCard.id) {
      cardEl.textContent = "+";
      cardEl.classList.add('empty-slot');
    } else {
      const card = normalizeCard(rawCard);

      if (!card || !card.id) {
        cardEl.textContent = "?";
      } else {
        const displayId = cleanCardId(card.id);
        cardEl.innerHTML = `<span class="card-name">${displayId}</span>`;
        cardEl.classList.add(`rarity-${card.rarity || "common"}`);
      }
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
      if (!cardId) return;

      await replaceDeckSlot(index, cardId);
    });

    deckEl.appendChild(cardEl);
  });
}



// --- FULLY NORMALIZE CARD ---
function normalizeCard(card) {
  if (!card) return null;

  // If already an object with a plain id string, return it directly
  if (typeof card === "object" && typeof card.id === "string") {
    return {
      id: card.id,
      rarity: card.rarity || "common",
      count: card.count || 1
    };
  }

  // If card is a string
  if (typeof card === "string") {
    try {
      return normalizeCard(JSON.parse(card)); // parse once recursively
    } catch {
      return { id: card, rarity: "common", count: 1 };
    }
  }

  return null;
}


// --- REPLACE DECK SLOT (fixed) ---
// --- REPLACE DECK SLOT (cleaned) ---
async function replaceDeckSlot(slotIndex, cardId) {
  try {
    const [deckData, invData] = await Promise.all([
      safeFetch(`${API}/deck`),
      safeFetch(`${API}/inventory`)
    ]);

    if (!deckData || !invData) return;

    const deckObjects = normalizeArray(deckData, "deck");

    const inventoryArray = normalizeArray(invData, "inventory").map(c => ({
      ...normalizeCard(c),
      count: c.count || 1
    }));

    const ownedCard = inventoryArray.find(c => c.id === cardId);
    const ownedCount = ownedCard?.count ?? 0;

    const currentDeckCount = deckObjects.filter(c => c && c.id === cardId).length;
    const isReplacingSame = deckObjects[slotIndex]?.id === cardId;
    const adjustedCount = isReplacingSame ? currentDeckCount - 1 : currentDeckCount;

    console.log({
      cardId,
      ownedCount,
      currentDeckCount,
      adjustedCount
    });

    if (adjustedCount >= ownedCount) {
      document.getElementById("result").innerText =
        `You only own ${ownedCount} copy(s) of ${cleanCardId(cardId)}`;
      return;
    }

    const deckIds = deckObjects.map(c => c ? c.id : null);
    deckIds[slotIndex] = cardId;

    await safeFetch(`${API}/set-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDeck: deckIds })
    });

    document.getElementById("result").innerText =
      `Placed ${cleanCardId(cardId)} in slot ${slotIndex + 1}`;

    await update();

  } catch (err) {
    console.error("Replace slot failed:", err);
  }
}

// --- SPIN ---
async function spin() {
  const spinBtn = document.getElementById("spin-btn");
  const reelsEl = document.getElementById("slot-reels");

  spinBtn.disabled = true;

  const balance = parseInt(
    document.getElementById("balance").innerText.replace(/\D/g, ''),
    10
  );

  if (balance < 100) {
    document.getElementById("result").innerText = "Not enough balance!";
    spinBtn.disabled = false;
    return;
  }

  startSpinAnimation();
  reelsEl.classList.add("spin-fast");

  try {
    const data = await safeFetch(`${API}/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet: 100 })
    });

    if (!data) {
      spinBtn.disabled = false;
      stopSpinAnimation();
      return;
    }

    if (data.error) {
      document.getElementById("result").innerText = data.error;
      spinBtn.disabled = false;
      stopSpinAnimation();
      return;
    }

    setTimeout(() => {
      stopSpinAnimation();

      reelsEl.classList.remove("spin-fast");
      reelsEl.classList.add("spin-slow");

      setTimeout(() => {
        reelsEl.classList.remove("spin-slow");

        const symbols = {
          cherry: "🍒", lemon: "🍋", orange: "🍊",
          grape: "🍇", bar: "🔲", seven: "7️⃣",
          diamond: "💎", star: "⭐"
        };

        const getSymbol = s => symbols[s] || "❓";
        const reels = data.reels;

        reelsEl.innerHTML = `
          <span id="r1">❓</span>
          <span id="r2">❓</span>
          <span id="r3">❓</span>
        `;

        const r1 = document.getElementById("r1");
        const r2 = document.getElementById("r2");
        const r3 = document.getElementById("r3");

        setTimeout(() => {
          r1.innerText = getSymbol(reels[0]);
          r1.classList.add("reel-stop");
        }, 200);

        setTimeout(() => {
          r2.innerText = getSymbol(reels[1]);
          r2.classList.add("reel-stop");
        }, 500);

        setTimeout(() => {
          r3.innerText = getSymbol(reels[2]);
          r3.classList.add("reel-stop");

          document.getElementById("balance").innerText =
            `Balance: $${data.balance}`;

          document.getElementById("result").innerText =
            `Payout: ${data.payout}`;

          showSpinResultEffect(data.payout);
          showFloatingWin(data.payout);

          update();
          spinBtn.disabled = false;

        }, 800);

      }, 400);

    }, 600);

  } catch (err) {
    console.error(err);
    spinBtn.disabled = false;
    stopSpinAnimation();
  }
}

// --- ANIMATIONS ---
function startSpinAnimation() {
  const fake = ["🍒","🍋","🍊","🍇","🔲","7️⃣","💎","⭐"];
  spinInterval = setInterval(() => {
    const r = Array.from({ length: 3 },
      () => fake[Math.floor(Math.random() * fake.length)]
    );
    document.getElementById("slot-reels").innerText = r.join(" ");
  }, 100);
}

function stopSpinAnimation() {
  clearInterval(spinInterval);
}

// --- FLOATING WIN ---
function showFloatingWin(amount) {
  if (amount <= 0) return;

  const el = document.createElement("div");
  el.className = "floating-win";
  el.innerText = `+${amount}💰`;

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// --- RESULT EFFECT ---
function showSpinResultEffect(payout) {
  const body = document.body;

  body.classList.remove("win", "lose");

  if (payout > 0) {
    body.classList.add("win");
    if (payout >= 500) {
      document.getElementById("slot-reels").classList.add("big-win");
    }
  } else {
    body.classList.add("lose");
  }

  setTimeout(() => {
    body.classList.remove("win", "lose");
    document.getElementById("slot-reels").classList.remove("big-win");
  }, 1000);
}
let auto = false;

function autoSpin() {
  auto = !auto;

  if (auto) loopSpin();
}


async function loopSpin() {
  while (auto) {
    await spin();
    await new Promise(r => setTimeout(r, 1200));
  }
}

// --- CRATE ---
async function openCrate(type) {
  try {
    const data = await safeFetch(`${API}/open-crate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type })
    });

    if (!data) return;

    if (data.error) {
      document.getElementById("result").innerText = data.error;
      return;
    }

    const rewards = normalizeArray(data, 'rewards');
    console.log("CRATE REWARDS:", rewards);

    showCrateAnimation(rewards);

    // 🔥 RARITY SCREEN
    const highest = rewards.reduce((best, r) => {
      const order = ["common","rare","epic","legendary"];
      return order.indexOf(r.rarity) > order.indexOf(best) ? r.rarity : best;
    }, "common");

    triggerRarityScreen(highest);

    if (rewards.some(r => r.rarity === "legendary")) {
      triggerLegendary();
    }

    // 🔥 WRAP RESULTS (fix layout issues)
    document.getElementById("result").innerHTML = `
      <div class="crate-results">
        ${rewards.map((r, i) => `
          <div class="card-reveal ${r.rarity}" style="animation-delay:${i * 0.2}s">
            ?
          </div>
        `).join("")}
      </div>
    `;

    // 🔥 REVEAL ANIMATION
    setTimeout(() => {
      const els = document.querySelectorAll(".card-reveal");

      els.forEach((el, i) => {
        const r = rewards[i];
        if (!r) return;

        el.innerText = cleanCardId(r.id);
        el.classList.add("revealed");
      });
    }, 600);

    // 🔥 BALANCE UPDATE
    if (data.balance !== undefined) {
      document.getElementById("balance").innerText =
        `Balance: $${data.balance}`;
    }

    // 🔥 WAIT before updating UI (CRITICAL)
    setTimeout(() => {
      update();
    }, 1200);

  } catch (err) {
    console.error("Crate error:", err);
  }
}

function triggerRarityScreen(rarity) {
  const body = document.body;

  body.classList.remove("common","rare","epic","legendary");
  body.classList.add(rarity);

    setTimeout(() => {
      body.classList.remove(rarity);
    }, 1000);
}

function showCrateAnimation(rewards) {
  const body = document.body;

  rewards.forEach((r, i) => {
    setTimeout(() => {
      body.classList.remove("common", "rare", "epic", "legendary");

      if (r.rarity === "legendary") {
        body.classList.add("legendary");
      } else if (r.rarity === "epic") {
        body.classList.add("epic");
      } else if (r.rarity === "rare") {
        body.classList.add("rare");
      } else {
        body.classList.add("common");
      }
    }, i * 400);
  });

  setTimeout(() => {
    body.classList.remove("common", "rare", "epic", "legendary");
  }, 1500);
}

// --- UPDATE ---
async function update() {
  try {
    console.log("Updating UI...");
    const [invData, deckData] = await Promise.all([
      safeFetch(`${API}/inventory`),
      safeFetch(`${API}/deck`)
    ]);

    if (!invData || !deckData) return;

    renderInventory(invData.inventory || []);
    renderDeck(normalizeArray(deckData, "deck"));

  } catch (err) {
    console.error("Update failed:", err);
  }
}
async function resetAccount() {
  await safeFetch("/api/game/reset-account", { method: "POST" });
  await loadGame();
}
// DEV CARD
async function devCard(card_id, rarity) {
  await safeFetch("/api/game/dev-add-card", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ card_id, rarity })
  });
  await update();
}

// --- LOAD ---
async function loadGame() {
  try {
    const data = await safeFetch(`${API}/state`);
    if (!data) return;

    document.getElementById("balance").innerText =
      `Balance: $${data.balance || 0}`;

    await update();

  } catch (err) {
    console.error("Load failed:", err);
  }
}
// --- DEV TOOLS ---
document.getElementById("dev-add-balance")?.addEventListener("click", async () => {
  const res = await safeFetch(`${API}/game/add-balance`, { method: "POST" });
  if (res?.balance !== undefined) {
    document.getElementById("balance").innerText = `Balance: $${res.balance}`;
    document.getElementById("dev-result").innerText = "Added $1000 balance!";
  }
});

// Reset deck to empty slots
document.getElementById("dev-reset-deck")?.addEventListener("click", async () => {
  const defaultDeck = [null, null, null]; // 3 empty slots
  await safeFetch(`${API}/set-deck`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newDeck: defaultDeck })
  });
  await update();
  document.getElementById("dev-result").innerText = "Deck reset!";
});

// Reset inventory to default cards for dev
document.getElementById("dev-reset-inventory")?.addEventListener("click", async () => {
  const defaultInventory = [
    { id: "wild_symbol", rarity: "epic", count: 2 },
    { id: "jackpot_boost", rarity: "rare", count: 1 },
    { id: "mythic_multiplier", rarity: "legendary", count: 1 }
  ];
  
  await safeFetch(`${API}/game/set-inventory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inventory: defaultInventory })
  });
  
  await update();
  document.getElementById("dev-result").innerText = "Inventory reset!";
});

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("spin-btn").addEventListener("click", spin);
  document.getElementById("logout-btn")?.addEventListener("click", logout);
  document.querySelectorAll(".btn-crate").forEach(btn => {
    btn.addEventListener("click", () =>
      openCrate(btn.dataset.crate)
    );
  });

  loadGame();
});

