const express = require("express");
const router = express.Router();
const db = require("../db");
const { calculateDeckEffects, calculateSynergies } = require("../game/effects");
const { cards, getRandomCard } = require("../game/cards");
const {
  rollSpin,
  rollRandomEvent,
  applyEventToEffects,
  computePayout,
  computeXP,
  applyLevels,
  rollSpinDrop
} = require("../game/spin");
const {
  CRATE_TYPES,
  TIMED_UNLOCK_SECONDS,
  openCrate: openCrateRoll
} = require("../game/crates");
const { MERGE_COST, canEvolve, pickEvolvedCard } = require("../game/evolution");
const { playCoinflip, computeCoinflipXP } = require("../game/coinflip");
const {
  rollHiloNumber,
  playHilo,
  payoutMultiplier,
  winChancePct,
  computeHiloXP
} = require("../game/hilo");
const {
  sanitizeBet,
  sanitizeDeckShape,
  validateDeckOwnership
} = require("../game/validate");

// Insert a reward card into a user's inventory; returns the stored row.
function insertReward(userId, reward) {
  return db
    .prepare(
      "INSERT INTO inventory (user_id, card_id, rarity) VALUES (?,?,?) RETURNING card_id AS id, rarity"
    )
    .get(userId, reward.id, reward.rarity || "common");
}

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
    effects,
    pendingCrate: user.pending_crate ? JSON.parse(user.pending_crate) : null
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

  const shaped = sanitizeDeckShape(req.body?.newDeck);
  if (!shaped.ok) {
    return res.status(400).json({ error: shaped.error });
  }

  // Server-side ownership check (no longer trusts the client).
  const invRows = db
    .prepare("SELECT card_id, COUNT(*) AS count FROM inventory WHERE user_id=? GROUP BY card_id")
    .all(req.session.userId);
  const inventoryCounts = {};
  invRows.forEach((r) => { inventoryCounts[r.card_id] = r.count; });

  const owned = validateDeckOwnership(shaped.deck, inventoryCounts);
  if (!owned.ok) {
    return res.status(400).json({ error: owned.error });
  }

  const newDeck = shaped.deck;

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

  const bet = sanitizeBet(req.body?.bet ?? 100);
  if (bet === null) {
    return res.status(400).json({ error: "Invalid bet" });
  }

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

  // --- 🎁 SPIN BONUS DROP ---
  const drop = rollSpinDrop({ luck: effects.luck });
  let dropInfo = null;

  if (drop?.type === "coins") {
    // 0.5x–2x bet, added on top of the spin result
    const amount = Math.floor(bet * (0.5 + Math.random() * 1.5));
    dropInfo = { type: "coins", amount };
  } else if (drop?.type === "card") {
    const card = getRandomCard();
    insertReward(req.session.userId, card);
    dropInfo = { type: "card", id: card.id, rarity: card.rarity };
  } else if (drop?.type === "crate") {
    // free elite pull, opened on the spot
    const freeCrate = openCrateRoll("elite");
    const crateRewards = freeCrate.rewards.map((r) =>
      insertReward(req.session.userId, r)
    );
    dropInfo = {
      type: "crate",
      label: freeCrate.label,
      rewards: crateRewards,
      bonusRewards: freeCrate.bonusRewards
        ? freeCrate.bonusRewards.map((r) => insertReward(req.session.userId, r))
        : null
    };
  }
  if (dropInfo?.type === "coins") newBalance += dropInfo.amount;

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
    totalLevelReward,
    drop: dropInfo
  });
});

// COIN FLIP
router.post("/coinflip", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const bet = sanitizeBet(req.body?.bet);
  if (bet === null) {
    return res.status(400).json({ error: "Invalid bet" });
  }

  const choice = req.body?.choice;
  if (choice !== "heads" && choice !== "tails") {
    return res.status(400).json({ error: "Pick heads or tails" });
  }

  const user = db.prepare(`
    SELECT balance, xp, level, xp_boost, win_streak, last_rewarded_level
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (user.balance < bet) {
    return res.json({ error: "Not enough balance" });
  }

  const deckResult = db
    .prepare("SELECT slot, card_id FROM deck WHERE user_id=? ORDER BY slot")
    .all(req.session.userId);

  const deck = [null, null, null];
  deckResult.forEach(row => {
    deck[row.slot] = row.card_id;
  });

  const effects = calculateDeckEffects(deck);
  calculateSynergies(deck, effects);

  const { flip, win, payout, newStreak } = playCoinflip({
    bet,
    choice,
    effects,
    winStreak: user.win_streak
  });

  const newBalance = user.balance - bet + payout;

  // --- ⭐ XP + LEVELS ---
  const xpGain = computeCoinflipXP(win, effects.xpMult || 1, user.xp_boost);
  const { newXP, newLevel, levelRewards, totalLevelReward } = applyLevels({
    xp: user.xp,
    level: user.level,
    xpGain,
    lastRewardedLevel: user.last_rewarded_level || 0
  });

  db.prepare(`
    UPDATE users
    SET
      balance = ?,
      xp = ?,
      level = ?,
      win_streak = ?
    WHERE id = ?
  `).run(
      newBalance + totalLevelReward,
      newXP,
      newLevel,
      newStreak,
      req.session.userId
  );

  res.json({
    choice,
    flip,
    win,
    payout,
    balance: newBalance + totalLevelReward,
    xp: newXP,
    level: newLevel,
    streak: newStreak,
    levelRewards,
    totalLevelReward
  });
});

// HIGH / LOW (0-100)
router.post("/highlow", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const action = req.body?.action;

  // --- START: roll a base number, no bet ---
  if (action === "start") {
    const number = rollHiloNumber();
    req.session.hiloNumber = number;
    return res.json({ number });
  }

  // --- GUESS: bet higher or lower ---
  if (action === "guess") {
    const bet = sanitizeBet(req.body?.bet);
    if (bet === null) {
      return res.status(400).json({ error: "Invalid bet" });
    }

    if (req.session.hiloNumber === undefined || req.session.hiloNumber === null) {
      return res.status(400).json({ error: "Start a round first" });
    }

    const direction = req.body?.direction;
    const base = req.session.hiloNumber;

    if (payoutMultiplier(base, direction) === null) {
      return res.status(400).json({
        error: "No winning outcomes for that side — take the other one"
      });
    }

    const user = db.prepare(`
      SELECT balance, xp, level, xp_boost, win_streak, last_rewarded_level
      FROM users
      WHERE id = ?
    `).get(req.session.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.balance < bet) {
      return res.json({ error: "Not enough balance" });
    }

    const deckResult = db
      .prepare("SELECT slot, card_id FROM deck WHERE user_id=? ORDER BY slot")
      .all(req.session.userId);

    const deck = [null, null, null];
    deckResult.forEach(row => {
      deck[row.slot] = row.card_id;
    });

    const effects = calculateDeckEffects(deck);
    calculateSynergies(deck, effects);

    const outcome = playHilo({
      number: base,
      direction,
      bet,
      effects,
      winStreak: user.win_streak
    });

    if (!outcome.valid) {
      return res.status(400).json({ error: "Invalid guess" });
    }

    const { roll, win, mult, payout, newStreak } = outcome;
    const newBalance = user.balance - bet + payout;

    // The roll becomes the next round's base.
    req.session.hiloNumber = roll;

    const xpGain = computeHiloXP(win, effects.xpMult || 1, user.xp_boost);
    const { newXP, newLevel, levelRewards, totalLevelReward } = applyLevels({
      xp: user.xp,
      level: user.level,
      xpGain,
      lastRewardedLevel: user.last_rewarded_level || 0
    });

    db.prepare(`
      UPDATE users
      SET
        balance = ?,
        xp = ?,
        level = ?,
        win_streak = ?
      WHERE id = ?
    `).run(
        newBalance + totalLevelReward,
        newXP,
        newLevel,
        newStreak,
        req.session.userId
    );

    return res.json({
      number: roll,
      previous: base,
      direction,
      win,
      mult,
      payout,
      balance: newBalance + totalLevelReward,
      xp: newXP,
      level: newLevel,
      streak: newStreak,
      levelRewards,
      totalLevelReward
    });
  }

  return res.status(400).json({ error: "Unknown action" });
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

    const type = req.body?.type;

    if (!CRATE_TYPES[type]) {
      return res.status(400).json({ error: "Invalid crate type" });
    }

    const user = db
      .prepare("SELECT balance, pending_crate FROM users WHERE id=?")
      .get(req.session.userId);

    // --- ⏳ TIMED CRATE: buy → wait → claim ---
    if (type === "timed") {
      const pending = user.pending_crate ? JSON.parse(user.pending_crate) : null;
      const now = Date.now();

      // No pending → purchase one.
      if (!pending) {
        const cost = CRATE_TYPES.timed.cost;
        if (user.balance < cost) {
          return res.json({ error: "Not enough balance" });
        }

        const unlockAt = now + TIMED_UNLOCK_SECONDS * 1000;
        db.prepare(
          "UPDATE users SET balance = balance - ?, pending_crate = ? WHERE id=?"
        ).run(cost, JSON.stringify({ type: "timed", unlockAt }), req.session.userId);

        return res.json({
          pending: true,
          unlockAt,
          seconds: TIMED_UNLOCK_SECONDS,
          balance: user.balance - cost
        });
      }

      // Pending but still locked.
      if (now < pending.unlockAt) {
        return res.status(400).json({
          error: "Timed crate is still unlocking",
          remainingSeconds: Math.ceil((pending.unlockAt - now) / 1000)
        });
      }

      // Ready — open it and clear the slot.
      const opened = openCrateRoll("timed");
      const rewards = opened.rewards.map((r) => insertReward(req.session.userId, r));
      let bonusRewards = null;
      if (opened.bonusRewards) {
        bonusRewards = opened.bonusRewards.map((r) => insertReward(req.session.userId, r));
      }

      db.prepare("UPDATE users SET pending_crate = NULL WHERE id=?").run(
        req.session.userId
      );

      return res.json({ rewards, bonusRewards, balance: user.balance });
    }

    // --- STANDARD CRATES ---
    const cost = CRATE_TYPES[type].cost;

    if (user.balance < cost) {
      return res.json({ error: "Not enough balance" });
    }

    const opened = openCrateRoll(type);
    const rewards = opened.rewards.map((r) => insertReward(req.session.userId, r));
    let bonusRewards = null;
    if (opened.bonusRewards) {
      bonusRewards = opened.bonusRewards.map((r) => insertReward(req.session.userId, r));
    }

    const newBalance = user.balance - cost;
    db.prepare("UPDATE users SET balance=? WHERE id=?").run(
      newBalance,
      req.session.userId
    );

    res.json({ rewards, bonusRewards, label: opened.label, balance: newBalance });
  } catch (err) {
    console.error("🔥 OPEN CRATE ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// EVOLVE: merge 3 duplicates into one random card of the next rarity
router.post("/evolve", async (req, res) => {
  try {
    if (!(await requireLogin(req, res))) return;

    const cardId = req.body?.cardId;
    if (typeof cardId !== "string" || cardId.length === 0) {
      return res.status(400).json({ error: "Missing cardId" });
    }

    const rows = db
      .prepare("SELECT id AS inv_id, rarity FROM inventory WHERE user_id=? AND card_id=?")
      .all(req.session.userId, cardId);

    if (rows.length === 0) {
      return res.status(400).json({ error: `You do not own ${cardId}` });
    }
    if (!canEvolve(rows.length, rows[0].rarity)) {
      return res.status(400).json({
        error:
          rows[0].rarity === "legendary"
            ? "Legendary cards cannot evolve further"
            : `Evolving needs ${MERGE_COST} copies — you have ${rows.length}`
      });
    }

    const evolved = pickEvolvedCard(rows[0].rarity);

    // remove MERGE_COST copies, then insert the evolved card
    const remove = db.prepare(
      "DELETE FROM inventory WHERE id=?"
    );
    const tx = db.transaction(() => {
      for (let i = 0; i < MERGE_COST; i++) remove.run(rows[i].inv_id);
      return insertReward(req.session.userId, evolved);
    });
    const inserted = tx.immediate();

    res.json({
      consumed: { id: cardId, count: MERGE_COST },
      evolved: inserted,
      message: `Merged ${MERGE_COST}× ${cardId} into ${inserted.id}`
    });
  } catch (err) {
    console.error("🔥 EVOLVE ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;