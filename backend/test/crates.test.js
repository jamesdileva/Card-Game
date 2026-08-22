const { test, describe } = require("node:test");
const assert = require("node:assert");

const { cards } = require("../game/cards");
const {
  CRATE_TYPES,
  TIMED_UNLOCK_SECONDS,
  openCrate,
  rollRewards,
  rollCorruptedRewards
} = require("../game/crates");
const { rollSpinDrop } = require("../game/spin");

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

describe("game/crates — definitions", () => {
  test("all five crate types exist with sane costs", () => {
    for (const [type, def] of Object.entries(CRATE_TYPES)) {
      assert.ok(def.cost > 0, `${type} needs a cost`);
      assert.ok(def.picks > 0);
      assert.ok(def.crateInCrateChance > 0 && def.crateInCrateChance < 1);
      if (type !== "corrupted") {
        assert.ok(Array.isArray(def.pool));
        for (const r of def.pool) {
          assert.ok(
            cards.some((c) => c.rarity === r),
            `${type} pool has empty rarity ${r}`
          );
        }
      }
    }
    assert.strictEqual(CRATE_TYPES.corrupted.cost, 700);
    assert.strictEqual(CRATE_TYPES.timed.cost, 400);
    assert.strictEqual(TIMED_UNLOCK_SECONDS, 120);
  });

  test("invalid crate type is rejected", () => {
    assert.strictEqual(openCrate("mythic").valid, false);
    assert.strictEqual(openCrate(undefined).valid, false);
  });
});

describe("game/crates — standard pools", () => {
  test("basic crate only drops commons/rares", () => {
    for (let i = 0; i < 100; i++) {
      for (const r of openCrate("basic").rewards) {
        assert.ok(["common", "rare"].includes(r.rarity));
      }
    }
  });

  test("elite crate never drops commons", () => {
    for (let i = 0; i < 100; i++) {
      for (const r of openCrate("elite").rewards) {
        assert.notStrictEqual(r.rarity, "common");
      }
    }
  });

  test("timed crate guarantees at least one rare+", () => {
    for (let i = 0; i < 100; i++) {
      const rewards = rollRewards("timed");
      assert.ok(
        rewards.some((r) => ["rare", "epic", "legendary"].includes(r.rarity))
      );
    }
  });

  test("every reward id exists in the catalog", () => {
    const ids = new Set(cards.map((c) => c.id));
    for (let i = 0; i < 50; i++) {
      for (const type of Object.keys(CRATE_TYPES)) {
        for (const r of openCrate(type).rewards) {
          assert.ok(ids.has(r.id), `unknown card ${r.id}`);
        }
      }
    }
  });
});

describe("game/crates — corrupted tiers", () => {
  test("trash tier (< 0.3) gives exactly one common", () => {
    withRandom(0.1, () => {
      const rewards = rollCorruptedRewards(2);
      assert.strictEqual(rewards.length, 1);
      assert.strictEqual(rewards[0].rarity, "common");
    });
  });

  test("high tier (0.3–0.8) gives rares/epics only", () => {
    withRandom(0.5, () => {
      const rewards = rollCorruptedRewards(2);
      assert.strictEqual(rewards.length, 2);
      for (const r of rewards) {
        assert.ok(["rare", "epic"].includes(r.rarity));
      }
    });
  });

  test("insane tier (>= 0.8) gives legendaries only", () => {
    withRandom(0.9, () => {
      const rewards = rollCorruptedRewards(2);
      assert.strictEqual(rewards.length, 2);
      for (const r of rewards) {
        assert.strictEqual(r.rarity, "legendary");
      }
    });
  });

  test("tier boundaries: 0.3 is high tier, 0.8 is insane", () => {
    withRandom(0.3, () => {
      const rewards = rollCorruptedRewards(2);
      assert.strictEqual(rewards.length, 2); // not trash
    });
    withRandom(0.7999999, () => {
      const rewards = rollCorruptedRewards(2);
      assert.ok(rewards.every((r) => r.rarity !== "legendary"));
    });
  });
});

describe("game/crates — crate-in-crate", () => {
  test("no bonus when the roll misses", () => {
    withRandom(() => 0.5, () => {
      // chance roll 0.5 >= any type's chance → no bonus
      const opened = openCrate("elite"); // 8% chance
      assert.strictEqual(opened.bonusRewards, null);
    });
  });

  test("bonus triggers below the type's chance", () => {
    withRandom(() => 0.01, () => {
      const opened = openCrate("basic"); // 4% chance → 0.01 triggers
      assert.ok(opened.bonusRewards);
      assert.strictEqual(opened.bonusRewards.length, CRATE_TYPES.basic.picks);
    });
  });

  test("bonus fires across many opens roughly within chance band", () => {
    let bonuses = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      if (openCrate("premium").bonusRewards) bonuses++; // 6%
    }
    assert.ok(bonuses > runs * 0.03 && bonuses < runs * 0.1,
      `expected ~6%, got ${(bonuses / runs) * 100}%`);
  });
});

describe("game/spin — bonus drops", () => {
  test("no drop inside the nothing window", () => {
    withRandom(0.5, () => assert.strictEqual(rollSpinDrop({}), null));
    withRandom(0.89, () =>
      assert.strictEqual(rollSpinDrop({ luckyCharm: false }), null)
    );
  });

  test("drop fires past the nothing threshold", () => {
    withRandom(0.95, () => {
      const drop = rollSpinDrop({});
      assert.ok(drop && ["coins", "card", "crate"].includes(drop.type));
    });
  });

  test("lucky charm widens the drop window", () => {
    withRandom(0.87, () => {
      // 0.87 >= 0.85 → drop WITH charm; < 0.90 → nothing without
      assert.notStrictEqual(rollSpinDrop({ luckyCharm: true }), null);
      assert.strictEqual(rollSpinDrop({ luckyCharm: false }), null);
    });
  });

  test("kind rolls map to coin/card/crate", () => {
    let call = 0;
    const seq = [0.91, 0.5]; // in drop window, then coins (<0.7)
    withRandom(() => seq[call++ % seq.length], () => {
      assert.deepStrictEqual(rollSpinDrop({}), { type: "coins" });
    });
    call = 0;
    const seq2 = [0.91, 0.75];
    withRandom(() => seq2[call++ % seq2.length], () => {
      assert.deepStrictEqual(rollSpinDrop({}), { type: "card" });
    });
    call = 0;
    const seq3 = [0.91, 0.95];
    withRandom(() => seq3[call++ % seq3.length], () => {
      assert.deepStrictEqual(rollSpinDrop({}), { type: "crate" });
    });
  });
});
