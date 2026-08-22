const { test, describe } = require("node:test");
const assert = require("node:assert");

const { cards, getRandomCard } = require("../game/cards");
const { spinSlot } = require("../game/slot");
const { openCrate } = require("../game/crate");

const realRandom = Math.random;

function withRandom(valueOrFn, fn) {
  Math.random =
    typeof valueOrFn === "function" ? valueOrFn : () => valueOrFn;
  try {
    fn();
  } finally {
    Math.random = realRandom;
  }
}

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

describe("game/slot", () => {
  test("three cherries pay 2x", () => {
    withRandom(0.01, () => {
      const { reels, payout } = spinSlot(100, []);
      assert.deepStrictEqual(reels, ["cherry", "cherry", "cherry"]);
      assert.strictEqual(payout, 200);
    });
  });

  test("three jackpots pay 100x", () => {
    withRandom(0.99, () => {
      const { reels, payout } = spinSlot(100, []);
      assert.deepStrictEqual(reels, ["jackpot", "jackpot", "jackpot"]);
      assert.strictEqual(payout, 10000);
    });
  });

  test("mixed reels pay nothing", () => {
    // 0.01 → cherry, 0.40 → lemon, 0.70 → diamond
    let call = 0;
    withRandom(() => [0.01, 0.4, 0.7][call++ % 3], () => {
      const { payout } = spinSlot(100, []);
      assert.strictEqual(payout, 0);
    });
  });

  test("payout scales with bet size", () => {
    withRandom(0.5, () => {
      const { payout } = spinSlot(250, []); // lemon x3
      assert.strictEqual(payout, 750);
    });
  });
});

describe("game/crate", () => {
  test("basic crate returns 2 common cards", () => {
    const rewards = openCrate("basic");
    assert.strictEqual(rewards.length, 2);
    for (const card of rewards) {
      assert.strictEqual(card.rarity, "common");
    }
  });

  test("premium crate never returns epic or legendary cards", () => {
    for (let i = 0; i < 50; i++) {
      for (const card of openCrate("premium")) {
        assert.ok(["common", "rare"].includes(card.rarity));
      }
    }
  });

  test("elite crate can return legendary cards", () => {
    const rarities = new Set(openCrate("elite").map((c) => c.rarity));
    assert.ok(rarities.size >= 1);
    assert.ok(cards.some((c) => c.rarity === "legendary"));
  });

  test("unknown crate type returns empty array", () => {
    assert.deepStrictEqual(openCrate("nope"), []);
  });
});
