import { useEffect, useMemo, useState } from "react";

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function StorePanel({
  onUpgradeXP,
  onUpgradePayout,
  onOpenCrate,
  pendingCrates = [],
  busy = false
}) {
  const [now, setNow] = useState(() => Date.now());
  const pending = useMemo(() => pendingCrates || [], [pendingCrates]);

  useEffect(() => {
    if (!pending.some((c) => c.unlockAt && c.unlockAt > Date.now())) {
      return undefined;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [pending]);

  // The timed crate keeps its single-slot UX (one timed pending at a time);
  // free bonus pulls surface separately below so the two never collide.
  const timedEntry = pending.find((c) => c.type === "timed") || null;
  const bonusEntries = pending.filter((c) => c.type !== "timed");

  const remaining =
    timedEntry?.unlockAt != null
      ? Math.max(0, Math.ceil((timedEntry.unlockAt - now) / 1000))
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
            disabled={busy}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition
              ${busy
                ? "bg-zinc-600 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
              }
            `}
          >
            ⚡ XP Boost ($1000)
          </button>

          <button
            onClick={onUpgradePayout}
            disabled={busy}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition
              ${busy
                ? "bg-zinc-600 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
              }
            `}
          >
            💰 Payout Boost ($1000)
          </button>
        </div>
      </div>

      <div>
        <div className="text-sm text-zinc-400 mb-2">Crates</div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {crates.map((crate) => {
            const timedLocked =
              crate.type === "timed" && remaining !== null && !timedReady;
            const openPendingId =
              crate.type === "timed" && timedReady && timedEntry
                ? timedEntry.id
                : null;
            return (
              <button
                key={crate.type}
                onClick={() =>
                  openPendingId
                    ? onOpenCrate(null, openPendingId)
                    : onOpenCrate(crate.type)
                }
                disabled={busy || timedLocked}
                className={`py-2 rounded-lg text-xs font-bold transition flex flex-col items-center
                  ${crate.style}
                  ${busy || timedLocked ? "opacity-70 cursor-not-allowed" : ""}
                `}
              >
                <span>{crate.label}</span>
                <span className="text-[10px] font-normal opacity-80">{crate.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {bonusEntries.length > 0 && (
        <div>
          <div className="text-sm text-zinc-400 mb-2">
            📦 Unopened bonus pulls
          </div>
          <div className="flex flex-col gap-2">
            {bonusEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-zinc-900/60 px-3 py-2"
              >
                <span className="text-xs font-bold text-yellow-200">
                  {(crates.find((c) => c.type === entry.type)?.label ||
                    entry.type).toUpperCase()}{" "}
                  — free pull
                </span>
                <button
                  onClick={() => onOpenCrate(null, entry.id)}
                  disabled={busy}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition
                    ${busy
                      ? "bg-zinc-600 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-400 text-black animate-pulse"
                    }
                  `}
                >
                  OPEN
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
