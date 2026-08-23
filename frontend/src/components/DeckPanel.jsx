import { useRef } from "react";
import Card from "./Card";
import { cardName } from "./cardNames";

export default function DeckPanel({ deck, inventory, setDeck, setToast }) {
  const validDropRef = useRef(false);

  function removeFromSlot(i) {
    setDeck((prev) => {
      const newDeck = [...prev];
      newDeck[i] = null;
      return newDeck;
    });
  }

  function copiesInDeck(cardId) {
    return deck.filter((c) => c === cardId).length;
  }

  // Click-to-equip: fill the first empty slot, respecting owned copy counts.
  function equipCard(cardId) {
    const invItem = inventory.find((it) => it.id === cardId);
    const maxAllowed = invItem?.count || 0;

    if (copiesInDeck(cardId) >= maxAllowed) {
      setToast(`Only ${maxAllowed}× ${cardName(cardId)} owned`);
      return;
    }

    const slot = deck.findIndex((c) => c === null || c === undefined);

    if (slot === -1) {
      setToast("Deck full — remove a card first");
      return;
    }

    setDeck((prev) => {
      const newDeck = [...prev];
      newDeck[slot] = cardId;
      return newDeck;
    });
  }

  return (
    <div className="bg-zinc-800 p-4 rounded-xl space-y-4">
      <div>
        <div className="flex gap-3 justify-center">
          {deck.map((card, i) => {
            const item = inventory.find((inv) => inv.id === card);

            return (
              <div
                key={i}
                className="relative w-24"
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

                    const newCount =
                      simulated.filter((c) => c === cardId).length;

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
                    <Card
                      id={card}
                      rarity={item?.rarity}
                      mutation={item?.mutation}
                      corrupted={item?.corrupted}
                    />
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
        <div className="text-[10px] text-zinc-500 text-center mt-2">
          Click a card below to equip it, or drag onto a slot. Click an
          equipped card to remove it. Hover any card to see its effect.
        </div>
      </div>

      <div>
        <div className="text-sm text-zinc-400 mb-2">Your cards</div>
        {inventory.length === 0 ? (
          <div className="text-zinc-500 text-center py-4 text-sm">
            Open crates in the Store tab to get cards
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {inventory.map((item, i) => {
              const inDeck = copiesInDeck(item.id);
              const exhausted = inDeck >= item.count;

              return (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("card", JSON.stringify(item))
                  }
                  onClick={() => equipCard(item.id)}
                  title={`${cardName(item.id)} — click to equip`}
                  className={`relative w-full aspect-[5/7] cursor-pointer hover:scale-105 transition ${
                    exhausted ? "opacity-40" : ""
                  }`}
                >
                  <Card
                    id={item.id}
                    rarity={item.rarity}
                    count={item.count}
                    mutation={item.mutation}
                    corrupted={item.corrupted}
                  />
                  {inDeck > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 bg-green-500 text-black text-[9px]
                        font-bold rounded-full w-4 h-4 flex items-center justify-center z-10"
                    >
                      {inDeck}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
