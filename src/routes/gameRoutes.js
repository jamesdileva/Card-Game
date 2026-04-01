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
// AUTH ROUTES
// ====================

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ error: "Missing fields" });

  const hash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
      [username, hash]
    );

    const userId = result.rows[0].id;
    for (let i = 0; i < 3; i++) {
      await pool.query(
        "INSERT INTO deck (user_id, slot, card_id) VALUES ($1, $2, NULL)",
        [userId, i]
      );
    }


    res.json({ status: "registered" });
  } catch {
    res.json({ error: "Username exists" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  const user = result.rows[0];

  if (!user) return res.json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.json({ error: "Invalid credentials" });

  req.session.userId = user.id;

  res.json({ status: "logged_in" });
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ status: "logged_out" });
});


// ====================
// GAME ROUTES
// ====================

router.get("/state", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const result = await pool.query(
    "SELECT balance FROM users WHERE id=$1",
    [req.session.userId]
  );

  res.json({ balance: result.rows[0].balance });
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

  await pool.query("DELETE FROM inventory WHERE user_id=$1", [userId]);
  await pool.query("UPDATE users SET balance = 1000 WHERE id=$1", [userId]);

  await pool.query("UPDATE deck SET card_id = NULL WHERE user_id=$1", [userId]);

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



router.post("/spin", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const { bet = 100 } = req.body;

const balRes = await pool.query(
  "SELECT balance FROM users WHERE id=$1",
  [req.session.userId]
);

if (balRes.rows.length === 0) {
  return res.status(401).json({ error: "User not found" });
}

let balance = balRes.rows[0].balance;

  if (balance < bet)
    return res.json({ error: "Not enough balance" });

  const symbols = ["cherry","lemon","orange","grape","bar","seven","diamond","star"];
  const reels = [0,1,2].map(() => symbols[Math.floor(Math.random()*symbols.length)]);
  const almostWin = Math.random() < 0.25;

  if (almostWin) {
    const symbol = symbols[Math.floor(Math.random()*symbols.length)];
    reels[0] = symbol;
    reels[1] = symbol;
    reels[2] = symbols[Math.floor(Math.random()*symbols.length)];
  }
  let payout = 0;

  if (new Set(reels).size === 1) payout = 500;
  else if (new Set(reels).size === 2) payout = 200;

  balance = balance - bet + payout;

  await pool.query(
    "UPDATE users SET balance=$1 WHERE id=$2",
    [balance, req.session.userId]
  );

  res.json({ reels, payout, balance });
});

router.post("/open-crate", async (req, res) => {
  if (!(await requireLogin(req, res))) return;

  const { type = "basic" } = req.body;

  const costMap = { basic: 100, premium: 250, elite: 500 };
  const cost = costMap[type] || 100;

  const balRes = await pool.query(
    "SELECT balance FROM users WHERE id=$1",
    [req.session.userId]
  );

  let balance = balRes.rows[0].balance;

  if (balance < cost)
    return res.json({ error: "Not enough balance" });

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
  const { cards } = require("../game/cards"); // adjust path if needed

  for (let i = 0; i < 2; i++) {
    const rarity = rarityPool[type][Math.floor(Math.random()*rarityPool[type].length)];
    const poolCards = cards.filter(c => c.rarity === rarity);
    if (poolCards.length === 0) {
      console.error("❌ No cards for rarity:", rarity);
      continue; // skip this reward
    }
    const randomCard = poolCards[Math.floor(Math.random() * poolCards.length)];
    const card_id = randomCard.id;
    const result = await pool.query(
      "INSERT INTO inventory (user_id, card_id, rarity) VALUES ($1,$2,$3) RETURNING card_id AS id, rarity",
      [req.session.userId, card_id, rarity]
    );

    rewards.push(result.rows[0]);
  }

  res.json({ rewards, balance });
});

module.exports = router;