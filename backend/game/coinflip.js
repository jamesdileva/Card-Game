// Coin flip game math. Pure — no DB; randomness via Math.random so tests
// can seed it.
//
// Balance design: 50/50 even-money (2x total return on win). Deck payout
// multipliers and player boosts are deliberately NOT applied here — a 50%
// win chance scaled by an x8 mythic deck would print money compared to the
// slots' RTP. Streak bonus and flat synergy bonuses DO apply, matching slot
// behavior for streaks.

const { calculateDeckEffects, calculateSynergies } = require("./effects");

function flipCoin() {
  return Math.random() < 0.5 ? "heads" : "tails";
}

// XP tiers for coinflip: base 5, +10 on a win (same shape as slots).
function computeCoinflipXP(win, xpMult, playerXpBoost) {
  let xpGain = 5;
  if (win) xpGain += 10;
  xpGain = Math.floor(xpGain * xpMult);
  return Math.floor(xpGain * playerXpBoost);
}

// Play one flip. `choice` is "heads" or "tails".
function playCoinflip({ bet, choice, effects, winStreak }) {
  const flip = flipCoin();
  const win = flip === choice;

  const currentStreak = Number(winStreak) || 0;
  const newStreak = win ? currentStreak + 1 : 0;
  const streakBonus = 1 + newStreak * 0.05;

  let payout = 0;

  if (win) {
    // Even money: stake back + equal winnings, then streak bonus.
    payout = Math.floor(bet * 2 * streakBonus);

    // Flat synergy bonuses apply like on slots.
    if (effects.bonusPayout) {
      payout += effects.bonusPayout;
    }
  }

  return { flip, win, payout, newStreak };
}

module.exports = {
  flipCoin,
  playCoinflip,
  computeCoinflipXP,
  calculateDeckEffects,
  calculateSynergies
};
