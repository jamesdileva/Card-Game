const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");

// ====================
// REGISTER
// ====================
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length < 3 ||
    username.length > 20 ||
    !/^[a-zA-Z0-9_]+$/.test(username) ||
    password.length < 4 ||
    password.length > 100
  ) {
    return res.status(400).json({
      error: "Invalid input (username: 3-20 chars letters/numbers/_; password: 4-100 chars)"
    });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const result = db
      .prepare(
        "INSERT INTO users (username, password) VALUES (?, ?) RETURNING id"
      )
      .get(username, hash);

    const userId = result.id;

    // create empty deck
    for (let i = 0; i < 3; i++) {
      db.prepare(
        "INSERT INTO deck (user_id, slot, card_id) VALUES (?, ?, NULL)"
      ).run(userId, i);
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

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length === 0 ||
    username.length > 20 ||
    password.length === 0 ||
    password.length > 100
  ) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE username=?")
    .get(username);

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
    db.prepare(
      `UPDATE users 
       SET balance = balance + ?,
           login_streak = ?,
           last_login = ?
       WHERE id = ?`
    ).run(reward, streak, today, user.id);
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

// ====================
// LOGOUT
// ====================
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ status: "logged_out" });
  });
});

module.exports = router;