const CARD_NAMES = {
  lucky_charm: "Lucky Charm",
  reroll: "Reroll",
  double_down: "Double Down",
  jackpot_boost: "Jackpot Boost",
  wild_symbol: "Wild Symbol",
  multiplier_chain: "Multiplier Chain",
  mythic_multiplier: "Mythic Multiplier",
  safety_net: "Safety Net",
  hot_streak: "Hot Streak",
  jackpot_surge: "Jackpot Surge"
};

export function cardName(id) {
  return (
    CARD_NAMES[id] ||
    String(id)
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function rarityBorder(rarity) {
  switch (rarity) {
    case "legendary":
      return "border-yellow-400 shadow-yellow-500/40";
    case "epic":
      return "border-purple-400 shadow-purple-500/40";
    case "rare":
      return "border-blue-400 shadow-blue-500/30";
    default:
      return "border-zinc-600";
  }
}

export function rarityText(rarity) {
  switch (rarity) {
    case "legendary":
      return "text-yellow-400";
    case "epic":
      return "text-purple-400";
    case "rare":
      return "text-blue-400";
    default:
      return "text-zinc-400";
  }
}

// Card evolution (mirrors backend/game/evolution.js)
export const MERGE_COST = 3;
const RARITY_ORDER = ["common", "rare", "epic", "legendary"];

export function nextRarity(rarity) {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx === -1 || idx === RARITY_ORDER.length - 1) return null;
  return RARITY_ORDER[idx + 1];
}

// Set/synergy descriptions (kept in sync with backend/game/effects.js).
// Keyed by trimmed label — one backend label ("Triple Mythic") carries a
// stray leading space, trimming makes lookups robust to that quirk.
// `group` drives the Sets reference tab; keep all three fields filled.
export const SYNERGY_EFFECTS = {
  "Lucky Jackpot": {
    req: "Lucky Charm + Jackpot Boost",
    fx: "payout ×1.5, +10% Luck",
    group: "pair"
  },
  "Chain Reroll": {
    req: "Reroll + Multiplier Chain",
    fx: "+20% reroll chance, payout ×1.3",
    group: "pair"
  },
  "Mythic Double": {
    req: "Double Down + Mythic Multiplier",
    fx: "payout ×2",
    group: "pair"
  },
  "Triple Mythic": {
    req: "3× Mythic Multiplier",
    fx: "payout +7x, +20% Luck",
    group: "count"
  },
  "Lucky Pair": {
    req: "2× Lucky Charm",
    fx: "+30% reroll chance",
    group: "count"
  },
  "Reroll Engine": {
    req: "2× Reroll",
    fx: "+50% reroll chance",
    group: "count"
  },
  "Luck Engine": {
    req: "Lucky Charm + Reroll",
    fx: "+25% reroll chance, +20% Luck",
    group: "mixed"
  },
  "Chain Scaling": {
    req: "2× Multiplier Chain",
    fx: "payout +1x, XP gain +50%",
    group: "mixed"
  },
  "Wild Surge": {
    req: "2× Wild Symbol",
    fx: "+$300 flat bonus on winning spins",
    group: "mixed"
  },
  "Jackpot Overload": {
    req: "2× Jackpot Boost",
    fx: "payout +2x",
    group: "mixed"
  },
  "GOD BUILD": {
    req: "Mythic Multiplier + Jackpot Boost + Multiplier Chain",
    fx: "payout ×2, +50% Luck",
    group: "god"
  },
  "Safety Inspector": {
    req: "Safety Net + Reroll",
    fx: "refund +12% of bet, +15% reroll chance",
    group: "archetype"
  },
  "Surge Rider": {
    req: "Hot Streak + Jackpot Surge",
    fx: "surge chance +3%, streak rate +1%",
    group: "archetype"
  },
  "Vault Buster": {
    req: "Jackpot Boost + Jackpot Surge",
    fx: "payout ×1.5",
    group: "archetype"
  },
  "Chaos Engine": {
    req: "Wild Symbol + Jackpot Surge",
    fx: "+40% Luck",
    group: "archetype"
  },
  "Steady Burn": {
    req: "Safety Net + Hot Streak",
    fx: "refund +5% of bet, streak rate +2%",
    group: "archetype"
  }
};

// Stat tile explanations for the stats bar hover tooltips.
export const STAT_TOOLTIPS = {
  deck: "Deck payout multiplier — combined effect of your 3 equipped cards and their synergies",
  boost:
    "Payout Boost — permanent upgrade bought in the Store; multiplies every payout",
  xp: "XP Boost — permanent upgrade bought in the Store; levels you up faster",
  luck:
    "Luck — nudges reels toward matches after a spin and widens bonus-drop odds"
};

// Backend labels are emoji-prefixed ("🛡️ Safety Inspector") and one carries
// a stray leading space ("Triple Mythic"); normalize to bare words for lookup.
// Exported for the Sets reference tab (active-set highlighting).
export function synergyKey(label) {
  return String(label)
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}

// Builds the hover text for the synergy strip: each active set on its own
// line as "Name · required cards · effect". Unknown labels pass through so
// a backend rename never produces an empty tooltip entry.
export function synergyTooltip(synergies) {
  if (!synergies || synergies.length === 0) return "";
  return synergies
    .map((raw) => {
      const name = String(raw).trim();
      const info = SYNERGY_EFFECTS[synergyKey(raw)];
      return info ? `${name} · ${info.req} · ${info.fx}` : name;
    })
    .join("\n");
}
