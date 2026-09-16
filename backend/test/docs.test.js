const { test, describe } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { cards } = require("../game/cards");
const { calculateDeckEffects, calculateSynergies } = require("../game/effects");

// Guards docs/cards-and-sets.md against drifting behind the code: every
// catalog card and every synergy the backend can emit must be mentioned.
// Same precedent as the frontend synergyTooltip coverage test.
const doc = fs.readFileSync(
  path.join(__dirname, "..", "..", "docs", "cards-and-sets.md"),
  "utf8"
);

// Mirror of the frontend synergyKey(): trim + strip leading non-alphanumerics
// (backend labels are emoji-prefixed; one has a stray leading space).
function synergyKey(label) {
  return String(label)
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}

// Exhaust the 3-slot deck space (10 ids + empty) and collect every label.
function allSynergyLabels() {
  const ids = cards.map((c) => c.id);
  const slots = [...ids, null];
  const labels = new Set();
  for (const a of slots) {
    for (const b of slots) {
      for (const c of slots) {
        const effects = calculateDeckEffects([a, b, c]);
        calculateSynergies([a, b, c], effects);
        for (const s of effects.synergies || []) labels.add(synergyKey(s));
      }
    }
  }
  return [...labels];
}

describe("cards-and-sets.md coverage", () => {
  test("documents every catalog card id", () => {
    assert.ok(cards.length > 0, "catalog is empty");
    for (const c of cards) {
      assert.ok(
        doc.includes(`\`${c.id}\``),
        `docs missing card ${c.id}`
      );
    }
  });

  test("documents every synergy the backend can emit", () => {
    const labels = allSynergyLabels();
    assert.ok(
      labels.length >= 16,
      `expected at least 16 synergies, got ${labels.length}`
    );
    for (const label of labels) {
      assert.ok(doc.includes(label), `docs missing synergy ${label}`);
    }
  });
});
