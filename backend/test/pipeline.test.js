const { test, describe } = require("node:test");
const assert = require("node:assert");

const { calculateDeckEffects, calculateSynergies } = require("../game/effects");
const {
  SYMBOLS,
  basePayoutFor,
  rollSpin,
  rollRandomEvent,
  applyEventToEffects,
  computePayout,
  computeXP,
  applyLevels
} = require("../game/spin");

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

describe("game/effects", () => {
  test("empty deck yields neutral effects", () => {
    const e = calculateDeckEffects([null, null, null]);
    assert.deepStrictEqual(e, {
      payoutMult: 1,
      xpMult: 1,
      rerollChance: 0,
      luck: 1,
      streakBonusRate: 0.05,
      jackpotSurge: 0,
      safetyNet: false
    });
  });

  test("each card adds its own effect", () => {
    const e = calculateDeckEffects(["mythic_multiplier", null, null]);
    assert.strictEqual(e.payoutMult, 3);

    const e2 = calculateDeckEffects(["lucky_charm", null, null]);
    assert.strictEqual(e2.luck, 1.1);

    const e3 = calculateDeckEffects(["reroll", "reroll", null]);
    assert.strictEqual(e3.rerollChance, 0.5);
  });

  test("pair synergy: lucky_charm + jackpot_boost", () => {
    const deck = ["lucky_charm", "jackpot_boost", null];
    const e = calculateDeckEffects(deck);
    calculateSynergies(deck, e);
    // jackpot_boost +1 → mult 2, ×1.5 synergy → 3; charm +0.1, synergy +0.1 → 1.2
    assert.strictEqual(e.payoutMult, 3);
    assert.ok(Math.abs(e.luck - 1.2) < 1e-9);
    assert.ok(e.synergies.includes("🍀 Lucky Jackpot"));
  });

  test("count synergy: triple mythic is the big one", () => {
    const deck = [
      "mythic_multiplier",
      "mythic_multiplier",
      "mythic_multiplier"
    ];
    const e = calculateDeckEffects(deck);
    calculateSynergies(deck, e);
    // +6 from cards → 7, +7 from synergy → 14
    assert.strictEqual(e.payoutMult, 14);
    assert.ok(e.synergies.includes(" Triple Mythic"));
  });

  test("wild pair grants flat bonus payout", () => {
    const deck = ["wild_symbol", "wild_symbol", null];
    const e = calculateDeckEffects(deck);
    calculateSynergies(deck, e);
    assert.strictEqual(e.bonusPayout, 300);
    assert.ok(e.synergies.includes("🃏 Wild Surge"));
  });

  test("phase-3 cards set their effect fields", () => {
    const e1 = calculateDeckEffects(["safety_net", null, null]);
    assert.strictEqual(e1.safetyNet, true);

    const e2 = calculateDeckEffects(["hot_streak", "hot_streak", null]);
    assert.ok(Math.abs(e2.streakBonusRate - 0.09) < 1e-9); // 0.05 + 2×0.02

    const e3 = calculateDeckEffects(["jackpot_surge", "jackpot_surge", "jackpot_surge"]);
    assert.strictEqual(e3.jackpotSurge, 0.09);
  });
});

describe("game/spin — reels & payouts", () => {
  test("base payout by unique symbol count", () => {
    assert.strictEqual(basePayoutFor(["a", "a", "a", "a", "a"]), 1000);
    assert.strictEqual(basePayoutFor(["a", "b", "a", "b", "a"]), 500);
    assert.strictEqual(basePayoutFor(["a", "b", "c", "a", "b"]), 200);
    assert.strictEqual(basePayoutFor(["a", "b", "c", "d", "e"]), 0);
  });

  test("all symbols come from the symbol table", () => {
    withRandom(0.99, () => {
      for (const s of rollReelsSafe()) {
        assert.ok(SYMBOLS.includes(s));
      }
    });
    function rollReelsSafe() {
      return rollSpin({ rerollChance: 0 }).reels;
    }
  });

  test("rollSpin triggers reroll only on total loss", () => {
    // seq: 5 distinct symbols (payout 0) → reroll chance roll hits → 5 crowns
    let call = 0;
    const seq = [0.01, 0.15, 0.3, 0.45, 0.6, 0.01, 0.99, 0.99, 0.99, 0.99, 0.99];
    withRandom(() => seq[call++ % seq.length], () => {
      const { reels, payout } = rollSpin({ rerollChance: 1 });
      assert.deepStrictEqual(reels, ["crown", "crown", "crown", "crown", "crown"]);
      assert.strictEqual(payout, 1000);
    });
  });

  test("rollSpin keeps a losing spin when reroll chance misses", () => {
    // 5 distinct symbols (payout 0) → chance roll fails
    let call = 0;
    const seq = [0.01, 0.15, 0.3, 0.45, 0.6, 0.99];
    withRandom(() => seq[call++ % seq.length], () => {
      const { payout } = rollSpin({ rerollChance: 0.5 });
      assert.strictEqual(payout, 0);
    });
  });

  test("luck harmonizes reels toward matches", () => {
    // rolls: 5 distinct symbols, then harmonize proc (0.01 < 0.04), then
    // i = floor(0.99*5) = 4, j = 5%5 = 0 → reel 4 copies reel 0
    let call = 0;
    const seq = [0.01, 0.15, 0.3, 0.45, 0.6, 0.01, 0.99];
    withRandom(() => seq[call++ % seq.length], () => {
      const { reels } = rollSpin({ luck: 1.2, rerollChance: 0 });
      assert.strictEqual(reels[4], "cherry"); // cherry copied onto clover
    });
  });

  test("no harmony proc without luck; all-matching spins stay intact", () => {
    withRandom(0.5, () => {
      const r = rollSpin({ luck: 1, rerollChance: 0 });
      assert.ok(r.reels.every((s) => s === "clover")); // constant random → all same
      assert.strictEqual(r.payout, 1000);
    });
  });
});

describe("game/spin — random events", () => {
  test("no event when first roll exceeds 15%", () => {
    withRandom(0.9, () => {
      assert.strictEqual(rollRandomEvent(), null);
    });
  });

  test("event types map to roll ranges", () => {
    let call = 0;
    withRandom(() => [0.05, 0.1][call++ % 2], () => {
      assert.strictEqual(rollRandomEvent().type, "DOUBLE_PAYOUT");
    });
    call = 0;
    withRandom(() => [0.05, 0.5][call++ % 2], () => {
      assert.strictEqual(rollRandomEvent().type, "DOUBLE_XP");
    });
    call = 0;
    withRandom(() => [0.05, 0.9][call++ % 2], () => {
      assert.strictEqual(rollRandomEvent().type, "LUCK_BOOST");
    });
  });

  test("DOUBLE_XP doubles xp multiplier via applyEventToEffects", () => {
    const effects = { xpMult: 1, luck: 1 };
    applyEventToEffects(
      { type: "DOUBLE_XP", mult: 2 },
      effects
    );
    assert.strictEqual(effects.xpMult, 2);

    applyEventToEffects(
      { type: "LUCK_BOOST", luck: 0.5 },
      effects
    );
    assert.strictEqual(effects.luck, 1.5);
  });
});

describe("game/spin — payout chain", () => {
  const base = { effects: { payoutMult: 1 }, playerBoost: 1 };

  test("win scales with bet and starts the streak", () => {
    const { finalPayout, newStreak } = computePayout({
      bet: 200,
      basePayout: 200,
      winStreak: 0,
      event: null,
      ...base
    });
    // 200 * 2 = 400 bet-adjusted, streak 1 → ×1.05 → 420
    assert.strictEqual(finalPayout, 420);
    assert.strictEqual(newStreak, 1);
  });

  test("loss resets streak and pays nothing", () => {
    const { finalPayout, newStreak } = computePayout({
      bet: 100,
      basePayout: 0,
      winStreak: 7,
      event: null,
      ...base
    });
    assert.strictEqual(finalPayout, 0);
    assert.strictEqual(newStreak, 0);
  });

  test("streak bonus compounds at 5% per win", () => {
    const { finalPayout, newStreak } = computePayout({
      bet: 100,
      basePayout: 1000,
      winStreak: 3,
      event: null,
      ...base
    });
    // streak 4 → ×1.2 → 1200
    assert.strictEqual(finalPayout, 1200);
    assert.strictEqual(newStreak, 4);
  });

  test("deck multiplier and player boost apply before streak", () => {
    const { finalPayout } = computePayout({
      bet: 100,
      basePayout: 1000,
      winStreak: 0,
      event: null,
      effects: { payoutMult: 2 },
      playerBoost: 1.5
    });
    // 1000 → deck 2000 → boost 3000 → streak ×1.05 → 3150
    assert.strictEqual(finalPayout, 3150);
  });

  test("DOUBLE_PAYOUT event applies after everything else", () => {
    const { finalPayout } = computePayout({
      bet: 100,
      basePayout: 1000,
      winStreak: 0,
      event: { type: "DOUBLE_PAYOUT", mult: 2 },
      ...base
    });
    // 1050 × 2
    assert.strictEqual(finalPayout, 2100);
  });

  test("synergy bonus payout is paid on top of the chain", () => {
    const { finalPayout } = computePayout({
      bet: 100,
      basePayout: 1000,
      winStreak: 0,
      event: null,
      effects: { payoutMult: 1, bonusPayout: 300 },
      playerBoost: 1
    });
    // 1050 after streak + 300 flat
    assert.strictEqual(finalPayout, 1350);
  });

  test("bonus payout alone does not count as a win for streaks", () => {
    const { finalPayout, newStreak } = computePayout({
      bet: 100,
      basePayout: 0,
      winStreak: 5,
      event: null,
      effects: { payoutMult: 1, bonusPayout: 300 },
      playerBoost: 1
    });
    assert.strictEqual(finalPayout, 300);
    assert.strictEqual(newStreak, 0); // reels lost → streak resets
  });

  test("Safety Net refunds 20% of bet on losses, no streak credit", () => {
    const { finalPayout, newStreak } = computePayout({
      bet: 200,
      basePayout: 0,
      winStreak: 3,
      event: null,
      effects: { payoutMult: 1, safetyNet: true },
      playerBoost: 1
    });
    assert.strictEqual(finalPayout, 40); // 20% of 200
    assert.strictEqual(newStreak, 0);
  });

  test("Safety Net does not pay on winning spins", () => {
    const { finalPayout } = computePayout({
      bet: 100,
      basePayout: 1000,
      winStreak: 0,
      event: null,
      effects: { payoutMult: 1, safetyNet: true },
      playerBoost: 1
    });
    // normal win math only — no +20 refund
    assert.strictEqual(finalPayout, 1050);
  });

  test("Hot Streak raises the per-win streak rate", () => {
    const base = {
      bet: 100,
      basePayout: 1000,
      winStreak: 1,
      event: null,
      playerBoost: 1
    };
    const plain = computePayout({ ...base, effects: { payoutMult: 1 } });
    // streak 2 × 5% → floor(1000 × 1.10) = 1100
    assert.strictEqual(plain.finalPayout, 1100);

    const hot = computePayout({
      ...base,
      effects: { payoutMult: 1, streakBonusRate: 0.09 }
    });
    // streak 2 × 9% → floor(1000 × 1.18) = 1180
    assert.strictEqual(hot.finalPayout, 1180);
  });

  test("Jackpot Surge multiplies a winning payout by 5 when it procs", () => {
    withRandom(0.01, () => {
      // 0.01 < 0.03 → surge procs: 1050 × 5
      const { finalPayout } = computePayout({
        bet: 100,
        basePayout: 1000,
        winStreak: 0,
        event: null,
        effects: { payoutMult: 1, jackpotSurge: 0.03 },
        playerBoost: 1
      });
      assert.strictEqual(finalPayout, 5250);
    });
  });

  test("Jackpot Surge respects the 6% cap", () => {
    withRandom(0.055, () => {
      // deck has 3 surges = 9%, capped to 6% → 0.055 < 0.06 still procs
      const { finalPayout } = computePayout({
        bet: 100,
        basePayout: 1000,
        winStreak: 0,
        event: null,
        effects: { payoutMult: 1, jackpotSurge: 0.09 },
        playerBoost: 1
      });
      assert.strictEqual(finalPayout, 5250);
    });
    withRandom(0.065, () => {
      // capped at 6% → 0.065 misses
      const { finalPayout } = computePayout({
        bet: 100,
        basePayout: 1000,
        winStreak: 0,
        event: null,
        effects: { payoutMult: 1, jackpotSurge: 0.09 },
        playerBoost: 1
      });
      assert.strictEqual(finalPayout, 1050);
    });
  });
});

describe("game/spin — XP & levels", () => {
  test("xp gain tiers by base payout", () => {
    assert.strictEqual(computeXP(0, 1, 1), 5);
    assert.strictEqual(computeXP(200, 1, 1), 15); // +10 win
    assert.strictEqual(computeXP(1000, 1, 1), 40); // +10 win, +25 big win
  });

  test("deck then player xp boosts floor in sequence", () => {
    // 40 × 1.5 = 60 → floor; 60 × 1.2 = 72
    assert.strictEqual(computeXP(1000, 1.5, 1.2), 72);
  });

  test("level up grants one reward per new level", () => {
    const r = applyLevels({
      xp: 95,
      level: 1,
      xpGain: 5,
      lastRewardedLevel: 0
    });
    assert.strictEqual(r.newXP, 0);
    assert.strictEqual(r.newLevel, 2);
    assert.deepStrictEqual(r.levelRewards, [{ level: 2, amount: 300 }]);
    assert.strictEqual(r.totalLevelReward, 300);
  });

  test("multi-level jumps grant every skipped level", () => {
    const r = applyLevels({
      xp: 250,
      level: 1,
      xpGain: 5,
      lastRewardedLevel: 0
    });
    // 255 → lvl 2 (-100), rem 155 < 200 → stop at level 2
    assert.strictEqual(r.newLevel, 2);
    assert.strictEqual(r.newXP, 155);
    assert.deepStrictEqual(r.levelRewards, [{ level: 2, amount: 300 }]);
  });

  test("levels already rewarded are not rewarded again", () => {
    const r = applyLevels({
      xp: 95,
      level: 1,
      xpGain: 205,
      lastRewardedLevel: 2
    });
    // 300 xp → lvl2 (already rewarded, skip), lvl3 (+350)
    assert.strictEqual(r.newLevel, 3);
    assert.strictEqual(r.newXP, 0);
    assert.deepStrictEqual(r.levelRewards, [{ level: 3, amount: 350 }]);
  });
});
