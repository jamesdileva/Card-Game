import Card from "./Card";
import { MERGE_COST, nextRarity } from "./cardNames";

export default function InventoryPanel({ inventory, onEvolve }) {
  return (
    <div className="bg-zinc-800 p-4 rounded-xl">
      {inventory.length === 0 ? (
        <div className="text-zinc-500 text-center py-6">No items</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 justify-items-center">
          {inventory.map((item, i) => {
            const target = nextRarity(item.rarity);
            const evolvable = onEvolve && item.count >= MERGE_COST && target;

            return (
              <div key={i} className="w-full">
                <div
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("card", JSON.stringify(item))
                  }
                  className="w-full aspect-[5/7] cursor-grab hover:scale-105 transition"
                >
                  <Card id={item.id} rarity={item.rarity} count={item.count} />
                </div>
                {evolvable && (
                  <button
                    onClick={() => onEvolve(item.id)}
                    title={`Merge ${MERGE_COST}× into a random ${target} card`}
                    className="w-full mt-1 py-0.5 text-[10px] font-bold rounded
                      bg-purple-600/80 hover:bg-purple-500 text-white transition"
                  >
                    ✨ Evolve → {target}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
