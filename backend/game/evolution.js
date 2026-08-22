// Card evolution: merge MERGE_COST duplicates into one random card of the
// next rarity tier. Pure — no DB; randomness via Math.random (seedable).

const { cards } = require("./cards");

const MERGE_COST = 3;
const RARITY_ORDER = ["common", "rare", "epic", "legendary"];

function nextRarity(rarity) {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx === -1 || idx === RARITY_ORDER.length - 1) return null; // unknown or terminal
  return RARITY_ORDER[idx + 1];
}

function canEvolve(ownedCount, rarity) {
  if (!Number.isInteger(ownedCount) || ownedCount < MERGE_COST) return false;
  return nextRarity(rarity) !== null;
}

// Pick a random card of the target rarity. Falls back to the whole catalog
// entry list being non-empty (the catalog guarantees every rarity is populated).
function pickEvolvedCard(rarity) {
  const target = nextRarity(rarity);
  if (target === null) return null;

  const pool = cards.filter((c) => c.rarity === target);
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  MERGE_COST,
  RARITY_ORDER,
  nextRarity,
  canEvolve,
  pickEvolvedCard
};
