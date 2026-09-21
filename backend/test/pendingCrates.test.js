const { test, describe } = require("node:test");
const assert = require("node:assert");

const {
  readPendingCrates,
  writePendingCrates,
  hasPendingType,
  findPendingCrate,
  addPendingCrate,
  removePendingCrate
} = require("../game/pendingCrates");

describe("game/pendingCrates", () => {
  test("empty/missing storage reads as an empty list", () => {
    assert.deepStrictEqual(readPendingCrates(null), []);
    assert.deepStrictEqual(readPendingCrates(""), []);
  });

  test("garbage and non-objects read as an empty list", () => {
    assert.deepStrictEqual(readPendingCrates("not-json{"), []);
    assert.deepStrictEqual(readPendingCrates("42"), []);
    assert.deepStrictEqual(readPendingCrates('"elite"'), []);
  });

  test("legacy single-object shape reads as a one-element list", () => {
    const raw = JSON.stringify({ type: "timed", unlockAt: 123 });
    assert.deepStrictEqual(readPendingCrates(raw), [
      { type: "timed", unlockAt: 123 }
    ]);
  });

  test("arrays round-trip through write/read", () => {
    const list = [
      { id: "a", type: "timed", unlockAt: 1 },
      { id: "b", type: "elite", unlockAt: 2 }
    ];
    assert.deepStrictEqual(readPendingCrates(writePendingCrates(list)), list);
  });

  test("timed and elite entries coexist; helpers scope by type and id", () => {
    let list = [];
    list = addPendingCrate(list, { id: "t1", type: "timed", unlockAt: 999 });
    list = addPendingCrate(list, { id: "e1", type: "elite", unlockAt: 0 });
    assert.strictEqual(hasPendingType(list, "timed"), true);
    assert.strictEqual(hasPendingType(list, "elite"), true);
    assert.strictEqual(hasPendingType(list, "basic"), false);
    assert.deepStrictEqual(findPendingCrate(list, "e1"), {
      id: "e1",
      type: "elite",
      unlockAt: 0
    });
    assert.strictEqual(findPendingCrate(list, "nope"), null);

    list = removePendingCrate(list, "e1");
    assert.strictEqual(hasPendingType(list, "elite"), false);
    assert.strictEqual(hasPendingType(list, "timed"), true);
  });
});
