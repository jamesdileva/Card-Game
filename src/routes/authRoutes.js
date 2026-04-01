const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../../db"); // ✅ NOT ../db

// REGISTER
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  try {
    const user = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1,$2) RETURNING id",
      [username, hash]
    );

    await pool.query(
      "INSERT INTO decks (user_id, slot1, slot2, slot3) VALUES ($1,NULL,NULL,NULL)",
      [user.rows[0].id]
    );

    res.json({ success: true });

  } catch (err) {
    res.json({ error: "User exists" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await pool.query(
    "SELECT * FROM users WHERE username=$1",
    [username]
  );

  if (!user.rows.length) {
    return res.status(401).json({ error: "Invalid login" });
  }

  const valid = await bcrypt.compare(password, user.rows[0].password);

  if (!valid) {
    return res.status(401).json({ error: "Invalid login" });
  }

  req.session.userId = user.rows[0].id;

  res.json({ success: true });
});

module.exports = router;