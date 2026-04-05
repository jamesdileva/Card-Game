const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../../db");

// ====================
// REGISTER
// ====================
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ error: "Missing fields" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1,$2) RETURNING id",
      [username, hash]
    );

    const userId = result.rows[0].id;

    // create empty deck
    for (let i = 0; i < 3; i++) {
      await pool.query(
        "INSERT INTO deck (user_id, slot, card_id) VALUES ($1,$2,NULL)",
        [userId, i]
      );
    }

    res.json({ success: true });

  } catch (err) {
    res.json({ error: "User exists" });
  }
});


// ====================
// LOGIN + DAILY REWARD
// ====================
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ error: "Invalid login" });
  }

  // =========================
  // 🎁 DAILY LOGIN REWARD (MOVE UP HERE)
  // =========================
  const today = new Date().toISOString().slice(0, 10);

  let reward = 0;
  let streak = user.login_streak || 0;
  let lastLogin = user.last_login;

  if (!lastLogin) {
    streak = 1;
    reward = 100;
  } else {
    const last = new Date(lastLogin);
    const now = new Date(today);

    const diffDays = Math.floor(
      (now - last) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      streak += 1;
      reward = 100 + (streak * 50);
    } else if (diffDays > 1) {
      streak = 1;
      reward = 100;
    } else {
      reward = 0;
    }
  }

  // 💰 APPLY REWARD
  if (reward > 0) {
    await pool.query(
      `UPDATE users 
       SET balance = balance + $1,
           login_streak = $2,
           last_login = $3
       WHERE id = $4`,
      [reward, streak, today, user.id]
    );
  }

  // ✅ SESSION
  req.session.userId = user.id;
  req.session.loginReward = reward;

  // ✅ RESPONSE (NOW VALUES EXIST)
  res.json({
    status: "logged_in",
    loginReward: reward,
    loginStreak: streak,
    lastLogin: today
  });
});

module.exports = router;