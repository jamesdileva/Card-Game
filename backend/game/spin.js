// Pure spin pipeline math: reels, random events, payout chain, XP/levels.
// No DB access — the route handler loads state, calls these functions,
// and persists the results. All randomness goes through Math.random so
// tests can seed it.

const { calculateDeckEffects, calculateSynergies } = require("./effects");

const SYMBOLS = [
  "cherry", "lemon", "orange", "grape", "clover", "gem", "star", "crown"
];

const BASE_BET = 100;

// Base payout by number of unique symbols on the 5 reels.
function basePayoutFor(reels) {
  const unique = new Set(reels).size;

  if (unique === 1) return 1000;
  if (unique === 2) return 500;
  if (unique === 3) return 200;
  return 0;
}

function rollReels(count = 5) {
  return Array.from({ length: count }, () =>
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
  );
}

// Roll reels once; reroll a total loss based on deck reroll chance.
function rollSpin(effects) {
  let reels = rollReels();
  let payout = basePayoutFor(reels);

  if (payout === 0 && Math.random() < effects.rerollChance) {
    reels = rollReels();
    payout = basePayoutFor(reels);
  }

  return { reels, payout };
}

// RANDOM EVENTS — 15% chance per spin.
function rollRandomEvent() {
  if (Math.random() > 0.15) return null;

  const roll = Math.random();

  if (roll < 0.33) {
    return { type: "DOUBLE_PAYOUT", mult: 2, label: "💰 DOUBLE PAYOUT" };
  }
  else if (roll < 0.66) {
    return { type: "DOUBLE_XP", mult: 2, label: "⚡ DOUBLE XP" };
  }
  else {
    return { type: "LUCK_BOOST", luck: 0.5, label: "🍀 LUCK SURGE" };
  }
}

// Events modify effects before the spin is rolled.
function applyEventToEffects(event, effects) {
  if (!event) return effects;

  if (event.type === "DOUBLE_XP") {
    effects.xpMult *= event.mult;
  }

  if (event.type === "LUCK_BOOST") {
    effects.luck += event.luck;
  }

  return effects;
}

// Payout chain, in order: bet scaling → deck multiplier → player boost →
// streak bonus → event. Win/streak determined BEFORE the streak bonus is
// applied (same as the original inline implementation).
function computePayout({ bet, basePayout, effects, playerBoost, winStreak, event }) {
  const betMultiplier = bet / BASE_BET;
  const betAdjustedPayout = Math.floor(basePayout * betMultiplier);

  const deckAdjustedPayout = Math.floor(
    betAdjustedPayout * effects.payoutMult
  );

  const boostedPayout = Math.floor(
    deckAdjustedPayout * playerBoost
  );

  const currentStreak = Number(winStreak) || 0;
  const newStreak = boostedPayout > 0 ? currentStreak + 1 : 0;
  const streakBonus = 1 + newStreak * 0.05;

  let finalPayout = Math.floor(boostedPayout * streakBonus);

  // Flat synergy bonuses (e.g. Wild Surge) pay on top of everything.
  // Streak/win status is still decided by the reels above, not this bonus.
  if (effects.bonusPayout) {
    finalPayout += effects.bonusPayout;
  }

  if (event?.type === "DOUBLE_PAYOUT") {
    finalPayout = Math.floor(finalPayout * event.mult);
  }

  return { finalPayout, newStreak };
}

// XP gain from base payout, then deck and player XP boosts (floored at each
// step, same as the original).
function computeXP(basePayout, xpMult, playerXpBoost) {
  let xpGain = 5;

  if (basePayout > 0) xpGain += 10;
  if (basePayout >= 500) xpGain += 25;

  xpGain = Math.floor(xpGain * xpMult);
  return Math.floor(xpGain * playerXpBoost);
}

function getLevelReward(level) {
  return 200 + level * 50;
}

function xpToNext(level) {
  return level * 100;
}

// Apply XP to level progression; grant coin rewards for levels above
// lastRewardedLevel (each level rewards only once).
function applyLevels({ xp, level, xpGain, lastRewardedLevel }) {
  let newXP = xp + xpGain;
  let newLevel = level;
  let needed = newLevel * 100;
  const levelRewards = [];

  while (newXP >= needed) {
    newXP -= needed;
    newLevel++;
    needed = newLevel * 100;

    if (newLevel > (lastRewardedLevel || 0)) {
      const amount = getLevelReward(newLevel);
      if (amount > 0) {
        levelRewards.push({ level: newLevel, amount });
      }
    }
  }

  const totalLevelReward = levelRewards.reduce((sum, r) => sum + r.amount, 0);

  return { newXP, newLevel, levelRewards, totalLevelReward };
}

// Slot spin bonus drops. Base odds per design: 90% nothing / 7% coin drop /
// 2% card drop / 1% free elite-crate pull. A deck with lucky_charm shifts
// ~5 percentage points from "nothing" into the drop table.
function rollSpinDrop({ luckyCharm = false } = {}) {
  const nothingChance = luckyCharm ? 0.85 : 0.9;
  const roll = Math.random();

  if (roll < nothingChance) return null;

  const kindRoll = Math.random();

  if (kindRoll < 0.7) {
    // coins scale with bet so it stays relevant at higher multipliers
    return { type: "coins" };
  }
  if (kindRoll < 0.9) {
    return { type: "card" };
  }
  return { type: "crate" };
}

module.exports = {
  SYMBOLS,
  BASE_BET,
  basePayoutFor,
  rollReels,
  rollSpin,
  rollRandomEvent,
  applyEventToEffects,
  computePayout,
  computeXP,
  getLevelReward,
  xpToNext,
  applyLevels,
  rollSpinDrop
};
