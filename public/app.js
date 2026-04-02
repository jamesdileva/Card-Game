const API = "/api/game";
let spinInterval;
let autoSpinActive = false;
let spinning = false;
const NUM_REELS = 5;
let playerXP = 0;
let playerLevel = 1;
let payoutBoost = 1.0;
let xpBoost = 1.0;
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
  await safeFetch(`${API}/add-balance`, { method: "POST" });
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


// --- SYMBOLS ---
const symbols = {
  cherry: "🍒",
  lemon: "🍋",
  orange: "🍊",
  grape: "🍇",
  clover: "🍀",
  gem: "💎",
  diamond: "💎",
  star: "⭐",
  crown: "👑",
  jackpot: "👑"
};

const getSymbol = s => symbols[String(s).toLowerCase()] || "❓";

// --- AUTO-SPIN TOGGLE ---
function toggleAutoSpin() {
  autoSpinActive = !autoSpinActive;

  const btn = document.getElementById("auto-spin-btn");
  if (btn) btn.classList.toggle("active", autoSpinActive);

  const spinBtn = document.getElementById("spin-btn");

  if (autoSpinActive) {
    if (spinBtn) spinBtn.disabled = true;
    runAutoSpin();
  } else {
    if (spinBtn) spinBtn.disabled = false; //  ALWAYS re-enable
  }
}

function debugSpin() {
  const btn = document.getElementById("spin-btn");

  console.log("---- SPIN DEBUG ----");
  console.log("spinning:", spinning);
  console.log("autoSpinActive:", autoSpinActive);
  console.log("button disabled:", btn?.disabled);
  console.log("balance text:", document.getElementById("balance")?.innerText);
}

// --- AUTO-SPIN LOOP ---
async function runAutoSpin() {
  while (autoSpinActive) {
    await spin();
    await new Promise(resolve => setTimeout(resolve, 500));
    
  }
}

// --- SPIN FUNCTION ---
async function spin() {
  if (spinning) {
    console.log("⛔ blocked: already spinning");
    return;
  }

  const spinBtn = document.getElementById("spin-btn");
  const reelsEl = document.getElementById("slot-reels");
  const balanceEl = document.getElementById("balance");
  const resultEl = document.getElementById("result");

  if (!spinBtn || !reelsEl || !balanceEl) {
    console.log("❌ missing DOM elements");
    return;
  }

  // --- CHECK BALANCE FIRST
  let balance = parseInt(balanceEl.innerText.replace(/\D/g, ""), 10);

  if (balance < 100) {
    if (resultEl) resultEl.innerText = "Not enough balance!";
    console.log("💸 not enough balance");
    return;
  }

  // --- LOCK STATE
  spinning = true;
  spinBtn.disabled = true;

  console.log("🎰 SPIN START");

  startSpinAnimation();

  try {
    const res = await fetch("/api/game/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet: 100, deck: currentDeck })
    });

    const data = await res.json();

    // ✅ HANDLE ERROR FIRST
    if (!data || data.error) {
      if (resultEl) resultEl.innerText = data?.error || "Error";
      console.log("❌ API error:", data);
      autoSpinActive = false;
      return;
    }

    // ✅ SYNC PROGRESSION (NOW SAFE)
    if (data.xp !== undefined) {
      playerXP = data.xp;
      playerLevel = data.level;
      payoutBoost = data.payoutBoost;
      updateXPUI();
    }

    stopSpinAnimation();

    // --- RENDER REELS
    const reels = data.reels || [];
    reelsEl.innerHTML = reels.map((_, i) => `<span id="r${i+1}">❓</span>`).join("");

    for (let i = 0; i < reels.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const el = document.getElementById(`r${i+1}`);
      if (el) el.innerText = getSymbol(reels[i]);
    }

   // --- UPDATE UI
    balanceEl.innerText = `Balance: $${data.balance}`;

    let lines = [];

    // 💰 BASE RESULT
    lines.push(`💰 Payout: ${data.payout}`);

    // 🎴 DECK EFFECTS
    if (data.effects) {
      if (data.effects.payoutMult > 1) {
        lines.push(`💰 Deck x${data.effects.payoutMult.toFixed(2)}`);
      }

      if (data.effects.xpMult > 1) {
        lines.push(`⚡ XP x${data.effects.xpMult.toFixed(2)}`);
      }

      if (data.effects.luck > 1) {
        let luckText = "🍀 Luck Boost";

        if (data.effects.luck >= 1.5) luckText = "🍀 Lucky!";
        if (data.effects.luck >= 2) luckText = "🍀 Super Lucky!";
        if (data.effects.luck >= 3) luckText = "🍀 INSANE LUCK";

        lines.push(`${luckText} (x${data.effects.luck.toFixed(2)})`);
      }

      if (data.effects.rerollChance > 0) {
        lines.push(`🔁 Reroll ${(data.effects.rerollChance * 100).toFixed(0)}%`);
      }
    }

    // ⚡ EVENT
    if (data.event) {
      lines.push(data.event.label);
    }

    // 🔥 STREAK
    if (data.streak && data.streak > 1) {
      lines.push(`🔥 Streak x${data.streak}`);
    }

    // 🧠 FINAL RENDER
    if (resultEl) {
      resultEl.innerText = lines.join(" | ");
    }

    // --- 🎉 WIN EFFECTS (ONLY ONCE)
    if (data.payout > 0) {
      showFloatingWin(data.payout);
    }

    // ⚡ FLASH EFFECTS
    if (data.event?.type === "DOUBLE_PAYOUT") {
      document.body.classList.add("gold-flash");
    }

    if (data.event?.type === "DOUBLE_XP") {
      document.body.classList.add("blue-flash");
    }

    if (data.event?.type === "LUCK_SURGE") {
      document.body.classList.add("green-flash");
    }

    setTimeout(() => {
      document.body.classList.remove("gold-flash", "blue-flash", "green-flash");
    }, 500);
    showSpinResultEffect(data.payout);

    console.log("✅ SPIN SUCCESS", data);

  } catch (err) {
    console.error("🔥 Spin crash:", err);
    stopSpinAnimation();
    autoSpinActive = false;
  } finally {
    spinning = false;

    if (!autoSpinActive) {
      spinBtn.disabled = false;
    }

    console.log("🔄 spin reset", {
      spinning,
      disabled: spinBtn.disabled,
      autoSpinActive
    });
  }

  debugSpin();
}

// --- SPIN ANIMATION ---
function startSpinAnimation() {
  const fake = ["🍒","🍋","🍊","🍇","💎","⭐","👑","🔲"];
  const reelsEl = document.getElementById("slot-reels");
  if (!reelsEl) return;

  spinInterval = setInterval(() => {
    const r = Array.from({ length: NUM_REELS }, () =>
      fake[Math.floor(Math.random() * fake.length)]
    );
    reelsEl.innerText = r.join(" ");
  }, 100);
}

function stopSpinAnimation() {
  clearInterval(spinInterval);
}



// --- UPDATE CURRENT DECK ---
function updateCurrentDeck(deckArray) {
  currentDeck = deckArray.map(c => c?.id).filter(Boolean);
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
let currentDeck = [];

async function update() {
  const [invData, deckData] = await Promise.all([
    safeFetch(`${API}/inventory`),
    safeFetch(`${API}/deck`)
  ]);

  if (!invData || !deckData) return;

  renderInventory(invData.inventory || []);
  renderDeck(normalizeArray(deckData, "deck"));

  currentDeck = normalizeArray(deckData, "deck").map(c => c?.id).filter(Boolean);
}

function triggerLegendary(){

  
}

async function loadProgression() {
  // placeholder for now
}

async function resetAccount() {
  await safeFetch("${API}/dev-reset", { method: "POST" });
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

    // ✅ SET VALUES FIRST
    payoutBoost = data.payoutBoost || 1;
    xpBoost = data.xpBoost || 1;

    playerXP = data.xp || 0;
    playerLevel = data.level || 1;

    // ✅ UPDATE UI
    updateUpgradeUI();
    updateXPUI();

    document.getElementById("balance").innerText =
      `Balance: $${data.balance || 0}`;

    await update();

  } catch (err) {
    console.error("Load failed:", err);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  // Spin button
  const spinBtn = document.getElementById("spin-btn");
  if (spinBtn) spinBtn.addEventListener("click", spin);

  // Auto-spin button
  const autoSpinBtn = document.getElementById("auto-spin-btn");
  if (autoSpinBtn) autoSpinBtn.addEventListener("click", toggleAutoSpin);

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Crate buttons
  document.querySelectorAll(".btn-crate").forEach(btn => {
    btn.addEventListener("click", () => openCrate(btn.dataset.crate));
  });
  // Store button
  document.getElementById("store-btn")?.addEventListener("click", () => {
  document.getElementById("store-panel").classList.toggle("hidden");
  });
  // Dev tools (if any)
  document.getElementById("dev-add-balance")?.addEventListener("click", async () => {
    const res = await safeFetch(`${API}/add-balance`, { method: "POST" });
    if (res?.balance !== undefined) {
      document.getElementById("balance").innerText = `Balance: $${res.balance}`;
      document.getElementById("result").innerText = "Added $10,000 💰";
    }
  });
    // RESET DECK
  document.getElementById("dev-reset-deck")?.addEventListener("click", async () => {
    const emptyDeck = [null, null, null];
    await safeFetch(`${API}/set-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDeck: emptyDeck })
    });
    await update();
    document.getElementById("result").innerText = "Deck cleared 🧹";
  });
      //    BUTTON FOR SHOP
  document.getElementById("upgrade-payout-btn")?.addEventListener("click", async () => {
    const res = await fetch("/api/game/upgrade/payout", { method: "POST" });
    if (!res.ok) {
      console.error("Upgrade failed");
      return;
    }
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    payoutBoost = data.payoutBoost;
    document.getElementById("balance").innerText = `Balance: $${data.balance}`;
    updateUpgradeUI(); // 🔥 THIS FIXES TEXT NOT UPDATING
  });

        // XP SHOP UPGRADE
    document.getElementById("upgrade-xp-btn")?.addEventListener("click", async () => {
      const res = await fetch("/api/game/upgrade/xp", { method: "POST" });

      if (!res.ok) {
        console.error("Upgrade failed");
        return;
      }

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      xpBoost = data.xpBoost;

      document.getElementById("balance").innerText = `Balance: $${data.balance}`;

      updateUpgradeUI();
    });

  // RESET ACCOUNT BUTTON
  document.getElementById("dev-clear-inventory")?.addEventListener("click", async () => {
    await safeFetch(`${API}/reset-account`, { method: "POST" });
    await update();
    document.getElementById("result").innerText = "Inventory cleared 🧹";
  });

  // Load initial game state
  loadGame();
});
// XP UPDATER 
function updateXPUI() {
  console.log("📊 XP UPDATE", {
    xp: playerXP,
    level: playerLevel,
    xpBoost: xpBoost
  });

  const xpEl = document.getElementById("xp");
  const levelEl = document.getElementById("level");

  if (xpEl) xpEl.innerText = `XP: ${playerXP}`;
  if (levelEl) levelEl.innerText = `Level: ${playerLevel}`;
}
function calculateDeckEffects(deck) {
  let effects = {
    payoutMult: 1,
    xpMult: 1,
    luck: 1,
    bonusPayout: 0,
    rerollChance: 0
  };

  const counts = {};

  deck.forEach(id => {
    if (!id) return;
    counts[id] = (counts[id] || 0) + 1;
  });

  for (const [card, count] of Object.entries(counts)) {

    // 🍀 lucky_charm → increases luck (future events)
    if (card === "lucky_charm") {
      effects.luck += 0.25 * count;
    }

    // 🔁 reroll → chance to reroll bad spins
    if (card === "reroll") {
      effects.rerollChance += 0.15 * count;
    }

    // 💰 double_down → increases payout
    if (card === "double_down") {
      effects.payoutMult += 0.3 * count;
    }

    // 🎯 jackpot_boost → boosts high wins
    if (card === "jackpot_boost") {
      effects.payoutMult += 0.5 * count;
    }

    // 🌀 wild_symbol → flat payout bonus
    if (card === "wild_symbol") {
      effects.bonusPayout += 100 * count;
    }

    // 🔗 multiplier_chain → scaling multiplier
    if (card === "multiplier_chain") {
      effects.payoutMult += 0.2 * count;
      effects.xpMult += 0.2 * count;
    }

    // 🔥 mythic_multiplier → BIG effect
    if (card === "mythic_multiplier") {
      effects.payoutMult += 1.0 * count;
      effects.xpMult += 0.5 * count;
    }
  }

  return effects;
}
function updateUpgradeUI() {
  const payoutEl = document.getElementById("payout-boost-text");
  const xpEl = document.getElementById("xp-boost-text");

  if (payoutEl) payoutEl.innerText = `x${payoutBoost.toFixed(1)}`;
  if (xpEl) xpEl.innerText = `x${xpBoost.toFixed(1)}`;
}

function showDeckEffects(effects) {
  const resultEl = document.getElementById("result");
  if (!resultEl) return;

  let text = [];

  if (effects.payoutMult > 1) {
    text.push(`💰 x${effects.payoutMult.toFixed(2)}`);
  }

  if (effects.xpMult > 1) {
    text.push(`⚡ x${effects.xpMult.toFixed(2)}`);
  }

  if (effects.bonusPayout > 0) {
    text.push(`➕ +${effects.bonusPayout}`);
  }

  if (effects.rerollChance > 0) {
    text.push(`🔁 reroll chance`);
  }

  if (effects.luck > 1) {
    text.push(`🍀 luck`);
  }

  if (text.length > 0) {
    resultEl.innerText += " | " + text.join(" | ");
  }
}