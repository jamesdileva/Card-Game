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

exports.spinSlot = (bet) => {
  const reels = [rollSymbol(), rollSymbol(), rollSymbol()];
  const payout = calculatePayout(reels, bet);

  return { reels, payout };
};

exports.spinSlot = (bet, deck) => {
  let reels = [rollSymbol(), rollSymbol(), rollSymbol()];

  // 🎴 apply deck effects
  if (deck.includes("lucky_charm")) {
    // reroll one bad symbol randomly
    for (let i = 0; i < reels.length; i++) {
      if (reels[i] === "cherry" || reels[i] === "lemon") {
        if (Math.random() < 0.2) {
          reels[i] = rollSymbol();
        }
      }
    }
  }

  let payout = calculatePayout(reels, bet);

  // double down card
  if (deck.includes("double_down") && payout > 0) {
    if (Math.random() < 0.1) {
      payout *= 2;
    }
  }

  return { reels, payout };
};