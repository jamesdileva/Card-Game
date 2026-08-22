// 0–100 High/Low game math. Pure — no DB; randomness via Math.random so
// tests can seed it.
//
// Design: the player sees a base number (1-100) and bets that the next roll
// is strictly higher or lower. Ties LOSE (house edge #1). Payout odds are
// fair odds discounted to 95% (house edge #2):
//   "higher than 20" wins on 21-100 → 80 outcomes → fair 100/80 = 1.25x,
//   paid at floor(9500/80)/100 = 1.18x
// Extreme picks ("higher than 99", one outcome) pay up to 95x.
//
// Deck effects follow the coinflip balance rule: streak bonus and flat
// synergy bonuses apply; deck payout multipliers / player boosts do NOT.

const HOUSE_PCT = 95; // percent of fair odds actually paid

function rollHiloNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

// Number of winning outcomes for a guess against `number`.
function outcomesFor(number, direction) {
  if (direction === "higher") return 100 - number;
  if (direction === "lower") return number - 1;
  return -1; // invalid direction
}

// Multiplier applied to bet on a win, or null when the side is impossible.
function payoutMultiplier(number, direction) {
  const outcomes = outcomesFor(number, direction);
  if (outcomes === null || outcomes <= 0) return null;
  return Math.floor((HOUSE_PCT * 100) / outcomes) / 100;
}

function winChancePct(number, direction) {
  const outcomes = outcomesFor(number, direction);
  if (outcomes < 0) return null;
  return outcomes;
}

function computeHiloXP(win, xpMult, playerXpBoost) {
  let xpGain = 5;
  if (win) xpGain += 10;
  xpGain = Math.floor(xpGain * xpMult);
  return Math.floor(xpGain * playerXpBoost);
}

// Play one guess against the stored base number.
function playHilo({ number, direction, bet, effects, winStreak }) {
  const mult = payoutMultiplier(number, direction);

  // Impossible side (base was 1 picking lower, or 100 picking higher).
  if (mult === null) {
    return { valid: false };
  }

  const roll = rollHiloNumber();
  const win = direction === "higher" ? roll > number : roll < number;

  const currentStreak = Number(winStreak) || 0;
  const newStreak = win ? currentStreak + 1 : 0;
  const streakBonus = 1 + newStreak * 0.05;

  let payout = 0;

  if (win) {
    payout = Math.floor(bet * mult * streakBonus);
    if (effects.bonusPayout) {
      payout += effects.bonusPayout;
    }
  }

  return { valid: true, roll, win, mult, payout, newStreak };
}

module.exports = {
  HOUSE_PCT,
  rollHiloNumber,
  outcomesFor,
  payoutMultiplier,
  winChancePct,
  computeHiloXP,
  playHilo
};
