import { cardName, rarityBorder, rarityText } from "./cardNames";

export default function Card({ id, rarity = "common", count }) {
  return (
    <div
      className={`w-full h-full rounded-xl border-2 bg-gradient-to-b
        from-zinc-800 to-zinc-900 flex flex-col justify-between p-2
        shadow-lg ${rarityBorder(rarity)}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`text-[9px] font-semibold uppercase tracking-wide ${rarityText(rarity)}`}>
          {rarity}
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
    </div>
  );
}
