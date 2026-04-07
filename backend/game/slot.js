function rollSymbol() {
  const r = Math.random();

  if (r < 0.35) return "cherry";
  if (r < 0.65) return "lemon";
  if (r < 0.85) return "diamond";
  if (r < 0.95) return "star";
  return "jackpot";
}

function calculatePayout(reels, bet) {
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    switch (reels[0]) {
      case "cherry": return bet * 2;
      case "lemon": return bet * 3;
      case "diamond": return bet * 6;
      case "star": return bet * 15;
      case "jackpot": return bet * 100;
    }
  }
  return 0;
}

exports.spinSlot = (bet, deck = []) => {
  console.log("🎴 DECK:", deck);

  let reels = [rollSymbol(), rollSymbol(), rollSymbol()];

  // 🎴 LUCKY CHARM (reroll bad symbols)
  if (deck.includes("lucky_charm")) {
    for (let i = 0; i < reels.length; i++) {
      if (["cherry","lemon"].includes(reels[i]) && Math.random() < 0.2) {
        console.log("🍀 Lucky Charm rerolling", reels[i]);
        reels[i] = rollSymbol();
      }
    }
  }

  // 💰 BASE PAYOUT
  let payout = calculatePayout(reels, bet);

  // 💥 DOUBLE DOWN
  if (deck.includes("double_down") && payout > 0) {
    if (Math.random() < 0.1) {
      console.log("💥 DOUBLE DOWN TRIGGERED");
      payout *= 2;
    }
  }

  console.log("🎰 SPIN RESULT:", {
    reels,
    payout
  });

  return { reels, payout };
};