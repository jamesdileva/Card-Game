const CARD_NAMES = {
  lucky_charm: "Lucky Charm",
  reroll: "Reroll",
  double_down: "Double Down",
  jackpot_boost: "Jackpot Boost",
  wild_symbol: "Wild Symbol",
  multiplier_chain: "Multiplier Chain",
  mythic_multiplier: "Mythic Multiplier"
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
