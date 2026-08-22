// Deck effects + synergies. Pure functions — no DB, no randomness.
// Extracted verbatim from routes/gameRoutes.js so the spin pipeline can be
// unit-tested directly.

function calculateDeckEffects(deck) {
  const effects = {
    payoutMult: 1,
    xpMult: 1,
    rerollChance: 0,
    luck: 1
  };

  deck.forEach(cardId => {
    switch (cardId) {
      case "lucky_charm":
        effects.luck += 0.1;
        break;

      case "reroll":
        effects.rerollChance += 0.25;
        break;

      case "double_down":
        effects.payoutMult += 0.5;
        break;

      case "jackpot_boost":
        effects.payoutMult += 1.0;
        break;

      case "wild_symbol":
        effects.luck += 0.3;
        break;

      case "multiplier_chain":
        effects.payoutMult += 0.2;
        break;

      case "mythic_multiplier":
        effects.payoutMult += 2.0;
        break;
    }
  });

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

  return effects;
}

module.exports = { calculateDeckEffects, calculateSynergies };
