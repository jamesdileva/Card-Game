import { useState, useEffect, useRef } from "react";
export default function SlotMachine() {
  const [balance, setBalance] = useState(0);
  const [payout, setPayout] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [inventoryMin, setInventoryMin] = useState(() => {
  return localStorage.getItem("inventoryMin") === "true";
});
  const [deckMin, setDeckMin] = useState(() => {
  return localStorage.getItem("deckMin") === "true";
});
  const [event, setEvent] = useState(null);
  const [deck, setDeck] = useState([]);
  const [effects, setEffects] = useState({});
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [reels, setReels] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [levelUp, setLevelUp] = useState(null);
  const [loginPopup, setLoginPopup] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [playerBoost, setPlayerBoost] = useState(1);
  const [xpBoost, setXpBoost] = useState(1);
  const [crateResult, setCrateResult] = useState(null);
  const [toast, setToast] = useState(null);
const [streak, setStreak] = useState(0);
const [loginStreak, setLoginStreak] = useState(0);
const [floatingWin, setFloatingWin] = useState(null);
const [spinning, setSpinning] = useState(false);
const [winningIndices, setWinningIndices] = useState([]);
  const bet = 100;
const [winFaded, setWinFaded] = useState(false);
const [spinningReels, setSpinningReels] = useState([false, false, false, false, false]);
const audioCtxRef = useRef(null);
const validDropRef = useRef(false);
const API = import.meta.env.VITE_API_URL + "api";


useEffect(() => {
  audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
}, []);

const spinSoundRef = useRef(null);

const startSpinSound = () => {
  const ctx = audioCtxRef.current;
  if (!ctx) return;

  if (spinSoundRef.current) return; // prevent stacking

  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // softer noise
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.05;
  }

  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300; // smoother

  const gain = ctx.createGain();

  // 🔥 ramp-in (important)
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.2);

  // 🔥 LFO (this adds motion)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  lfo.frequency.value = 6;   // speed of wobble
  lfoGain.gain.value = 60;   // intensity

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  // connect chain
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
  lfo.start();

  spinSoundRef.current = { noise, gain, lfo };
};
const stopSpinSound = () => {
  const ctx = audioCtxRef.current;
  const spin = spinSoundRef.current;
  if (!ctx || !spin) return;

  // 🌫️ smooth fade
  spin.gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + 0.2
  );

  // 🛑 FULL STOP
  setTimeout(() => {
    try {
      spin.noise.stop();
      spin.lfo?.stop();

      spin.noise.disconnect();
      spin.lfo?.disconnect();
      spin.gain.disconnect();
    } catch (e) {}

    spinSoundRef.current = null; // 🔥 important
  }, 250);
};
const playTick = (isFinal = false, index = 0) => {
  const ctx = audioCtxRef.current;
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";

  osc.frequency.value = isFinal
    ? 220
    : 500 - index * 60; // 👈 falling pitch

  gain.gain.value = 0.07;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.stop(ctx.currentTime + 0.08);
};

function getWinningIndices(reels) {
  if (!reels || reels.length === 0) return [];

  const counts = {};
  reels.forEach((sym, i) => {
    if (!counts[sym]) counts[sym] = [];
    counts[sym].push(i);
  });

  // only return symbols that appear 2+ times (or 3+ if you want stricter)
  const winners = Object.values(counts).filter(arr => arr.length >= 2);

  return winners.flat();
}
async function upgradeXP() {
  const res = await fetch(`${API}/game/upgrade/xp`, {
    method: "POST",
    credentials: "include"
  });

  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  setBalance(data.balance);
  setEffects(prev => ({
    ...prev,
    xpMult: data.xpBoost
  }));
}

async function upgradePayout() {
  const res = await fetch(`${API}/game/upgrade/payout`, {
    method: "POST",
    credentials: "include"
  });

  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  setBalance(data.balance);
  setEffects(prev => ({
    ...prev,
    payoutMult: data.payoutBoost
  }));
}

function finishSpin(data) {
const spinSymbols = ["cherry","lemon","orange","grape","clover","gem","star","crown"];

// 🎰 start spinning animation
let spinInterval = setInterval(() => {
  startSpinSound();
  setReels(Array(5).fill(0).map(() =>
    
    spinSymbols[Math.floor(Math.random() * spinSymbols.length)]
  ));
}, 60); // speed of spin

  setSpinningReels([true, true, true, true, true]);

  // ⏳ short spin time before stopping
  setTimeout(() => {
    clearInterval(spinInterval);
    // 🎯 stagger stop
    data.reels.forEach((symbol, i) => {
      setTimeout(() => {
        setReels(prev => {
          playTick(i === data.reels.length - 1, i);
          if (i === data.reels.length - 1) {
            stopSpinSound(); // 🔥 MUST be here
          }
          const updated = [...prev];
          updated[i] = symbol;
          return updated;
        });
        
        setSpinningReels(prev => {
          const updated = [...prev];
          updated[i] = false;
          return updated;
        });

        // ✅ final reel = apply results
        if (i === data.reels.length - 1) {
          setBalance(data.balance);
          setPayout(data.payout);
          setEffects(data.effects || {});
          setXp(data.xp || xp);
          setLevel(data.level || level);
          setEvent(data.event || null);
          setStreak(data.streak || 0);

          const wins = getWinningIndices(data.reels);
          setWinningIndices(wins);
          stopSpinSound();
          if (data.totalLevelReward > 0) {
            setLevelUp({
              rewards: data.levelRewards?.length
                ? data.levelRewards
                : [{
                    level: data.level || level,
                    amount: data.totalLevelReward
                  }],
              total: data.totalLevelReward
            });
          }
        }

      }, 120 * i + (i === data.reels.length - 1 ? 100 : 0));
    });

  }, 250); // 👈 spin duration

  // 🔒 unlock AFTER full animation
  const totalSpinTime = 250 + (120 * data.reels.length);

  setTimeout(() => {
    setSpinning(false);
    spinLock = false;
  }, totalSpinTime + 100);
}


function handleSpinResult(data) {
  const finalReels = data.reels;

  // clear first (optional flicker effect)
  setReels(["?", "?", "?", "?", "?"]);

  finalReels.forEach((symbol, i) => {
    setTimeout(() => {
      setReels(prev => {
        const updated = [...prev];
        updated[i] = symbol;
        return updated;
      });

      // ✅ last reel = apply rewards + unlock
      if (i === finalReels.length - 1) {
        finishSpin(data);
      }

    }, i * 120); // 👈 speed control (60–120 feels good)
  });
}
// DECK OPEN AND INVENTORY OPEN/CLOSED SETTINGS
useEffect(() => {
  localStorage.setItem("deckMin", deckMin);
}, [deckMin]);

useEffect(() => {
  localStorage.setItem("inventoryMin", inventoryMin);
}, [inventoryMin]);

function rarityStyle(rarity) {
  switch (rarity) {
    case "common":
      return "border-zinc-500";
    case "rare":
      return "border-blue-400 shadow-blue-500/30";
    case "epic":
      return "border-purple-400 shadow-purple-500/40";
    case "legendary":
      return "border-yellow-400 shadow-yellow-500/40";
    default:
      return "border-zinc-500";
  }
}

  function symbolEmoji(symbol) {
    switch (symbol) {
      case "cherry": return "🍒";
      case "lemon": return "🍋";
      case "orange": return "🍊";
      case "grape": return "🍇";
      case "clover": return "🍀";
      case "gem": return "💎";
      case "star": return "⭐";
      case "crown": return "👑";
      default: return "❓";
    }
  }

  // LOAD UI STATE
        useEffect(() => {
          async function loadGame() {
            try {
              const res = await fetch(`${API}/game/state`, {
                credentials: "include"
              });

              const data = await res.json();

              console.log("🎮 STATE:", data);

              setBalance(data.balance || 0);
              setDeck(data.deck || []);
              setInventory(data.inventory || []); // ✅ HERE ONLY
              setEffects(data.effects || {});
              setXp(data.xp || 0);
              setLevel(data.newLevel || data.level || level);
              setPlayerBoost(data.payoutBoost || 1);
              setXpBoost(data.xpBoost || 1);
              setLoginStreak(data.loginStreak || 0);
              if (data.loginReward > 0) {
                setLoginPopup({
                  streak: data.loginStreak,
                  reward: data.loginReward
                });
              }
              
            } catch (err) {
              console.error("Failed to load state:", err);
            }
            
          }

          loadGame();
        }, []);

// SPIN
        let spinLock = false;
        async function spin() {
          if (spinLock) return; // 🔒 HARD LOCK
          spinLock = true;

          setSpinning(true);

          try {
            const res = await fetch(`${API}/game/spin`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                bet: 100 * multiplier,
                multiplier,
                
              })
            });

            const data = await res.json();

            if (data.error) {
              console.error(data.error);
              spinLock = false;
              setSpinning(false);
              return;
            }

            // ✅ ONLY THIS
            finishSpin(data);

          } catch (err) {
            console.error(err);
            spinLock = false;
            setSpinning(false);
          }
        }

  // AUTO SPIN
  useEffect(() => {
    if (!autoSpin) return;

    const interval = setInterval(() => {
      spin();
    }, 800);

    return () => clearInterval(interval);
  }, [autoSpin, multiplier]);

  // SET DECK 
   useEffect(() => {
      if (!deck || deck.length !== 3) return;

      // 🚫 prevent saving empty deck on load
      if (deck.every(c => c === null)) return;

      console.log("💾 SAVING DECK:", deck);

      fetch(`${API}/game/set-deck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newDeck: deck })
      });

    }, [deck]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white flex flex-col items-center p-6">
    
    
    <div className="w-full max-w-md flex justify-end mb-2">
      <button
        onClick={async () => {
          await fetch(`${API}/auth/logout`, {
            method: "POST",
            credentials: "include"
          });
          window.location.reload(); // or redirect to login
        }}
        className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg"
      >
        Logout
      </button>
    </div>
      {/* SLOT MACHINE */}
      <div className="bg-zinc-800 border border-zinc-700 p-6 rounded-2xl shadow-2xl w-full max-w-md">
      

        {/* BALANCE */}
        <div className="text-center text-xl font-bold mb-2">
          💰 ${balance.toLocaleString()}
        </div>
       {/* Login Streak UI */}
        <div className="text-xs text-blue-400 text-center mb-2">
          📅 Login Streak: {loginStreak}
        </div>

       {/* LEVEL + XP BAR */}
        <div className="text-center text-sm text-zinc-400 mb-1">
          Level {level}
        </div>

        <div className="w-full bg-zinc-700 h-3 rounded-full overflow-hidden mb-2">
          <div
            className="bg-green-500 h-full transition-all duration-500"
            style={{
              width: `${Math.min((xp / (level * 100)) * 100, 100)}%`
            }}
          />
        </div>

        <div className="text-center text-xs text-zinc-500 mb-3">
          {xp} / {level * 100} XP
        </div>


{/* 🎛️ STATS BAR */}
          <div className="bg-zinc-900/70 rounded-xl px-3 py-2 mb-3">

            <div className="flex justify-between items-center text-xs">

              {/* Deck Mult */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-zinc-500 text-[10px]">DECK</span>
                <span className="text-purple-400 font-bold">
                  x{(effects.payoutMult || 1).toFixed(2)}
                </span>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-zinc-700"></div>

              {/* Payout Boost */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-zinc-500 text-[10px]">BOOST</span>
                <span className="text-green-400 font-bold">
                  x{playerBoost.toFixed(2)}
                </span>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-zinc-700"></div>

              {/* XP Boost */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-zinc-500 text-[10px]">XP</span>
                <span className="text-blue-400 font-bold">
                  x{xpBoost.toFixed(2)}
                </span>
              </div>
              {/* Divider */}
              <div className="w-px h-6 bg-zinc-700"></div>
              {/* Luck */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-zinc-500 text-[10px]">Luck</span>
                <span className="text-blue-400 font-bold">
                  x{(effects?.luck ?? 1).toFixed(2)}
                </span>
              </div>
            </div>
          </div>





{/* ⚡ EFFECTS BAR (Deck + Event + Streak Combined) */}
        <div className="bg-zinc-900/70 rounded-xl px-3 py-2 mb-3">
          <div className="flex items-center text-xs text-center">

            {/* 🟣 SYNERGIES */}
            <div className="flex-1 text-purple-400 font-semibold truncate">
              {effects.synergies?.length > 0
                ? `🧩 ${effects.synergies.join(" • ")}`
                : "—"}
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-zinc-700" />

            {/* ⚡ EVENT */}
            <div className="flex-1 text-yellow-300 font-semibold truncate">
              {event
                ? <span className="animate-pulse">{event.label}</span>
                : <span className="text-zinc-500">No Event</span>
              }
            </div>

            {/* Divider */}
            <div className="w-px h-4 bg-zinc-700" />

            {/* 🔥 STREAK */}
            <div className="flex-1 text-orange-400 font-semibold truncate">
              🔥 {streak} (x{(1 + streak * 0.05).toFixed(2)})
            </div>

          </div>
        </div>


{/* 🎰 REELS */}
<div className="relative bg-gradient-to-b from-zinc-900 to-black rounded-3xl p-8 mb-5 border border-zinc-700 shadow-2xl">

  {/* stronger inner glow */}
  <div className="absolute inset-0 rounded-3xl pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]" />

  {/* outer glow on spin */}
  <div
    className={`absolute inset-0 rounded-3xl pointer-events-none transition-all duration-300
      ${spinning ? "shadow-[0_0_40px_rgba(34,197,94,0.25)]" : ""}
    `}
  />

  <div className="flex justify-center gap-5 relative z-10">
    {reels.length > 0 ? (
  reels.map((symbol, i) => {
    const isWinner = winningIndices.includes(i); // ✅ defined HERE

    return (
      <div
        key={i}
        className={`relative w-20 h-20 rounded-xl flex items-center justify-center text-4xl shadow-lg transition-all duration-200
          ${isWinner
            ? "bg-zinc-800 scale-110 shadow-[0_0_18px_rgba(250,204,21,0.6)]"
            : "bg-zinc-800"
          }
        `}
      >
        {/* ✨ winner ring */}
        {isWinner && (
          <div className="absolute inset-0 rounded-xl ring-2 ring-yellow-400 pointer-events-none" />
        )}

        {/* 💡 soft glow */}
        {isWinner && (
          <div className="absolute inset-0 rounded-xl bg-yellow-400/10 blur-md pointer-events-none" />
        )}
        
        {symbolEmoji(symbol)}
      </div>
          );
        })
      ) : (
        ["cherry","lemon","orange","grape","clover"].map((symbol, i) => (
        <div
          key={i}
          className="w-20 h-20 bg-zinc-800 rounded-xl flex items-center justify-center text-4xl opacity-40 animate-pulse"
        >
          {symbolEmoji(symbol)}
        </div>
      ))
      )}
</div></div>

{/* 💰 RESULT + 🎮 CONTROLS */}
<div className="flex flex-col items-center mb-5">

  {/* 💰 BIG RESULT BOX */}
  <div
    className={`w-full bg-zinc-900/90 rounded-3xl px-6 py-6 flex items-center justify-center transition-all duration-300
      ${payout > 0 ? "shadow-[0_0_35px_rgba(34,197,94,0.4)]" : ""}
    `}
  >
    <div
      className={`text-3xl font-extrabold tracking-wider transition-all duration-300
        ${payout > 0
          ? "text-green-400 scale-110 drop-shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-[pulse_0.25s_ease]"
          : "text-zinc-500"
        }
        ${payout > 1000 ? "text-yellow-300 scale-125" : ""}
        ${payout > 5000 ? "text-orange-400 scale-135" : ""}
      `}
    >
      {payout > 0 ? `+$${payout.toLocaleString()}` : "—"}
    </div>
  </div>

  {/* 🎮 CONTROLS UNDER */}
  <div className="flex gap-3 mt-3">

    {/* 🎰 SPIN */}
    <button
      onClick={spin}
      disabled={spinning || spinLock}
      className={`w-36 py-2 text-sm font-bold rounded-xl transition-all
        ${spinning
          ? "bg-zinc-600 cursor-not-allowed"
          : "bg-green-500 hover:bg-green-600 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
        }
      `}
    >
      {spinning ? "Spinning..." : `🎰 $${bet * multiplier}`}
    </button>

    {/* 🔁 AUTO */}
    <button
      onClick={() => setAutoSpin(!autoSpin)}
      className={`w-28 py-2 text-sm font-semibold rounded-xl transition
        ${autoSpin
          ? "bg-red-500 hover:bg-red-600"
          : "bg-blue-500 hover:bg-blue-600"
        }
      `}
    >
      {autoSpin ? "STOP" : "AUTO"}
    </button>

  </div>

</div>

{/* ⚡ MULTIPLIERS */}
<div className="flex gap-2 justify-center mt-3 w-full">
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
</div></div>


      
 {/* DECK */}
    <div className="w-full max-w-md mt-4">
      <button
        onClick={() => setDeckMin(!deckMin)}
        className="w-full bg-zinc-700 p-3 rounded-xl flex justify-between items-center"
      >
        <span>🎴 Deck</span>
        <span>{deckMin ? "➕" : "➖"}</span>
      </button>
                
      {!deckMin && (
        <div className="bg-zinc-800 p-4 mt-2 rounded-xl min-h-[120px]">
          <div className="flex gap-3 justify-center">
            {deck.map((card, i) => {
              const item = inventory.find((inv) => inv.id === card);

              return (
                <div
                  key={i}

                  draggable={!!card} // 👈 only draggable if card exists

                  onDragStart={(e) => {
                    validDropRef.current = false;
                    e.currentTarget.classList.add("opacity-50"); // 👁️ visual
                  }}

                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove("opacity-50"); // 👁️ restore

                    if (!validDropRef.current && card) {
                      // ❌ dropped nowhere → remove
                      setDeck(prev => {
                        const newDeck = [...prev];
                        newDeck[i] = null;
                        return newDeck;
                      });
                    }
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

                      const newCount = simulated.filter(c => c === cardId).length;

                      const invItem = inventory.find(it => it.id === cardId);
                      const maxAllowed = invItem?.count || 0;

                      if (newCount > maxAllowed) {
                        console.log(`❌ Only ${maxAllowed} allowed`);
                        return prev;
                      }

                      return simulated;
                    });
                  }}

                  onClick={() => {
                    setDeck((prev) => {
                      const newDeck = [...prev];
                      newDeck[i] = null;
                      return newDeck;
                    });
                  }}

                  className={`w-24 h-32 rounded-xl border-2 flex flex-col justify-between p-2 
                    cursor-pointer transition hover:scale-105
                    ${
                      card
                        ? rarityStyle(item?.rarity)
                        : "border-dashed border-zinc-600 bg-zinc-800"
                    }`}
                >
                  {card ? (
                    <>
                      <div className="text-[10px] text-zinc-400 uppercase">
                        {item?.rarity}
                      </div>

                      <div className="flex-1 flex items-center justify-center px-1">
                        <div className="text-xs text-center font-bold break-words line-clamp-2">
                          {card}
                        </div>
                      </div>

                      <div className="text-[10px] text-center text-zinc-500">
                        Slot {i + 1}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                      Drop Card
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

      {/* INVENTORY */}
   <div className="w-full max-w-md mt-3">
      <button
        onClick={() => setInventoryMin(!inventoryMin)}
        className="w-full bg-zinc-700 p-3 rounded-xl flex justify-between items-center"
      >
        <span>🧳 Inventory</span>
        <span>{inventoryMin ? "➕" : "➖"}</span>
      </button>

      {!inventoryMin && (
        <div className="bg-zinc-800 p-4 mt-2 rounded-xl min-h-[120px]">
          {inventory.length === 0 ? (
            <div className="text-zinc-500 text-center">No items</div>
          ) : (
            <div className="flex flex-wrap gap-3 justify-center">
              {inventory.map((item, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("card", JSON.stringify(item))
                  }
                  className={`w-20 h-24 rounded-xl border-2 bg-gradient-to-b 
                    from-zinc-800 to-zinc-900 flex flex-col justify-between p-2 
                    cursor-grab hover:scale-105 transition
                    ${rarityStyle(item.rarity)}`}
                >
                  <div className="text-[10px] text-zinc-400 uppercase">
                    {item.rarity}
                  </div>

                  <div className="text-[11px] text-center font-bold leading-tight break-words line-clamp-2">
                    {item.id}
                  </div>

                  <div className="text-[10px] text-right text-zinc-400">
                    x{item.count}
                  </div>
               </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {/*  CRATE RESULTS */}
      {crateResult && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-zinc-900 border border-purple-500 p-6 rounded-2xl text-center shadow-2xl">

                <div className="text-xl font-bold text-purple-400 mb-3">
                  🎁 Crate Rewards
                </div>

                <div className="space-y-1">
                  {crateResult.map((r, i) => (
                    <div key={i} className="text-green-400">
                      + {r.id} x{r.amount || 1}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setCrateResult(null)}
                  className="mt-4 bg-purple-500 px-4 py-1 rounded-lg"
                >
                  Nice
                </button>
              </div>
            </div>
          )}
 {/* 🎉 LEVEL UP POPUP */}
    {levelUp && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-yellow-500 p-6 rounded-2xl text-center shadow-2xl">
          
          <div className="text-2xl font-bold text-yellow-400 mb-2">
            🎉 LEVEL UP!
          </div>

          <div className="text-sm text-zinc-400 mb-3">
            Rewards Earned
          </div>

          {levelUp.rewards.map((r, i) => (
            <div key={i} className="text-green-400">
              Level {r.level} → +${r.amount}
            </div>
          ))}

          <div className="mt-3 text-yellow-300 font-bold">
            Total: +${levelUp.total}
          </div>

          <button
            onClick={() => setLevelUp(null)}
            className="mt-4 bg-yellow-500 text-black px-4 py-1 rounded-lg"
          >
            Nice
          </button>
        </div>
      </div>
    )}

    {/* 🔥 LOGIN POPUP */}
    {loginPopup && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-blue-500 p-6 rounded-2xl text-center shadow-2xl">

          <div className="text-xl font-bold text-blue-400 mb-2">
            🔥 Daily Login
          </div>

          <div className="text-zinc-400 mb-2">
            Day {loginPopup.streak}
          </div>

          <div className="text-green-400 font-bold">
            +${loginPopup.reward}
          </div>

          <button
            onClick={() => setLoginPopup(null)}
            className="mt-4 bg-blue-500 px-4 py-1 rounded-lg"
          >
            Collect
          </button>
        </div>
      </div>
    )}
    <button
  onClick={() => setStoreOpen(!storeOpen)}
  className="w-full max-w-md bg-zinc-700 p-3 rounded-xl flex justify-between items-center mt-4"
>
  <span>🛒 Store</span>
  <span>{storeOpen ? "➖" : "➕"}</span>
</button>

{storeOpen && (
  <div className="w-full max-w-md bg-zinc-800 p-4 mt-2 rounded-xl space-y-4">

    {/* 💰 UPGRADES */}
    <div>
      <div className="text-sm text-zinc-400 mb-2">Upgrades</div>

      <div className="flex gap-2">
        
        {/* ⚡ XP BOOST */}
        <button
          onClick={async () => {
            const res = await fetch(`${API}/game/upgrade/xp`, {
              method: "POST",
              credentials: "include"
            });

            const data = await res.json();

            if (data.error) {
              alert(data.error);
              return;
            }

            // ✅ update everything consistently
            setBalance(data.balance);
            setXpBoost(data.xpBoost);
            setToast("⚡ XP Boost upgraded!");

            setEffects(prev => ({
              ...prev,
              xpMult: data.xpBoost
            }));
          }}
          className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-lg py-2 text-sm font-bold"
        >
          ⚡ XP Boost ($1000)
        </button>

        {/* 💰 PAYOUT BOOST */}
        <button
          onClick={async () => {
            const res = await fetch(`${API}/game/upgrade/payout`, {
              method: "POST",
              credentials: "include"
            });

            const data = await res.json();

            if (data.error) {
              alert(data.error);
              return;
            }

            // ✅ update everything consistently
            setBalance(data.balance);
            setPlayerBoost(data.payoutBoost);
            setToast("💰 Payout Boost upgraded!");
            setEffects(prev => ({
              ...prev,
              payoutMult: data.payoutBoost
            }));
          }}
          className="flex-1 bg-green-500 hover:bg-green-600 rounded-lg py-2 text-sm font-bold"
        >
          💰 Payout Boost ($1000)
        </button>

      </div>
    </div>

    {/* 🎁 CRATES */}
    <div>
      <div className="text-sm text-zinc-400 mb-2">Crates</div>

      <div className="flex gap-2">
        {["basic", "premium", "elite"].map((type) => (
          <button
            key={type}
            onClick={async () => {
              const res = await fetch(`${API}/game/open-crate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ type })
              });

              const data = await res.json();

              if (data.error) {
                alert(data.error);
                return;
              } 

              if (data.balance) setBalance(data.balance);

                          if (data.rewards) {
                setCrateResult(data.rewards);
                console.log("🎁 Rewards:", data.rewards);              
                // 🔥 update inventory instantly
                setInventory(prev => {
                  const updated = [...prev];

                  data.rewards.forEach(r => {
                    const existing = updated.find(i => i.id === r.id);

                    if (existing) {
                      existing.count += r.amount || 1;
                    } else {
                      updated.push({
                        id: r.id,
                        count: r.amount || 1,
                        rarity: r.rarity || "common"
                      });
                    }
                  });

                  return updated;
                });
              }
            }}

            className={`flex-1 py-2 rounded-lg text-sm font-bold
              ${
                type === "basic"
                  ? "bg-zinc-600"
                  : type === "premium"
                  ? "bg-purple-600"
                  : "bg-yellow-500 text-black"
              }`}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>
    </div>

  </div>
)}

  </div>
  
  );
}