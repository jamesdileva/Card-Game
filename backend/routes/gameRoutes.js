const express = require("express");
const router = express.Router();
const db = require("../db");
const { calculateDeckEffects, calculateSynergies } = require("../game/effects");
const { cards } = require("../game/cards");
const {
  rollSpin,
  rollRandomEvent,
  applyEventToEffects,
  computePayout,
  computeXP,
  applyLevels
} = require("../game/spin");

// --- HELPER ---
async function requireLogin(req, res) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not logged in" });
    return false;
  }

  const user = db
    .prepare("SELECT id FROM users WHERE id=?")
    .get(req.session.userId);

  if (!user) {
    req.session.destroy();
    res.status(401).json({ error: "Session expired" });
    return false;
  }

  return true;
}

// Dev/debug routes must never run against production.
function devOnly(req, res, next) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  next();
}


// ====================
// GAME ROUTES
// ====================

router.get("/state", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  // ✅ USER
  const user = db
    .prepare("SELECT * FROM users WHERE id=?")
    .get(req.session.userId);

  // ✅ INVENTORY
  const invResult = db
    .prepare("SELECT card_id, rarity FROM inventory WHERE user_id=?")
    .all(req.session.userId);

  const stacked = {};

  invResult.forEach(c => {
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
  const deckResult = db.prepare(`
    SELECT slot, card_id
    FROM deck
    WHERE user_id = ?
    ORDER BY slot
  `).all(req.session.userId);

  const deck = [null, null, null];

  deckResult.forEach(row => {
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

  const result = db
    .prepare("SELECT card_id, rarity FROM inventory WHERE user_id=?")
    .all(req.session.userId);

  const stacked = {};

  result.forEach(c => {
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

router.post("/dev-add-card", devOnly, async (req, res) => {
  const userId = req.session.userId;
  const { card_id, rarity } = req.body;

  if (!userId) return res.status(401).json({ error: "Not logged in" });

  db.prepare(
    "INSERT INTO inventory (user_id, card_id, rarity) VALUES (?,?,?)"
  ).run(userId, card_id, rarity || "common");

  res.json({ success: true });
});

router.post("/reset-account", devOnly, async (req, res) => {
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ error: "Not logged in" });

  // 🔥 CLEAR INVENTORY
  db.prepare("DELETE FROM inventory WHERE user_id=?").run(userId);

  // 🔥 RESET BALANCE
  db.prepare(
    "UPDATE users SET balance = 1000 WHERE id=?"
  ).run(userId);

  // 🔥 RESET DECK
  db.prepare(
    "UPDATE deck SET card_id = NULL WHERE user_id=?"
  ).run(userId);

  res.json({ success: true });
});

router.post("/clear-inventory", devOnly, async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  db.prepare(
    "DELETE FROM inventory WHERE user_id = ?"
  ).run(userId);

  res.json({ success: true });
});

router.post("/add-balance", devOnly, async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // ✅ Add 10,000 (not 1,000)
    db.prepare(
      "UPDATE users SET balance = balance + 10000 WHERE id = ?"
    ).run(userId);

    // ✅ RETURN UPDATED BALANCE
    const result = db
      .prepare("SELECT balance FROM users WHERE id = ?")
      .get(userId);

    res.json({ balance: result.balance });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add balance" });
  }
});



router.get("/deck", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const result = db.prepare(`
    SELECT d.slot, d.card_id, i.rarity
    FROM deck d
    LEFT JOIN inventory i
    ON d.card_id = i.card_id AND i.user_id = d.user_id
    WHERE d.user_id = ?
    ORDER BY d.slot
  `).all(req.session.userId);

    if (result.length === 0) {
  for (let i = 0; i < 3; i++) {
    db.prepare(
      "INSERT INTO deck (user_id, slot, card_id) VALUES (?, ?, NULL)"
    ).run(req.session.userId, i);
  }
}
  const deck = [null, null, null];
  result.forEach(row => {
    deck[row.slot] = row.card_id
    ? { id: row.card_id, rarity: row.rarity || "common" }
    : null;
  });

  res.json({ deck });
});

// ====================
// DEV ROUTES (ONLY USE IN DEV)
// ====================

router.post("/dev-reset", devOnly, async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    // Reset balance
    db.prepare(
      "UPDATE users SET balance = 10000 WHERE id = ?"
    ).run(userId);

    // Clear inventory
    db.prepare(
      "DELETE FROM inventory WHERE user_id = ?"
    ).run(userId);

    // Reset deck
    for (let i = 0; i < 3; i++) {
      db.prepare(`
        INSERT INTO deck (user_id, slot, card_id)
        VALUES (?, ?, NULL)
        ON CONFLICT (user_id, slot)
        DO UPDATE SET card_id = NULL
      `).run(userId, i);
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

  for (let i = 0; i < 3; i++) {
    const cardId = newDeck[i] || null; // ✅ FIX

    db.prepare(`
      INSERT INTO deck (user_id, slot, card_id)
      VALUES (?, ?, ?)
      ON CONFLICT (user_id, slot)
      DO UPDATE SET card_id = excluded.card_id
    `).run(req.session.userId, i, cardId);
  }

  res.json({ status: "ok" });
});

// SPIN
router.post("/spin", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const { bet = 100 } = req.body;
  const deckResult = db
    .prepare("SELECT slot, card_id FROM deck WHERE user_id=? ORDER BY slot")
    .all(req.session.userId);

  const deck = [null, null, null];
  deckResult.forEach(row => {
    deck[row.slot] = row.card_id;
  });
  // --- GET USER ---
  const user = db.prepare(`
    SELECT balance, xp, level, payout_boost, xp_boost, win_streak, last_rewarded_level
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (user.balance < bet) {
    return res.json({ error: "Not enough balance" });
  }

  // --- 🎴 DECK EFFECTS + SYNERGIES ---
  const effects = calculateDeckEffects(deck);
  calculateSynergies(deck, effects);

  // --- ⚡ RANDOM EVENT ---
  // Events must NOT mutate `effects` — the response returns the pure deck
  // effects so the UI stats bar stays stable. Math happens on a copy.
  const event = rollRandomEvent();
  const spinEffects = applyEventToEffects(event, { ...effects });

  // --- 🎰 ROLL REELS (+ deck reroll chance) ---
  const { reels, payout: basePayout } = rollSpin(spinEffects);

  // --- 💰 PAYOUT CHAIN (bet → deck → boost → streak → bonus → event) ---
  const { finalPayout, newStreak } = computePayout({
    bet,
    basePayout,
    effects: spinEffects,
    playerBoost: user.payout_boost,
    winStreak: user.win_streak,
    event
  });

  const newBalance = user.balance - bet + finalPayout;

  // --- ⭐ XP + LEVELS ---
  const xpGain = computeXP(basePayout, spinEffects.xpMult, user.xp_boost);
  const { newXP, newLevel, levelRewards, totalLevelReward } = applyLevels({
    xp: user.xp,
    level: user.level,
    xpGain,
    lastRewardedLevel: user.last_rewarded_level
  });

  // --- SAVE ---
  db.prepare(`
    UPDATE users
    SET 
      balance = ?,
      xp = ?,
      level = ?,
      win_streak = ?,
      last_rewarded_level = ?
    WHERE id = ?
  `).run(
      newBalance + totalLevelReward,
      newXP,
      newLevel,
      newStreak,
      newLevel,
      req.session.userId
  );

  // --- RESPONSE ---
  res.json({
    reels,
    payout: finalPayout,
    balance: newBalance + totalLevelReward,
    xp: newXP,
    level: newLevel,
    payoutBoost: user.payout_boost,
    xpBoost: user.xp_boost,
    effects,
    event,
    streak: newStreak,
    levelRewards,
    totalLevelReward
  });
});
  
// --- UPGRADE: PAYOUT BOOST ---
router.post("/upgrade/payout", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const userId = req.session.userId;

  const user = db
    .prepare("SELECT balance, payout_boost FROM users WHERE id=?")
    .get(userId);

  const cost = 1000;

  if (user.balance < cost) {
    return res.json({ error: "Not enough money" });
  }

  const newBoost = parseFloat(user.payout_boost) + 0.1;
  const newBalance = user.balance - cost;

  db.prepare(
    "UPDATE users SET balance=?, payout_boost=? WHERE id=?"
  ).run(newBalance, newBoost, userId);

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

  const user = db
    .prepare("SELECT balance, xp_boost FROM users WHERE id=?")
    .get(userId);

  const cost = 1000;

  if (user.balance < cost) {
    return res.json({ error: "Not enough money" });
  }

  const newBoost = parseFloat(user.xp_boost || 1) + 0.2;
  const newBalance = user.balance - cost;

  db.prepare(
    "UPDATE users SET balance=?, xp_boost=? WHERE id=?"
  ).run(newBalance, newBoost, userId);

  res.json({
    success: true,
    balance: newBalance,
    xpBoost: newBoost
  });
});

router.get("/progression", async (req, res) => {
  const userId = req.session.userId;

  const player = db
    .prepare("SELECT xp, level, payout_boost FROM users WHERE id=?")
    .get(userId);

  res.json({
    xp: player.xp,
    level: player.level,
    payoutBoost: player.payout_boost
  });
});

router.post("/open-crate", async (req, res) => {
  try {
    if (!(await requireLogin(req, res))) return;

    const { type = "basic" } = req.body;

    const costMap = { basic: 100, premium: 250, elite: 500 };
    const cost = costMap[type] || 100;

    const balRes = db
      .prepare("SELECT balance FROM users WHERE id=?")
      .get(req.session.userId);

    let balance = balRes.balance;

    if (balance < cost) {
      return res.json({ error: "Not enough balance" });
    }

    balance -= cost;

    db.prepare(
      "UPDATE users SET balance=? WHERE id=?"
    ).run(balance, req.session.userId);

    const rarityPool = {
      basic: ["common","common","rare"],
      premium: ["common","rare","epic"],
      elite: ["rare","epic","legendary"]
    };

    const rewards = [];

    for (let i = 0; i < 2; i++) {
      const rarity = rarityPool[type][Math.floor(Math.random() * rarityPool[type].length)];

      const poolCards = cards.filter(c => c.rarity === rarity);

      if (poolCards.length === 0) {
        console.error("❌ No cards for rarity:", rarity);
        continue;
      }

      const randomCard = poolCards[Math.floor(Math.random() * poolCards.length)];

      const result = db
        .prepare(
          "INSERT INTO inventory (user_id, card_id, rarity) VALUES (?,?,?) RETURNING card_id AS id, rarity"
        )
        .get(req.session.userId, randomCard.id, rarity);

      rewards.push(result);
    }

    res.json({ rewards, balance });

  } catch (err) {
    console.error("🔥 OPEN CRATE ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;