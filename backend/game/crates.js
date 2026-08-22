// Crate definitions and reward rolling. Pure — takes the card catalog,
// returns plain data; no DB access. Randomness via Math.random (seedable
// in tests).

const { cards } = require("./cards");

const CRATE_TYPES = {
  basic: {
    cost: 100,
    label: "Basic Crate",
    pool: ["common", "common", "rare"],
    picks: 2,
    crateInCrateChance: 0.04
  },
  premium: {
    cost: 250,
    label: "Premium Crate",
    pool: ["common", "rare", "epic"],
    picks: 2,
    crateInCrateChance: 0.06
  },
  elite: {
    cost: 500,
    label: "Elite Crate",
    pool: ["rare", "epic", "legendary"],
    picks: 2,
    crateInCrateChance: 0.08
  },
  corrupted: {
    cost: 700,
    label: "Corrupted Crate",
    pool: null, // rolled by tier below
    picks: 2,
    crateInCrateChance: 0.1
  },
  timed: {
    cost: 400,
    label: "Timed Crate",
    pool: ["rare", "rare", "epic", "legendary"], // guaranteed rare+
    picks: 2,
    crateInCrateChance: 0.1
  }
};

const TIMED_UNLOCK_SECONDS = 120;

function pickRarity(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickCardOfRarity(rarity) {
  const pool = cards.filter((c) => c.rarity === rarity);
  if (pool.length === 0) {
    // catalog guarantees every rarity has at least one card, but stay safe
    return cards[0];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// Corrupted tiers: trash 30% / high tier 50% / insane 20%.
function rollCorruptedRewards(picks) {
  const roll = Math.random();

  if (roll < 0.3) {
    // trash: a single common, regardless of picks
    const card = pickCardOfRarity("common");
    return [{ id: card.id, rarity: card.rarity }];
  }

  if (roll < 0.8) {
    // high tier: rares/epics
    const rewards = [];
    for (let i = 0; i < picks; i++) {
      const card = pickCardOfRarity(Math.random() < 0.6 ? "rare" : "epic");
      rewards.push({ id: card.id, rarity: card.rarity });
    }
    return rewards;
  }

  // insane: legendaries only
  const rewards = [];
  for (let i = 0; i < picks; i++) {
    const card = pickCardOfRarity("legendary");
    rewards.push({ id: card.id, rarity: card.rarity });
  }
  return rewards;
}

// Roll the base rewards for one crate of `type`.
function rollRewards(type) {
  const def = CRATE_TYPES[type];
  if (!def) return [];

  if (type === "corrupted") {
    return rollCorruptedRewards(def.picks);
  }

  const rewards = [];
  for (let i = 0; i < def.picks; i++) {
    const card = pickCardOfRarity(pickRarity(def.pool));
    rewards.push({ id: card.id, rarity: card.rarity });
  }
  return rewards;
}

// Open a crate: rewards plus optional one-level crate-in-crate doubling.
function openCrate(type) {
  if (!CRATE_TYPES[type]) {
    return { valid: false };
  }

  const rewards = rollRewards(type);
  let bonusRewards = null;

  if (Math.random() < CRATE_TYPES[type].crateInCrateChance) {
    bonusRewards = rollRewards(type);
  }

  return {
    valid: true,
    type,
    label: CRATE_TYPES[type].label,
    rewards,
    bonusRewards
  };
}

module.exports = {
  CRATE_TYPES,
  TIMED_UNLOCK_SECONDS,
  openCrate,
  rollRewards,
  rollCorruptedRewards
};
