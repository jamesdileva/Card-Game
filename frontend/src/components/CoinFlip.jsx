import { useState } from "react";

export default function CoinFlip({
  multiplier,
  setMultiplier,
  onFlip,
  flipping,
  result,
  disabled
}) {
  const [choice, setChoice] = useState("heads");
  const bet = 100 * multiplier;

  return (
    <div className="bg-zinc-800 border border-zinc-700 p-6 rounded-2xl shadow-2xl w-full">
      {/* 🪙 THE COIN */}
      <div className="flex justify-center mb-6 mt-2">
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-extrabold
            bg-gradient-to-br from-yellow-300 to-yellow-600 text-yellow-900
            shadow-[0_0_35px_rgba(250,204,21,0.4)] border-4 border-yellow-500
            ${flipping ? "" : "transition-transform duration-300"}`}
          style={flipping ? { animation: "coinSpin 0.9s ease-in-out forwards" } : {}}
        >
          {flipping ? "🪙" : result ? (result.flip === "heads" ? "H" : "T") : "?"}
        </div>
      </div>

      {/* RESULT */}
      <div className="text-center mb-5 min-h-[48px] flex items-center justify-center">
        {flipping ? (
          <span className="text-zinc-400 text-sm tracking-widest uppercase animate-pulse">
            Flipping...
          </span>
        ) : result ? (
          result.win ? (
            <span className="text-green-400 text-2xl font-extrabold drop-shadow-[0_0_12px_rgba(34,197,94,0.8)]">
              Won ${result.payout.toLocaleString()}
            </span>
          ) : (
            <span className="text-red-400 text-xl font-bold">
              Lost ${bet.toLocaleString()} — it landed {result.flip}
            </span>
          )
        ) : (
          <span className="text-zinc-500">Pick a side and flip</span>
        )}
      </div>

      {/* PICK A SIDE */}
      <div className="flex gap-3 mb-4">
        {["heads", "tails"].map((side) => (
          <button
            key={side}
            onClick={() => setChoice(side)}
            disabled={flipping}
            className={`flex-1 py-3 rounded-xl font-bold capitalize transition-all
              ${choice === side
                ? side === "heads"
                  ? "bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.6)] scale-[1.02]"
                  : "bg-zinc-400 text-black shadow-[0_0_12px_rgba(212,212,216,0.6)] scale-[1.02]"
                : "bg-zinc-700 hover:bg-zinc-600"
              }
              ${flipping ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            {side === "heads" ? "🪙 Heads" : "🌑 Tails"}
          </button>
        ))}
      </div>

      {/* FLIP BUTTON */}
      <button
        onClick={() => onFlip(choice)}
        disabled={flipping || disabled}
        className={`w-full py-3 text-sm font-bold rounded-xl transition-all mb-3
          ${flipping || disabled
            ? "bg-zinc-600 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600 hover:scale-[1.02] active:scale-95 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
          }
        `}
      >
        {flipping ? "Flipping..." : `🪙 Flip $${bet}`}
      </button>

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
