import { useEffect, useState } from "react";

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function StorePanel({
  onUpgradeXP,
  onUpgradePayout,
  onOpenCrate,
  pendingCrate
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pendingCrate?.unlockAt) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [pendingCrate]);

  const remaining =
    pendingCrate?.unlockAt != null
      ? Math.max(0, Math.ceil((pendingCrate.unlockAt - now) / 1000))
      : null;
  const timedReady = remaining !== null && remaining <= 0;

  const crates = [
    {
      type: "basic",
      label: "BASIC",
      sub: "$100",
      style: "bg-zinc-600 hover:bg-zinc-500"
    },
    {
      type: "premium",
      label: "PREMIUM",
      sub: "$250",
      style: "bg-purple-600 hover:bg-purple-500"
    },
    {
      type: "elite",
      label: "ELITE",
      sub: "$500",
      style: "bg-yellow-500 hover:bg-yellow-400 text-black"
    },
    {
      type: "corrupted",
      label: "CORRUPTED",
      sub: "$700 · high risk",
      style: "bg-red-600 hover:bg-red-500"
    },
    {
      type: "timed",
      label: timedReady ? "OPEN!" : "TIMED",
      sub:
        remaining === null
          ? "$400 · rare+ guaranteed"
          : timedReady
            ? "ready to open"
            : `unlocks ${formatSeconds(remaining)}`,
      style:
        timedReady
          ? "bg-green-500 hover:bg-green-400 text-black animate-pulse"
          : "bg-sky-600 hover:bg-sky-500"
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {crates.map((crate) => (
            <button
              key={crate.type}
              onClick={() => onOpenCrate(crate.type)}
              disabled={crate.type === "timed" && remaining !== null && !timedReady}
              className={`py-2 rounded-lg text-xs font-bold transition flex flex-col items-center
                ${crate.style}
                ${crate.type === "timed" && remaining !== null && !timedReady
                  ? "opacity-70 cursor-not-allowed"
                  : ""
                }`}
            >
              <span>{crate.label}</span>
              <span className="text-[10px] font-normal opacity-80">{crate.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
