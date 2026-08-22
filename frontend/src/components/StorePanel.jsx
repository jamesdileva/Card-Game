export default function StorePanel({
  onUpgradeXP,
  onUpgradePayout,
  onOpenCrate
}) {
  const crates = [
    { type: "basic", label: "BASIC", style: "bg-zinc-600 hover:bg-zinc-500" },
    {
      type: "premium",
      label: "PREMIUM",
      style: "bg-purple-600 hover:bg-purple-500"
    },
    {
      type: "elite",
      label: "ELITE",
      style: "bg-yellow-500 hover:bg-yellow-400 text-black"
    }
  ];

  return (
    <div className="bg-zinc-800 p-4 rounded-xl space-y-4">
      <div>
        <div className="text-sm text-zinc-400 mb-2">Upgrades</div>

        <div className="flex gap-2">
          <button
            onClick={onUpgradeXP}
            className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-lg py-2 text-sm font-bold"
          >
            ⚡ XP Boost ($1000)
          </button>

          <button
            onClick={onUpgradePayout}
            className="flex-1 bg-green-500 hover:bg-green-600 rounded-lg py-2 text-sm font-bold"
          >
            💰 Payout Boost ($1000)
          </button>
        </div>
      </div>

      <div>
        <div className="text-sm text-zinc-400 mb-2">Crates</div>

        <div className="flex gap-2">
          {crates.map((crate) => (
            <button
              key={crate.type}
              onClick={() => onOpenCrate(crate.type)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${crate.style}`}
            >
              {crate.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
