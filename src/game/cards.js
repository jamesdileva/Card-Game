const cards = [
  { id: "lucky_charm", rarity: "common", weight: 50 },
  { id: "reroll", rarity: "common", weight: 50 },

  { id: "double_down", rarity: "rare", weight: 25 },
  { id: "jackpot_boost", rarity: "rare", weight: 25 },

  { id: "wild_symbol", rarity: "epic", weight: 10 },
  { id: "multiplier_chain", rarity: "epic", weight: 10 },

  { id: "mythic_multiplier", rarity: "mythic", weight: 2 }
];

function getRandomCard() {
  const totalWeight = cards.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * totalWeight;

  for (let card of cards) {
    if (roll < card.weight) return card;
    roll -= card.weight;
  }
}

module.exports = { getRandomCard };