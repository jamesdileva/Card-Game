const { test, describe } = require("node:test");
const assert = require("node:assert");

const {
  sanitizeBet,
  isValidCrateType,
  sanitizeDeckShape,
  validateDeckOwnership
} = require("../game/validate");
const { flipCoin, playCoinflip, computeCoinflipXP } = require("../game/coinflip");

const realRandom = Math.random;

function withRandom(value, fn) {
  Math.random = () => value;
  try {
    fn();
  } finally {
    Math.random = realRandom;
  }
}

describe("game/validate", () => {
  test("bets: accepts positive integers, rejects everything else", () => {
    assert.strictEqual(sanitizeBet(100), 100);
    assert.strictEqual(sanitizeBet(1), 1);
    assert.strictEqual(sanitizeBet(250.5), null);
    assert.strictEqual(sanitizeBet(0), null);
    assert.strictEqual(sanitizeBet(-50), null);
    assert.strictEqual(sanitizeBet("100"), null);
    assert.strictEqual(sanitizeBet(NaN), null);
    assert.strictEqual(sanitizeBet(Infinity), null);
    assert.strictEqual(sanitizeBet(null), null);
    assert.strictEqual(sanitizeBet(1000001), null);
    assert.strictEqual(sanitizeBet(500000, 500), null); // custom cap
  });

  test("crate types: only known types pass", () => {
    for (const t of ["basic", "premium", "elite"]) {
      assert.ok(isValidCrateType(t));
    }
    assert.ok(!isValidCrateType("mythic"));
    assert.ok(!isValidCrateType(""));
    assert.ok(!isValidCrateType(undefined));
    assert.ok(!isValidCrateType({}));
  });

  test("deck shape: normalizes to exactly 3 slots", () => {
    const r = sanitizeDeckShape(["lucky_charm", undefined]);
    assert.ok(r.ok);
    assert.deepStrictEqual(r.deck, ["lucky_charm", null, null]);

    const empty = sanitizeDeckShape([]);
    assert.deepStrictEqual(empty.deck, [null, null, null]);

    assert.ok(!sanitizeDeckShape("nope").ok);
    assert.ok(!sanitizeDeckShape([1, 2, 3]).ok);
    assert.ok(!sanitizeDeckShape(["a", "b", "c", "d"]).ok);
  });

  test("ownership: rejects unowned cards and overused copies", () => {
    const counts = { lucky_charm: 2, double_down: 1 };

    assert.ok(
      validateDeckOwnership(
        ["lucky_charm", "lucky_charm", "double_down"],
        counts
      ).ok
    );
    assert.ok(
      !validateDeckOwnership(["double_down", "double_down", null], counts).ok
    );
    assert.ok(
      !validateDeckOwnership(["mythic_multiplier", null, null], counts).ok
    );
    // empty deck always valid
    assert.ok(validateDeckOwnership([null, null, null], {}).ok);
  });
});

describe("game/coinflip", () => {
  test("flipCoin returns heads/tails at the seeded boundary", () => {
    withRandom(0.49, () => assert.strictEqual(flipCoin(), "heads"));
    withRandom(0.5, () => assert.strictEqual(flipCoin(), "tails"));
  });

  test("correct pick wins even money plus streak bonus", () => {
    withRandom(0.1, () => {
      // flip = heads; picking heads wins with streak carryover of 2 → 3
      const r = playCoinflip({
        bet: 100,
        choice: "heads",
        effects: {},
        winStreak: 2
      });
      assert.strictEqual(r.win, true);
      assert.strictEqual(r.newStreak, 3);
      // 200 × 1.15 → float lands at 229.999…, floors to 229
      assert.strictEqual(r.payout, 229);
    });
  });

  test("wrong pick loses and resets the streak", () => {
    withRandom(0.9, () => {
      // flip = tails; picking heads loses
      const r = playCoinflip({
        bet: 100,
        choice: "heads",
        effects: {},
        winStreak: 7
      });
      assert.strictEqual(r.win, false);
      assert.strictEqual(r.payout, 0);
      assert.strictEqual(r.newStreak, 0);
    });
  });

  test("synergy bonus payout applies to winning flips only", () => {
    withRandom(0.1, () => {
      const r = playCoinflip({
        bet: 100,
        choice: "heads",
        effects: { bonusPayout: 300 },
        winStreak: 0
      });
      // first win → streak bonus 1.05: floor(200 × 1.05) = 210, +300 flat
      assert.strictEqual(r.payout, 510);
    });
    withRandom(0.9, () => {
      const r = playCoinflip({
        bet: 100,
        choice: "heads",
        effects: { bonusPayout: 300 },
        winStreak: 0
      });
      assert.strictEqual(r.payout, 0);
    });
  });

  test("xp tiers match slots shape", () => {
    assert.strictEqual(computeCoinflipXP(false, 1, 1), 5);
    assert.strictEqual(computeCoinflipXP(true, 1, 1), 15);
    // 15 × 1.5 = 22.5 → floor 22; 22 × 1.2 = 26.4 → floor 26
    assert.strictEqual(computeCoinflipXP(true, 1.5, 1.2), 26);
  });
});
