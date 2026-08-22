// Input validation helpers for gameplay routes. Pure functions so they can
// be unit-tested without an HTTP layer.

const MAX_BET = 1000000;
const VALID_CRATE_TYPES = ["basic", "premium", "elite"];
const MAX_DECK_SIZE = 3;

// Bets must be positive integers within the cap. Returns the sanitized
// number or null when invalid.
function sanitizeBet(bet, max = MAX_BET) {
  if (typeof bet !== "number" || !Number.isFinite(bet)) return null;
  const int = Math.floor(bet);
  if (int !== bet) return null;
  if (int <= 0 || int > max) return null;
  return int;
}

function isValidCrateType(type) {
  return typeof type === "string" && VALID_CRATE_TYPES.includes(type);
}

// Deck must be an array of at most 3 entries, each a card id string or
// null. Returns { ok: true, deck } with exactly 3 normalized slots, or
// { ok: false, error }.
function sanitizeDeckShape(newDeck) {
  if (!Array.isArray(newDeck)) {
    return { ok: false, error: "Deck must be an array" };
  }
  if (newDeck.length > MAX_DECK_SIZE) {
    return { ok: false, error: `Deck can hold at most ${MAX_DECK_SIZE} cards` };
  }

  const deck = [];
  for (const slot of newDeck) {
    if (slot === null || slot === undefined || slot === "") {
      deck.push(null);
      continue;
    }
    if (typeof slot !== "string") {
      return { ok: false, error: "Invalid card in deck" };
    }
    deck.push(slot);
  }
  while (deck.length < MAX_DECK_SIZE) deck.push(null);

  return { ok: true, deck };
}

// Ownership check: every non-null card must exist in inventoryCounts and
// not be used more times than owned. inventoryCounts is { cardId: count }.
function validateDeckOwnership(deck, inventoryCounts) {
  const used = {};
  for (const cardId of deck) {
    if (cardId === null) continue;
    used[cardId] = (used[cardId] || 0) + 1;
  }

  for (const [cardId, count] of Object.entries(used)) {
    const owned = inventoryCounts[cardId] || 0;
    if (owned === 0) {
      return { ok: false, error: `You do not own ${cardId}` };
    }
    if (count > owned) {
      return { ok: false, error: `Only ${owned}× ${cardId} owned` };
    }
  }

  return { ok: true };
}

module.exports = {
  MAX_BET,
  VALID_CRATE_TYPES,
  MAX_DECK_SIZE,
  sanitizeBet,
  isValidCrateType,
  sanitizeDeckShape,
  validateDeckOwnership
};
