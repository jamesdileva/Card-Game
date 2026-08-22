import { useRef } from "react";
import Card from "./Card";

export default function DeckPanel({ deck, inventory, setDeck }) {
  const validDropRef = useRef(false);

  function removeFromSlot(i) {
    setDeck((prev) => {
      const newDeck = [...prev];
      newDeck[i] = null;
      return newDeck;
    });
  }

  return (
    <div className="bg-zinc-800 p-4 rounded-xl">
      <div className="flex gap-3 justify-center">
        {deck.map((card, i) => {
          const item = inventory.find((inv) => inv.id === card);

          return (
            <div
              key={i}
              className="w-24"
              draggable={!!card}
              onDragStart={(e) => {
                validDropRef.current = false;
                e.currentTarget.classList.add("opacity-50");
              }}
              onDragEnd={(e) => {
                e.currentTarget.classList.remove("opacity-50");
                if (!validDropRef.current && card) removeFromSlot(i);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                validDropRef.current = true;

                const raw = e.dataTransfer.getData("card");
                if (!raw) return;

                const parsed = JSON.parse(raw);
                const cardId = parsed.id;

                setDeck((prev) => {
                  const newDeck = [...prev];

                  const simulated = [...newDeck];
                  simulated[i] = cardId;

                  const newCount = simulated.filter((c) => c === cardId).length;

                  const invItem = inventory.find((it) => it.id === cardId);
                  const maxAllowed = invItem?.count || 0;

                  if (newCount > maxAllowed) return prev;

                  return simulated;
                });
              }}
              onClick={() => card && removeFromSlot(i)}
            >
              <div className="h-32">
                {card ? (
                  <Card id={card} rarity={item?.rarity} />
                ) : (
                  <div className="w-full h-full rounded-xl border-2 border-dashed border-zinc-600 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                    Drop Card
                  </div>
                )}
              </div>
              <div className="text-[9px] text-center text-zinc-500 mt-1">
                Slot {i + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
