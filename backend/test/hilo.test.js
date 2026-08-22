const { test, describe } = require("node:test");
const assert = require("node:assert");

const {
  rollHiloNumber,
  outcomesFor,
  payoutMultiplier,
  winChancePct,
  playHilo
} = require("../game/hilo");

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

describe("game/hilo — odds", () => {
  test("rollHiloNumber stays within 1..100", () => {
    for (let i = 0; i < 300; i++) {
      const n = rollHiloNumber();
      assert.ok(Number.isInteger(n) && n >= 1 && n <= 100);
    }
  });

  test("outcome counts and chances", () => {
    assert.strictEqual(outcomesFor(20, "higher"), 80); // 21..100
    assert.strictEqual(outcomesFor(20, "lower"), 19); // 1..19, tie loses
    assert.strictEqual(outcomesFor(1, "lower"), 0); // impossible side
    assert.strictEqual(outcomesFor(100, "higher"), 0);

    assert.strictEqual(winChancePct(50, "higher"), 50);
    assert.strictEqual(winChancePct(1, "higher"), 99);
  });

  test("payout multiplier is fair odds discounted to 95%", () => {
    // 80 outcomes → fair 1.25x → paid floor(9500/80)/100 = 1.18x
    assert.strictEqual(payoutMultiplier(20, "higher"), 1.18);
    // single outcome → max 95x
    assert.strictEqual(payoutMultiplier(99, "higher"), 95);
    assert.strictEqual(payoutMultiplier(2, "lower"), 95);
    // even money-ish at the middle
    assert.strictEqual(payoutMultiplier(50, "higher"), 1.9);
    // impossible sides return null
    assert.strictEqual(payoutMultiplier(1, "lower"), null);
    assert.strictEqual(payoutMultiplier(100, "higher"), null);
  });
});

describe("game/hilo — play", () => {
  test("winning higher guess pays bet × mult × streak bonus", () => {
    withRandom(0.5, () => {
      // roll = floor(0.5*100)+1 = 51 > 20 → win
      const r = playHilo({
        number: 20,
        direction: "higher",
        bet: 100,
        effects: {},
        winStreak: 0
      });
      assert.strictEqual(r.valid, true);
      assert.strictEqual(r.roll, 51);
      assert.strictEqual(r.win, true);
      // floor(100 × 1.18 × 1.05) = 123
      assert.strictEqual(r.payout, 123);
      assert.strictEqual(r.newStreak, 1);
    });
  });

  test("tie loses (house edge)", () => {
    // base 20 → roll exactly 20: floor(r*100)+1 = 20 → r in [0.19, 0.20)
    withRandom(0.195, () => {
      const r = playHilo({
        number: 20,
        direction: "higher",
        bet: 100,
        effects: {},
        winStreak: 4
      });
      assert.strictEqual(r.roll, 20);
      assert.strictEqual(r.win, false);
      assert.strictEqual(r.payout, 0);
      assert.strictEqual(r.newStreak, 0);
    });
  });

  test("single-outcome guess pays the max 95x", () => {
    // base 99 picking higher wins ONLY on 100
    withRandom(0.995, () => {
      // roll = floor(0.995*100)+1 = 100 > 99 → win
      const r = playHilo({
        number: 99,
        direction: "higher",
        bet: 100,
        effects: {},
        winStreak: 0
      });
      assert.strictEqual(r.roll, 100);
      assert.strictEqual(r.win, true);
      assert.strictEqual(r.mult, 95);
      // first win streak bonus: floor(100 × 95 × 1.05) = 9975
      assert.strictEqual(r.payout, 9975);
    });
  });

  test("near-even pick on high base pays under 1x of stake back", () => {
    withRandom(0.005, () => {
      // roll 1 < 99 → win, mult 0.96 (98 outcomes)
      const r = playHilo({
        number: 99,
        direction: "lower",
        bet: 100,
        effects: {},
        winStreak: 0
      });
      assert.strictEqual(r.mult, 0.96);
      assert.strictEqual(r.payout, Math.floor(100 * 0.96 * 1.05)); // 100
    });
  });

  test("synergy bonus applies on wins only; impossible side invalid", () => {
    withRandom(0.9, () => {
      const r = playHilo({
        number: 20,
        direction: "higher",
        bet: 100,
        effects: { bonusPayout: 300 },
        winStreak: 0
      });
      // roll 91 > 20 → win: floor(100×1.18×1.05)=123 +300
      assert.strictEqual(r.win, true);
      assert.strictEqual(r.payout, 123 + 300);
    });

    assert.strictEqual(
      playHilo({ number: 1, direction: "lower", bet: 10 }).valid,
      false
    );
  });
});
