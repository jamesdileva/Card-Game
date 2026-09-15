const { test, describe } = require("node:test");
const assert = require("node:assert");

const { stackInventory } = require("../game/inventory");

// Regression: /state and /inventory once ran MAX(corrupted) with no GROUP BY,
// collapsing every inventory to a single row. These tests pin the stacking
// contract — one entry per card id, with real counts — against per-row input.
describe("stackInventory", () => {
  test("stacks multiple rows of one card into a single counted entry", () => {
    const out = stackInventory([
      { card_id: "reroll", rarity: "common", mutation: 1, corrupted: 0 },
      { card_id: "reroll", rarity: "common", mutation: 1, corrupted: 0 },
      { card_id: "reroll", rarity: "common", mutation: 1, corrupted: 0 }
    ]);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].id, "reroll");
    assert.strictEqual(out[0].count, 3);
  });

  test("keeps one entry per card id across many rows", () => {
    const rows = [];
    for (let i = 0; i < 19; i++) {
      rows.push({ card_id: "mythic_multiplier", rarity: "legendary", mutation: 1, corrupted: 0 });
    }
    for (let i = 0; i < 9; i++) {
      rows.push({ card_id: "double_down", rarity: "rare", mutation: 1, corrupted: 0 });
    }
    const out = stackInventory(rows);
    assert.strictEqual(out.length, 2);
    const byId = Object.fromEntries(out.map((e) => [e.id, e]));
    assert.strictEqual(byId.mythic_multiplier.count, 19);
    assert.strictEqual(byId.double_down.count, 9);
  });

  test("takes the max mutation and ORs the corrupted flag", () => {
    const out = stackInventory([
      { card_id: "wild_symbol", rarity: "epic", mutation: 1, corrupted: 0 },
      { card_id: "wild_symbol", rarity: "epic", mutation: 1.13, corrupted: 1 }
    ]);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].mutation, 1.13);
    assert.strictEqual(out[0].corrupted, true);
  });

  test("empty inventory stacks to an empty array", () => {
    assert.deepStrictEqual(stackInventory([]), []);
  });
});
