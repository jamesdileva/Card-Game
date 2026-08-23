// Deck effects + synergies. Pure functions — no DB, no randomness.
// Extracted verbatim from routes/gameRoutes.js so the spin pipeline can be
// unit-tested directly.

function calculateDeckEffects(deck, mutations = {}, corruptedSet = new Set()) {
  const effects = {
    payoutMult: 1,
    xpMult: 1,
    rerollChance: 0,
    luck: 1,
    streakBonusRate: 0.05, // per-win streak bonus growth (Hot Streak raises it)
    jackpotSurge: 0,       // total chance a win pays ×5
    safetyNetRefund: 0     // fraction of bet refunded on losing spins
  };

  // Mutated copies (from card evolution) empower their whole stack: every
  // copy of that card id in the deck counts `mutation`× stronger.
  const mut = (id) => mutations[id] || 1;

  // Corrupted cards (from corrupted crates): ×2 effect amplification, but
  // each corrupted slot costs XP gains. Combined factor is capped at ×4.
  let corruptedSlots = 0;
  const factor = (id) => {
    if (!corruptedSet.has(id)) return mut(id);
    return Math.min(mut(id) * 2, 4);
  };

  deck.forEach(cardId => {
    const f = factor(cardId);

    switch (cardId) {
      case "lucky_charm":
        effects.luck += 0.1 * f;
        break;

      case "reroll":
        effects.rerollChance += 0.25 * f;
        break;

      case "double_down":
        effects.payoutMult += 0.5 * f;
        break;

      case "jackpot_boost":
        effects.payoutMult += 1.0 * f;
        break;

      case "wild_symbol":
        effects.luck += 0.3 * f;
        break;

      case "multiplier_chain":
        effects.payoutMult += 0.2 * f;
        break;

      case "mythic_multiplier":
        effects.payoutMult += 2.0 * f;
        break;

      case "safety_net":
        effects.safetyNetRefund += Math.min(0.2 * f, 0.4);
        break;

      case "hot_streak":
        effects.streakBonusRate += 0.02 * f;
        break;

      case "jackpot_surge":
        effects.jackpotSurge = Math.min(
          effects.jackpotSurge + 0.03 * f,
          0.15
        );
        break;
    }

    if (cardId && corruptedSet.has(cardId)) corruptedSlots++;
  });

  // Corruption's price: −15% XP per corrupted deck slot (floored at half).
  if (corruptedSlots > 0) {
    effects.xpMult *= Math.max(1 - corruptedSlots * 0.15, 0.5);
  }

  return effects;
}

// CARD SYNERGIES
function calculateSynergies(deck, effects) {
  const d = deck || [];

  // ensure array exists
  effects.synergies = effects.synergies || [];

  const addSynergy = (label) => {
    effects.synergies.push(label);
  };

  // -------------------------
  // 🧠 PAIR SYNERGIES
  // -------------------------

  if (d.includes("lucky_charm") && d.includes("jackpot_boost")) {
    effects.payoutMult *= 1.5;
    effects.luck += 0.1;
    addSynergy("🍀 Lucky Jackpot");
  }

  if (d.includes("reroll") && d.includes("multiplier_chain")) {
    effects.rerollChance += 0.2;
    effects.payoutMult *= 1.3;
    addSynergy("🔁 Chain Reroll");
  }

  if (d.includes("double_down") && d.includes("mythic_multiplier")) {
    effects.payoutMult *= 2;
    addSynergy("💥 Mythic Double");
  }

  // -------------------------
  // 🔢 COUNT SYNERGIES
  // -------------------------

  const count = {};
  d.forEach(card => {
    if (!card) return;
    count[card] = (count[card] || 0) + 1;
  });

  // 🔥 TRIPLE MYTHIC (your big one)
  if (count["mythic_multiplier"] >= 3) {
    effects.payoutMult += 7;
    effects.luck += 0.2;
    addSynergy(" Triple Mythic");
  }

  // 🍀 Lucky Charm Pair
  if (count["lucky_charm"] >= 2) {
    effects.rerollChance += 0.3;
    addSynergy("🍀 Lucky Pair");
  }

  // 🔁 Reroll Stack
  if (count["reroll"] >= 2) {
    effects.rerollChance += 0.5;
    addSynergy("🔁 Reroll Engine");
  }

  // -------------------------
  // 🧪 MIXED BUILDS
  // -------------------------

  if (count["lucky_charm"] && count["reroll"]) {
    effects.rerollChance += 0.25;
    effects.luck += 0.2;
    addSynergy("✨ Luck Engine");
  }

  if (count["multiplier_chain"] >= 2) {
    effects.payoutMult += 1.0;
    effects.xpMult += 0.5;
    addSynergy("⛓️ Chain Scaling");
  }

  if (count["wild_symbol"] >= 2) {
    effects.bonusPayout = (effects.bonusPayout || 0) + 300;
    addSynergy("🃏 Wild Surge");
  }

  if (count["jackpot_boost"] >= 2) {
    effects.payoutMult += 2;
    addSynergy("👑 Jackpot Overload");
  }

  // -------------------------
  // 💀 GOD TIER (RARE BUILD)
  // -------------------------

  if (
    count["mythic_multiplier"] &&
    count["jackpot_boost"] &&
    count["multiplier_chain"]
  ) {
    effects.payoutMult *= 2;
    effects.luck += 0.5;
    addSynergy("💀 GOD BUILD");
  }

  // -------------------------
  // 🎭 ARCHETYPE SYNERGIES
  // -------------------------

  // Safe Grinder: refund + rerolls compound
  if (d.includes("safety_net") && d.includes("reroll")) {
    effects.safetyNetRefund += 0.12;
    effects.rerollChance += 0.15;
    addSynergy("🛡️ Safety Inspector");
  }

  // Streak meets surge
  if (count["hot_streak"] && count["jackpot_surge"]) {
    effects.jackpotSurge += 0.03;
    effects.streakBonusRate += 0.01;
    addSynergy("🔥 Surge Rider");
  }

  // High Roller: vault buster
  if (d.includes("jackpot_boost") && d.includes("jackpot_surge")) {
    effects.payoutMult *= 1.5;
    addSynergy("💰 Vault Buster");
  }

  // Chaos: wild luck feeds harmony + drops
  if (d.includes("wild_symbol") && d.includes("jackpot_surge")) {
    effects.luck += 0.4;
    addSynergy("🌪️ Chaos Engine");
  }

  // Steady burn: grind with a growing streak
  if (count["safety_net"] && count["hot_streak"]) {
    effects.safetyNetRefund += 0.05;
    effects.streakBonusRate += 0.02;
    addSynergy("🧯 Steady Burn");
  }

  return effects;
}

module.exports = { calculateDeckEffects, calculateSynergies };
