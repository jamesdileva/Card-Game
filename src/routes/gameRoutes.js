const express = require("express");
const router = express.Router();

const { spinSlot } = require("../game/slot");
const { openCrate } = require("../game/crate");

// TEMP DATA (resets on restart)
let balance = 1000;
let inventory = [];
let deck = ["none", "none", "none"];

// 📦 OPEN CRATE
router.post("/open-crate", (req, res) => {
  const { type } = req.body;

  const costs = {
    basic: 100,
    premium: 300,
    elite: 700
  };

  const cost = costs[type];

  if (!cost) return res.json({ error: "Invalid crate type" });
  if (balance < cost) return res.json({ error: "Not enough balance" });

  balance -= cost;

  const rewards = openCrate(type);

  inventory.push(...rewards);

  res.json({
    type,
    rewards,
    inventory,
    balance
  });
});
// STATE
router.get("/state", (req, res) => {
  res.json({
    balance,
    inventory,
    deck
  });
});

// 🎰 SPIN
router.post("/spin", (req, res) => {
  const { bet } = req.body;

  if (bet > balance) return res.json({ error: "Not enough balance" });

  balance -= bet;

  const result = spinSlot(bet, deck);

  balance += result.payout;

  res.json({
    reels: result.reels,
    payout: result.payout,
    balance
  });
});

// 🎴 INVENTORY
router.get("/inventory", (req, res) => {
  res.json({ inventory });
});

// 🎮 DECK
router.get("/deck", (req, res) => {
  res.json({ deck });
});

// 🔧 SET DECK
router.post("/set-deck", (req, res) => {
  const { newDeck } = req.body;

  if (!Array.isArray(newDeck) || newDeck.length !== 3) {
    return res.json({ error: "Deck must have 3 cards" });
  }

  for (let card of newDeck) {
  const ownsCard = inventory.some(item => item.id === card);

  if (card !== "none" && !ownsCard) {
    return res.json({ error: `You don't own ${card}` });
  }
}

  deck = newDeck;

  res.json({ deck });
});

module.exports = router;