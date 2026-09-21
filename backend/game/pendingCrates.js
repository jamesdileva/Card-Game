// Pending (unopened) crates stored as JSON in users.pending_crate.
//
// The column historically held a single { type, unlockAt } object (timed
// crate only). It now holds an ARRAY of { id, type, unlockAt } so timed
// countdowns and free bonus pulls coexist. Legacy single objects read as a
// one-element list — no schema migration needed.
function readPendingCrates(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.filter(
    (c) => c && typeof c === "object" && typeof c.type === "string"
  );
}

function writePendingCrates(list) {
  return JSON.stringify(list);
}

function hasPendingType(list, type) {
  return list.some((c) => c.type === type);
}

function findPendingCrate(list, id) {
  return list.find((c) => c.id === id) || null;
}

function addPendingCrate(list, entry) {
  return [...list, entry];
}

function removePendingCrate(list, id) {
  return list.filter((c) => c.id !== id);
}

function makePendingId() {
  return (
    Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36)
  );
}

module.exports = {
  readPendingCrates,
  writePendingCrates,
  hasPendingType,
  findPendingCrate,
  addPendingCrate,
  removePendingCrate,
  makePendingId
};
