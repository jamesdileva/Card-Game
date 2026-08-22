const { test, describe } = require("node:test");
const assert = require("node:assert");

const { cards, getRandomCard } = require("../game/cards");

describe("game/cards", () => {
  test("card catalog has unique ids and positive weights", () => {
    const ids = cards.map((c) => c.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    for (const c of cards) {
      assert.ok(c.weight > 0, `weight must be > 0 for ${c.id}`);
      assert.ok(
        ["common", "rare", "epic", "legendary"].includes(c.rarity),
        `unknown rarity on ${c.id}`
      );
    }
  });

  test("getRandomCard always returns a card from the pool", () => {
    for (let i = 0; i < 200; i++) {
      const card = getRandomCard();
      assert.ok(cards.includes(card), `unexpected card ${card && card.id}`);
    }
  });
});
