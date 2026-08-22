import { useState } from "react";

// Same odds math as backend/game/hilo.js so previews match payouts exactly.
function payoutMultiplier(number, direction) {
  const outcomes =
    direction === "higher" ? 100 - number : direction === "lower" ? number - 1 : -1;
  if (outcomes <= 0) return null;
  return Math.floor(9500 / outcomes) / 100;
}

export default function HiLo({
  multiplier,
  setMultiplier,
  onStart,
  onGuess,
  disabled
}) {
  const [base, setBase] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const bet = 100 * multiplier;

  async function handleStart() {
    if (busy || disabled) return;
    setBusy(true);
    setResult(null);
    const data = await onStart();
    setBusy(false);
    if (data && typeof data.number === "number") {
      setBase(data.number);
    }
  }

  async function handleGuess(direction) {
    if (busy || disabled || base === null) return;
    if (payoutMultiplier(base, direction) === null) return;

    setBusy(true);
    const data = await onGuess(direction);
    setBusy(false);
    if (!data) return;

    setResult({ ...data, previous: base });
    if (typeof data.number === "number") {
      setBase(data.number); // roll chains into the next round's base
    }
  }

  const higherMult = base !== null ? payoutMultiplier(base, "higher") : null;
  const lowerMult = base !== null ? payoutMultiplier(base, "lower") : null;

  return (
    <div className="bg-zinc-800 border border-zinc-700 p-6 rounded-2xl shadow-2xl w-full">
      {/* 🔢 THE NUMBER */}
      <div className="flex justify-center mb-2 mt-2">
        <div
          key={result?.number ?? base ?? "empty"}
          className={`w-32 h-32 rounded-2xl flex items-center justify-center
            bg-zinc-900 border-4 shadow-2xl transition-all duration-300
            ${result
              ? result.win
                ? "border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                : "border-red-500/70"
              : "border-zinc-600"
            }`}
        >
          <span className="text-5xl font-extrabold text-white">
            {base ?? "?"}
          </span>
        </div>
      </div>

      {/* RESULT LINE */}
      <div className="text-center mb-5 min-h-[24px]">
        {base === null ? (
          <span className="text-zinc-500 text-sm">
            Roll a number to start — then bet higher or lower
          </span>
        ) : result ? (
          result.win ? (
            <span className="text-green-400 font-extrabold text-lg drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]">
              Won ${result.payout.toLocaleString()} — {result.previous} →{" "}
              {result.number}
            </span>
          ) : (
            <span className="text-red-400 font-bold">
              Lost ${bet.toLocaleString()} — {result.previous} →{" "}
              {result.number}
            </span>
          )
        ) : (
          <span className="text-zinc-500 text-sm">
            Ties lose · next roll becomes your new base
          </span>
        )}
      </div>

      {/* START / GUESS BUTTONS */}
      {base === null ? (
        <button
          onClick={handleStart}
          disabled={busy || disabled}
          className={`w-full py-3 text-sm font-bold rounded-xl transition-all mb-3
            ${busy || disabled
              ? "bg-zinc-600 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 hover:scale-[1.02] active:scale-95 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
            }
          `}
        >
          {busy ? "Rolling..." : "🎲 Roll a number"}
        </button>
      ) : (
        <div className="flex gap-3 mb-3">
          {[
            {
              dir: "higher",
              label: "▲ Higher",
              mult: higherMult,
              style: "bg-green-500 hover:bg-green-600 shadow-[0_0_12px_rgba(34,197,94,0.4)]"
            },
            {
              dir: "lower",
              label: "▼ Lower",
              mult: lowerMult,
              style: "bg-orange-500 hover:bg-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.4)]"
            }
          ].map((side) => {
            const impossible = side.mult === null;
            return (
              <button
                key={side.dir}
                onClick={() => handleGuess(side.dir)}
                disabled={busy || disabled || impossible}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all
                  ${impossible
                    ? "bg-zinc-700/50 text-zinc-600 cursor-not-allowed"
                    : `${side.style} active:scale-95`
                  }
                  ${busy ? "opacity-60 cursor-not-allowed" : ""}
                `}
              >
                {side.label}
                <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                  {impossible
                    ? "no winning rolls"
                    : `x${side.mult.toFixed(2)} payout`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* NEW NUMBER (reroll base without betting) */}
      {base !== null && (
        <button
          onClick={handleStart}
          disabled={busy || disabled}
          className={`w-full py-2 mb-3 text-xs font-semibold rounded-lg transition
            ${busy || disabled
              ? "text-zinc-600 bg-zinc-800 cursor-not-allowed"
              : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
            }
          `}
        >
          🔄 New number (free)
        </button>
      )}

      {/* MULTIPLIERS */}
      <div className="flex gap-2 justify-center w-full">
        {[1, 2, 5, 10].map((m) => (
          <button
            key={m}
            onClick={() => setMultiplier(m)}
            className={`px-3 py-1 rounded-lg text-sm font-bold transition
              ${multiplier === m
                ? "bg-yellow-400 text-black shadow-[0_0_6px_rgba(250,204,21,0.7)]"
                : "bg-zinc-700 hover:bg-zinc-600"
              }
            `}
          >
            x{m}
          </button>
        ))}
      </div>
    </div>
  );
}
