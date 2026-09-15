// Stacks raw per-row inventory rows ({ card_id, rarity, mutation, corrupted })
// into one entry per card id with counts. Pure (unit-tested).
//
// Both /state and /inventory MUST feed this per-row results. Never
// pre-aggregate in SQL: an aggregate like MAX() without GROUP BY collapses
// the whole result into a single row, and the player sees one card.
function stackInventory(rows) {
  const stacked = {};

  rows.forEach((c) => {
    const id = c.card_id;

    if (!stacked[id]) {
      stacked[id] = {
        id,
        rarity: c.rarity || "common",
        count: 1,
        mutation: c.mutation || 1,
        corrupted: !!c.corrupted
      };
    } else {
      stacked[id].count++;
      stacked[id].mutation = Math.max(stacked[id].mutation, c.mutation || 1);
      stacked[id].corrupted = stacked[id].corrupted || !!c.corrupted;
    }
  });

  return Object.values(stacked);
}

module.exports = { stackInventory };
