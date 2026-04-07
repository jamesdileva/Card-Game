const { cards } = require("./cards");

function getRandomCard(pool) {
  const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;

  for (let card of pool) {
    if (rand < card.weight) return card;
    rand -= card.weight;
  }
}

function openCrate(type) {
  let pool;

  if (type === "basic") {
    pool = cards.filter(c => c.rarity === "common");
  } else if (type === "premium") {
    pool = cards.filter(c =>
      c.rarity === "common" || c.rarity === "rare"
    );
  } else if (type === "elite") {
    pool = cards;
  } else {
    return [];
  }

  const rewards = [];

  for (let i = 0; i < 2; i++) {
    rewards.push(getRandomCard(pool));
  }

  return rewards;
}

module.exports = { openCrate };