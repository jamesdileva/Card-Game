import { cardName, rarityBorder, rarityText } from "./cardNames";

// Plain-English effect text (kept in sync with backend/game/effects.js)
const CARD_EFFECTS = {
  lucky_charm: "+10% Luck — harmonizes reels toward matches, improves bonus drops",
  reroll: "+25% chance to reroll a losing spin",
  double_down: "+50% payout multiplier",
  jackpot_boost: "+100% payout multiplier",
  wild_symbol: "+30% Luck",
  multiplier_chain: "+20% payout multiplier",
  mythic_multiplier: "+200% payout multiplier",
  safety_net: "Refunds 20% of your bet on losing spins",
  hot_streak: "Streak bonus grows +2% faster per win",
  jackpot_surge: "+3% chance a winning spin pays ×5"
};

export default function Card({
  id,
  rarity = "common",
  count,
  mutation,
  corrupted
}) {
  const parts = [`${cardName(id)} · ${rarity}`];
  if (CARD_EFFECTS[id]) parts.push(CARD_EFFECTS[id]);
  if (mutation > 1) {
    parts.push(`Mutation: +${Math.round((mutation - 1) * 100)}% effect strength`);
  }
  if (corrupted) {
    parts.push("CORRUPTED: ×2 effect but −15% XP while equipped");
  }

  return (
    <div
      title={parts.join("  •  ")}
      className={`w-full h-full rounded-xl border-2 bg-gradient-to-b
        from-zinc-800 to-zinc-900 flex flex-col justify-between p-2
        shadow-lg ${rarityBorder(rarity)}
        ${corrupted ? "ring-2 ring-red-600/70 shadow-[0_0_10px_rgba(220,38,38,0.35)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`text-[9px] font-semibold uppercase tracking-wide ${rarityText(rarity)}`}>
          {corrupted ? "☠ corrupted" : rarity}
        </span>
        {count != null && (
          <span className="text-[10px] text-zinc-300 bg-zinc-800 border border-zinc-600 rounded px-1 leading-4">
            ×{count}
          </span>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-0.5">
        <div className="text-[11px] text-center font-bold leading-tight break-words">
          {cardName(id)}
        </div>
      </div>

      <div className="flex items-end justify-between gap-1">
        <span className="text-[9px] leading-none text-zinc-500">
          {corrupted ? "☠️" : ""}
        </span>
        {mutation > 1 && (
          <span className="text-[9px] font-bold text-purple-400 leading-none">
            ✦{Math.round((mutation - 1) * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
