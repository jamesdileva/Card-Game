import Card from "./Card";

export default function InventoryPanel({ inventory }) {
  return (
    <div className="bg-zinc-800 p-4 rounded-xl">
      {inventory.length === 0 ? (
        <div className="text-zinc-500 text-center py-6">No items</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 justify-items-center">
          {inventory.map((item, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("card", JSON.stringify(item))
              }
              className="w-full aspect-[5/7] cursor-grab hover:scale-105 transition"
            >
              <Card id={item.id} rarity={item.rarity} count={item.count} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
