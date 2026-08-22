const { test, describe } = require("node:test");
const assert = require("node:assert");

const { cards } = require("../game/cards");
const {
  MERGE_COST,
  nextRarity,
  canEvolve,
  pickEvolvedCard
} = require("../game/evolution");

describe("game/evolution", () => {
  test("rarity ladder", () => {
    assert.strictEqual(nextRarity("common"), "rare");
    assert.strictEqual(nextRarity("rare"), "epic");
    assert.strictEqual(nextRarity("epic"), "legendary");
    assert.strictEqual(nextRarity("legendary"), null); // terminal
    assert.strictEqual(nextRarity("bogus"), null);
  });

  test("canEvolve requires 3+ copies and a non-terminal rarity", () => {
    assert.ok(canEvolve(3, "common"));
    assert.ok(canEvolve(12, "rare"));
    assert.ok(!canEvolve(2, "common"));
    assert.ok(!canEvolve(0, "common"));
    assert.ok(!canEvolve(3, "legendary"));
    assert.ok(!canEvolve("3", "common"));
  });

  test("pickEvolvedCard returns a card of the next rarity", () => {
    for (let i = 0; i < 100; i++) {
      const card = pickEvolvedCard("common");
      assert.ok(cards.includes(card));
      assert.strictEqual(card.rarity, "rare");
    }
    const fromEpic = pickEvolvedCard("epic");
    assert.strictEqual(fromEpic.rarity, "legendary");

    assert.strictEqual(pickEvolvedCard("legendary"), null);
  });

  test("every catalog rarity is reachable via evolution (except legendary as source)", () => {
    const targets = new Set(
      ["common", "rare", "epic"].map((r) => nextRarity(r))
    );
    for (const t of targets) {
      assert.ok(
        cards.some((c) => c.rarity === t),
        `target rarity ${t} has no cards`
      );
    }
  });
});
