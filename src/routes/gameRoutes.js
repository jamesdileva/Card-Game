const express = require("express");
const router = express.Router();
const { spinSlot } = require("../game/slot");

// TEMP fake user
let balance = 1000;

// TEMP deck (3 cards)
let deck = ["lucky_charm", "double_down", "none"];

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

module.exports = router;