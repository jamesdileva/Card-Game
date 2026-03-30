const express = require("express");
const router = express.Router();
const { spinSlot } = require("../game/slot");
const { openCrate } = require("../game/crate");

// TEMP fake user
let balance = 1000;
let inventory = [];
let deck = ["lucky_charm", "double_down", "none"];

router.post("/open-crate", (req, res) => {
  const { type } = req.body;

  const costs = {
    basic: 100,
    premium: 300,
    elite: 700
  };

  const cost = costs[type];

  if (!cost) {
    return res.json({ error: "Invalid crate type" });
  }

  if (balance < cost) {
    return res.json({ error: "Not enough balance" });
  }

  balance -= cost;

  const rewards = openCrate(type);

  // ADD TO INVENTORY
  inventory.push(...rewards.map(card => card.id));

  res.json({
    type,
    rewards,
    inventory,
    balance
  });
});

router.post("/spin", (req, res) => {
  const { bet } = req.body;

  if (bet > balance) {
    return res.json({ error: "Not enough balance" });
  }

  // subtract bet
  balance -= bet;

  const result = spinSlot(bet, deck);
  // add winnings
  balance += result.payout;

  res.json({
    reels: result.reels,
    payout: result.payout,
    balance: balance
  });
});

router.get("/inventory", (req, res) => {
  res.json({ inventory });
});

router.post("/set-deck", (req, res) => {
  const { newDeck } = req.body;

  if (!Array.isArray(newDeck) || newDeck.length !== 3) {
    return res.json({ error: "Deck must have 3 cards" });
  }

  // check if player owns cards
  for (let card of newDeck) {
    if (!inventory.includes(card)) {
      return res.json({ error: `You don't own ${card}` });
    }
  }

  deck = newDeck;

  res.json({ deck });
});

module.exports = router;
console.log("Inventory:", inventory);