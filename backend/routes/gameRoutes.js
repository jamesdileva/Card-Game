const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");



const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
pool.connect()
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch(err => console.error("❌ DB connection error", err));

// --- HELPER ---
async function requireLogin(req, res) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not logged in" });
    return false;
  }

  const user = await pool.query(
    "SELECT id FROM users WHERE id=$1",
    [req.session.userId]
  );

  if (user.rows.length === 0) {
    req.session.destroy();
    res.status(401).json({ error: "Session expired" });
    return false;
  }

  return true;
}

// XP progression system
function xpToNext(level) {
  return level * 100;
}

function applyXP(player, xpGain) {
  player.xp += xpGain;

  while (player.xp >= xpToNext(player.level)) {
    player.xp -= xpToNext(player.level);
    player.level++;
  }
}
// RANDOM EVENTS
function rollRandomEvent() {
  if (Math.random() > 0.15) return null; // 15% chance

  const roll = Math.random();

  if (roll < 0.33) {
    return { type: "DOUBLE_PAYOUT", mult: 2, label: "💰 DOUBLE PAYOUT" };
  } 
  else if (roll < 0.66) {
    return { type: "DOUBLE_XP", mult: 2, label: "⚡ DOUBLE XP" };
  } 
  else {
    return { type: "LUCK_BOOST", luck: 0.5, label: "🍀 LUCK SURGE" };
  }
}

// --- INIT TABLES ---
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      balance INT DEFAULT 1000
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id INT,
      card_id TEXT,
      rarity TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deck (
      id SERIAL PRIMARY KEY,
      user_id INT,
      slot INT,
      card_id TEXT
    );
  `);
})();


// ====================
// GAME ROUTES
// ====================

router.get("/state", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  // ✅ USER
  const userResult = await pool.query(
    "SELECT * FROM users WHERE id=$1",
    [req.session.userId]
  );

  const user = userResult.rows[0];

  // ✅ INVENTORY
  const invResult = await pool.query(
    "SELECT card_id, rarity FROM inventory WHERE user_id=$1",
    [req.session.userId]
  );

  const stacked = {};

  invResult.rows.forEach(c => {
    const id = c.card_id;

    if (!stacked[id]) {
      stacked[id] = {
        id,
        rarity: c.rarity || "common",
        count: 1
      };
    } else {
      stacked[id].count++;
    }
  });

  const inventory = Object.values(stacked);

  // ✅ DECK (🔥 FIXED)
  const deckResult = await pool.query(`
    SELECT slot, card_id
    FROM deck
    WHERE user_id = $1
    ORDER BY slot
  `, [req.session.userId]);

  const deck = [null, null, null];

  deckResult.rows.forEach(row => {
    deck[row.slot] = row.card_id;
  });

  // ✅ EFFECTS
  const effects = calculateDeckEffects(deck);
  calculateSynergies(deck, effects);

  // ✅ RESPONSE
  res.json({
    balance: user.balance,
    xp: user.xp,
    level: user.level,
    payoutBoost: user.payout_boost || 1,
    xpBoost: user.xp_boost || 1,
    loginStreak: user.login_streak || 1,
    lastLogin: user.last_login,
    loginReward: 0,
    inventory,
    deck,          // 🔥 NOW CORRECT
    effects
  });
});

router.get("/inventory", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const result = await pool.query(
    "SELECT card_id, rarity FROM inventory WHERE user_id=$1",
    [req.session.userId]
  );

  const stacked = {};

  result.rows.forEach(c => {
    const id = c.card_id;

    if (!stacked[id]) {
      stacked[id] = {
        id,
        rarity: c.rarity || "common",
        count: 1
      };
    } else {
      stacked[id].count++;
    }
  });

  res.json({ inventory: Object.values(stacked) });
});

router.post("/dev-add-card", async (req, res) => {
  const userId = req.session.userId;
  const { card_id, rarity } = req.body;

  if (!userId) return res.status(401).json({ error: "Not logged in" });

  await pool.query(
    "INSERT INTO inventory (user_id, card_id, rarity) VALUES ($1,$2,$3)",
    [userId, card_id, rarity || "common"]
  );

  res.json({ success: true });
});

router.post("/reset-account", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ error: "Not logged in" });

  // 🔥 CLEAR INVENTORY
  await pool.query("DELETE FROM inventory WHERE user_id=$1", [userId]);

  // 🔥 RESET BALANCE
  await pool.query(
    "UPDATE users SET balance = 1000 WHERE id=$1",
    [userId]
  );

  // 🔥 RESET DECK
  await pool.query(
    "UPDATE deck SET card_id = NULL WHERE user_id=$1",
    [userId]
  );

  // ✅ VERIFY (REAL DEBUG)
  const check = await pool.query(
    "SELECT * FROM inventory WHERE user_id=$1",
    [userId]
  );

  console.log("AFTER DELETE:", check.rows); // should be []

  res.json({ success: true });
});

router.post("/clear-inventory", async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  await pool.query(
    "DELETE FROM inventory WHERE user_id = $1",
    [userId]
  );

  res.json({ success: true });
});

router.post("/add-balance", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // ✅ Add 10,000 (not 1,000)
    await pool.query(
      "UPDATE users SET balance = balance + 10000 WHERE id = $1",
      [userId]
    );

    // ✅ RETURN UPDATED BALANCE
    const result = await pool.query(
      "SELECT balance FROM users WHERE id = $1",
      [userId]
    );

    res.json({ balance: result.rows[0].balance });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add balance" });
  }
});



router.get("/deck", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const result = await pool.query(`
    SELECT d.slot, d.card_id, i.rarity
    FROM deck d
    LEFT JOIN inventory i
    ON d.card_id = i.card_id AND i.user_id = d.user_id
    WHERE d.user_id = $1
    ORDER BY d.slot
  `, [req.session.userId]);

    if (result.rows.length === 0) {
  for (let i = 0; i < 3; i++) {
    await pool.query(
      "INSERT INTO deck (user_id, slot, card_id) VALUES ($1, $2, NULL)",
      [req.session.userId, i]
    );
  }
}
  const deck = [null, null, null];
  result.rows.forEach(row => {
    deck[row.slot] = row.card_id
    ? { id: row.card_id, rarity: row.rarity || "common" }
    : null;
  });

  console.log("📤 Sending deck:", deck); // DEBUG
  console.log("FINAL DECK SENT:", deck);
  res.json({ deck });
});

// ====================
// DEV ROUTES (ONLY USE IN DEV)
// ====================

router.post("/dev-reset", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // Reset balance
    await pool.query(
      "UPDATE users SET balance = 10000 WHERE id = $1",
      [userId]
    );

    // Clear inventory
    await pool.query(
      "DELETE FROM inventory WHERE user_id = $1",
      [userId]
    );

    // Reset deck
    for (let i = 0; i < 3; i++) {
      await pool.query(`
        INSERT INTO deck (user_id, slot, card_id)
        VALUES ($1, $2, NULL)
        ON CONFLICT (user_id, slot)
        DO UPDATE SET card_id = NULL
      `, [userId, i]);
    }

    res.json({ success: true, message: "Dev reset complete" });

  } catch (err) {
    console.error("Dev reset failed:", err);
    res.status(500).json({ error: "Reset failed" });
  }
});

router.post("/set-deck", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const { newDeck } = req.body;
  console.log("📥 Incoming deck:", newDeck);

  for (let i = 0; i < 3; i++) {
    const result = await pool.query(`
      INSERT INTO deck (user_id, slot, card_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, slot)
      DO UPDATE SET card_id = EXCLUDED.card_id
    `, [req.session.userId, i, newDeck[i]]);

    console.log("Rows affected:", result.rowCount);
  }

  res.json({ status: "ok" });
});
function getLevelReward(level) {
  return 200 + (level * 50);
}

function calculateDeckEffects(deck) {
  const effects = {
    payoutMult: 1,
    xpMult: 1,
    rerollChance: 0,
    luck: 1
  };

  deck.forEach(cardId => {
    switch (cardId) {
      case "lucky_charm":
        effects.luck += 0.1;
        break;

      case "reroll":
        effects.rerollChance += 0.25;
        break;

      case "double_down":
        effects.payoutMult += 0.5;
        break;

      case "jackpot_boost":
        effects.payoutMult += 1.0;
        break;

      case "wild_symbol":
        effects.luck += 0.3;
        break;

      case "multiplier_chain":
        effects.payoutMult += 0.2;
        break;

      case "mythic_multiplier":
        effects.payoutMult += 2.0;
        break;
    }
  });

  return effects;
}
// CARD SYNERGIES
function calculateSynergies(deck, effects) {
  const d = deck || [];

  // ensure array exists
  effects.synergies = effects.synergies || [];

  const addSynergy = (label) => {
    effects.synergies.push(label);
  };

  // -------------------------
  // 🧠 PAIR SYNERGIES
  // -------------------------

  if (d.includes("lucky_charm") && d.includes("jackpot_boost")) {
    effects.payoutMult *= 1.5;
    effects.luck += 0.1;
    addSynergy("🍀 Lucky Jackpot");
  }

  if (d.includes("reroll") && d.includes("multiplier_chain")) {
    effects.rerollChance += 0.2;
    effects.payoutMult *= 1.3;
    addSynergy("🔁 Chain Reroll");
  }

  if (d.includes("double_down") && d.includes("mythic_multiplier")) {
    effects.payoutMult *= 2;
    addSynergy("💥 Mythic Double");
  }

  // -------------------------
  // 🔢 COUNT SYNERGIES
  // -------------------------

  const count = {};
  d.forEach(card => {
    if (!card) return;
    count[card] = (count[card] || 0) + 1;
  });

  // 🔥 TRIPLE MYTHIC (your big one)
  if (count["mythic_multiplier"] >= 3) {
    effects.payoutMult += 7;
    effects.luck += 0.2;
    addSynergy(" Triple Mythic");
  }

  // 🍀 Lucky Charm Pair
  if (count["lucky_charm"] >= 2) {
    effects.rerollChance += 0.3;
    addSynergy("🍀 Lucky Pair");
  }

  // 🔁 Reroll Stack
  if (count["reroll"] >= 2) {
    effects.rerollChance += 0.5;
    addSynergy("🔁 Reroll Engine");
  }

  // -------------------------
  // 🧪 MIXED BUILDS
  // -------------------------

  if (count["lucky_charm"] && count["reroll"]) {
    effects.rerollChance += 0.25;
    effects.luck += 0.2;
    addSynergy("✨ Luck Engine");
  }

  if (count["multiplier_chain"] >= 2) {
    effects.payoutMult += 1.0;
    effects.xpMult += 0.5;
    addSynergy("⛓️ Chain Scaling");
  }

  if (count["wild_symbol"] >= 2) {
    effects.bonusPayout = (effects.bonusPayout || 0) + 300;
    addSynergy("🃏 Wild Surge");
  }

  if (count["jackpot_boost"] >= 2) {
    effects.payoutMult += 2;
    addSynergy("👑 Jackpot Overload");
  }

  // -------------------------
  // 💀 GOD TIER (RARE BUILD)
  // -------------------------

  if (
    count["mythic_multiplier"] &&
    count["jackpot_boost"] &&
    count["multiplier_chain"]
  ) {
    effects.payoutMult *= 2;
    effects.luck += 0.5;
    addSynergy("💀 GOD BUILD");
  }

  return effects;
}

// SPIN
router.post("/spin", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const { bet = 100, multiplier = 1, deck = [] } = req.body;

  // --- GET USER ---
  const userRes = await pool.query(
    `SELECT balance, xp, level, payout_boost, xp_boost, win_streak, last_rewarded_level
    FROM users
    WHERE id = $1`,
    [req.session.userId]
  );

  if (userRes.rows.length === 0) {
    return res.status(401).json({ error: "User not found" });
  }

  let user = userRes.rows[0];

  if (user.balance < bet) {
    return res.json({ error: "Not enough balance" });
  }

  // --- SYMBOLS ---
  const symbols = ["cherry","lemon","orange","grape","clover","gem","star","crown"];

  // --- 🎴 DECK EFFECTS ---
  const effects = calculateDeckEffects(deck);
  // ✅ APPLY SYNERGIES (YOU ARE MISSING THIS)
  calculateSynergies(deck, effects);


  // --- ⚡ RANDOM EVENT ---
  let event = rollRandomEvent();

  if (event) {
    console.log("⚡ EVENT TRIGGERED:", event);

    if (event.type === "DOUBLE_PAYOUT") {
      effects.payoutMult *= event.mult;
    }

    if (event.type === "DOUBLE_XP") {
      effects.xpMult *= event.mult;
    }

    if (event.type === "LUCK_BOOST") {
      effects.luck += event.luck;
    }
  }

  // --- DEBUG ---
  console.log("🎴 DECK INPUT:", deck);
  console.log("✨ EFFECTS:", effects);

  // --- 🎰 SPIN REELS ---
  let reels = Array.from({ length: 5 }, () =>
    symbols[Math.floor(Math.random() * symbols.length)]
  );

  console.log("🎰 INITIAL REELS:", reels);

  // --- 💰 BASE PAYOUT ---
  let payout = 0;
  let unique = new Set(reels).size;

  if (unique === 1) payout = 1000;
  else if (unique === 2) payout = 500;
  else if (unique === 3) payout = 200;

  console.log("💰 BASE PAYOUT:", payout);

  // --- 🔁 REROLL BAD SPINS ---
  if (payout === 0 && Math.random() < effects.rerollChance) {
    console.log("🔁 REROLL TRIGGERED", {
      chance: effects.rerollChance
    });

    reels = Array.from({ length: 5 }, () =>
      symbols[Math.floor(Math.random() * symbols.length)]
    );

    console.log("🎰 REROLLED REELS:", reels);

    unique = new Set(reels).size;

    if (unique === 1) payout = 1000;
    else if (unique === 2) payout = 500;
    else if (unique === 3) payout = 200;

    console.log("💰 REROLL PAYOUT:", payout);
  }
    // ========================
    // 💰 CLEAN PAYOUT PIPELINE
    // ========================

    // --- BASE ---
    let basePayout = payout;

    // --- BET MULTIPLIER ---
    const baseBet = 100;
    const betMultiplier = bet / baseBet;
    const betAdjustedPayout = Math.floor(basePayout * betMultiplier);

    // --- DECK MULTIPLIER ---
    const deckAdjustedPayout = Math.floor(
      betAdjustedPayout * effects.payoutMult
    );

    // --- PLAYER BOOST ---
    const boostedPayout = Math.floor(
      deckAdjustedPayout * user.payout_boost
    );

    // --- STREAK SYSTEM ---
    let currentStreak = Number(user.win_streak) || 0;

    // determine win BEFORE streak bonus
    let newStreak = boostedPayout > 0 ? currentStreak + 1 : 0;

    let streakBonus = 1 + (newStreak * 0.05);

    // --- FINAL PAYOUT ---
    let finalPayout = Math.floor(
      boostedPayout * streakBonus
    );

    // --- FINAL BALANCE ---
    const newBalance = user.balance - bet + finalPayout;

    // ========================
    // 🔍 DEBUG (CLEAN)
    // ========================
    console.log("💰 FINAL PIPELINE:", {
      basePayout,
      betMultiplier,
      betAdjustedPayout,
      deckMult: effects.payoutMult,
      deckAdjustedPayout,
      playerBoost: user.payout_boost,
      boostedPayout,
      streakBonus,
      multiplier,
      finalPayout
    });

    console.log("🔥 STREAK DEBUG:", {
      previous: currentStreak,
      new: newStreak,
      bonus: streakBonus
    });

  console.log("🔥 STREAK DEBUG:", {
    previous: currentStreak,
    new: newStreak,
    bonus: streakBonus,
    payoutBefore: boostedPayout,
    payoutAfter: finalPayout
  });
  // ---  XP SYSTEM ---
  let xpGain = 5;

  if (payout > 0) xpGain += 10;
  if (payout >= 500) xpGain += 25;

  console.log("⭐ BASE XP:", xpGain);

  // apply deck XP boost
  xpGain = Math.floor(xpGain * effects.xpMult);

  // apply player XP boost
  xpGain = Math.floor(xpGain * user.xp_boost);

  console.log("⭐ FINAL XP GAIN:", xpGain);
// PART OF LEVEL SYSTEM
  let newXP = user.xp + xpGain;
  let newLevel = user.level; 
 /* let newXP = user.xp + xpGain + 10000; // 🔥 FORCE LEVEL UP (DEBUG ONLY)
  let newLevel = user.level;*/

  // --- LEVEL SYSTEM ---
  let xpNeeded = newLevel * 100;
  let levelRewards = [];

  while (newXP >= xpNeeded) {
    newXP -= xpNeeded;
    newLevel++;
    console.log("✅ NEW LEVEL:", newLevel);
    xpNeeded = newLevel * 100;

    if (newLevel > (user.last_rewarded_level || 0)) {
      const reward = getLevelReward(newLevel);
      
      console.log("🎁 REWARD TRIGGERED:", reward);

      if (reward > 0) {
        levelRewards.push({
          level: newLevel,
          amount: reward
        });
      }
    }
  }

  const totalLevelReward = levelRewards.reduce((sum, r) => sum + r.amount, 0);
  // DEBUG
  console.log("📈 LEVEL UPDATE:", {
    newXP,
    newLevel
  });
  console.log("🧠 FINAL PIPELINE:", {
    reels,
    basePayout: payout,
    deckMult: effects.payoutMult,
    afterDeck: deckAdjustedPayout,
    payoutBoost: user.payout_boost,
    xpBoost: user.xp_boost,
    afterPlayer: boostedPayout,
    streak: newStreak,
    final: finalPayout,
    levelRewards,
    totalLevelReward,
    event
  });
  console.log("XP CHECK:", {
    currentXP: user.xp,
    xpGain,
    newXP,
    xpNeeded
  });


  // --- SAVE ---
  await pool.query(
    `UPDATE users 
    SET 
      balance = $1,
      xp = $2,
      level = $3,
      win_streak = $4,
      last_rewarded_level = $5
    WHERE id = $6`,
    [
      newBalance + totalLevelReward, // ✅ APPLY REWARD HERE
      newXP,
      newLevel,
      newStreak,
      newLevel, // ✅ SAVE LAST REWARDED LEVEL
      req.session.userId
    ]
  );

  // --- RESPONSE ---
    res.json({
    reels,
    payout: finalPayout,
    balance: newBalance + totalLevelReward, // ✅ FIXED
    xp: newXP,
    level: newLevel,
    payoutBoost: user.payout_boost,
    xpBoost: user.xp_boost,
    effects,
    event,
    streak: newStreak,
    levelRewards,
    totalLevelReward // ✅ NEW
  });
});
  
// --- UPGRADE: PAYOUT BOOST ---
router.post("/upgrade/payout", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const userId = req.session.userId;

  const result = await pool.query(
    "SELECT balance, payout_boost FROM users WHERE id=$1",
    [userId]
  );

  const user = result.rows[0];

  const cost = 1000;

  if (user.balance < cost) {
    return res.json({ error: "Not enough money" });
  }

  const newBoost = parseFloat(user.payout_boost) + 0.1;
  const newBalance = user.balance - cost;

  await pool.query(
    "UPDATE users SET balance=$1, payout_boost=$2 WHERE id=$3",
    [newBalance, newBoost, userId]
  );

  res.json({
    success: true,
    balance: newBalance,
    payoutBoost: newBoost
  });
});


// --- UPGRADE: XP BOOST ---
router.post("/upgrade/xp", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const userId = req.session.userId;

  const result = await pool.query(
    "SELECT balance, xp_boost FROM users WHERE id=$1",
    [userId]
  );

  const user = result.rows[0];

  const cost = 1000;

  if (user.balance < cost) {
    return res.json({ error: "Not enough money" });
  }

  const newBoost = parseFloat(user.xp_boost || 1) + 0.2;
  const newBalance = user.balance - cost;

  await pool.query(
    "UPDATE users SET balance=$1, xp_boost=$2 WHERE id=$3",
    [newBalance, newBoost, userId]
  );

  res.json({
    success: true,
    balance: newBalance,
    xpBoost: newBoost
  });
});

router.get("/progression", async (req, res) => {
  const userId = req.session.userId;

  const { rows } = await pool.query(
    "SELECT xp, level, payout_boost FROM users WHERE id=$1",
    [userId]
  );

  const player = rows[0];

  res.json({
    xp: player.xp,
    level: player.level,
    payoutBoost: player.payout_boost
  });
});

router.post("/buy-upgrade", async (req, res) => {
  const userId = req.session.userId;

  const { rows } = await pool.query(
    "SELECT balance, payout_boost FROM users WHERE id=$1",
    [userId]
  );

  const player = rows[0];

  const cost = 1000;

  if (player.balance < cost) {
    return res.json({ error: "Not enough money" });
  }

  player.balance -= cost;
  player.payout_boost += 0.1;

  await db.query(
    "UPDATE users SET balance=$1, payout_boost=$2 WHERE id=$3",
    [player.balance, player.payout_boost, userId]
  );

  res.json({
    balance: player.balance,
    payoutBoost: player.payout_boost
  });
});

router.post("/open-crate", async (req, res) => {
  try {
    if (!(await requireLogin(req, res))) return;

    const { type = "basic" } = req.body;

    const costMap = { basic: 100, premium: 250, elite: 500 };
    const cost = costMap[type] || 100;

    const balRes = await pool.query(
      "SELECT balance FROM users WHERE id=$1",
      [req.session.userId]
    );

    let balance = balRes.rows[0].balance;

    if (balance < cost) {
      return res.json({ error: "Not enough balance" });
    }

    balance -= cost;

    await pool.query(
      "UPDATE users SET balance=$1 WHERE id=$2",
      [balance, req.session.userId]
    );

    const rarityPool = {
      basic: ["common","common","rare"],
      premium: ["common","rare","epic"],
      elite: ["rare","epic","legendary"]
    };

    const rewards = [];

    const { cards } = require("../game/cards"); // check this path!

    for (let i = 0; i < 2; i++) {
      const rarity = rarityPool[type][Math.floor(Math.random() * rarityPool[type].length)];

      const poolCards = cards.filter(c => c.rarity === rarity);

      if (poolCards.length === 0) {
        console.error("❌ No cards for rarity:", rarity);
        continue;
      }

      const randomCard = poolCards[Math.floor(Math.random() * poolCards.length)];

      const result = await pool.query(
        "INSERT INTO inventory (user_id, card_id, rarity) VALUES ($1,$2,$3) RETURNING card_id AS id, rarity",
        [req.session.userId, randomCard.id, rarity]
      );

      rewards.push(result.rows[0]);
    }

    res.json({ rewards, balance });

  } catch (err) {
    console.error("🔥 OPEN CRATE ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;