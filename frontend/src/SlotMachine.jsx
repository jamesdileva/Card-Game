import { useState, useEffect, useRef } from "react";
import useCountUp from "./hooks/useCountUp";
import HudBar from "./components/HudBar";
import Card from "./components/Card";
import DeckPanel from "./components/DeckPanel";
import InventoryPanel from "./components/InventoryPanel";
import StorePanel from "./components/StorePanel";
import CoinFlip from "./components/CoinFlip";

export default function SlotMachine() {
  const [balance, setBalance] = useState(0);
  const [payout, setPayout] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState("deck");
  const [activeGame, setActiveGame] = useState("slots");
  const [flipping, setFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState(null);
  const [event, setEvent] = useState(null);
  const [deck, setDeck] = useState([]);
  const [effects, setEffects] = useState({});
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [reels, setReels] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [levelUp, setLevelUp] = useState(null);
  const [loginPopup, setLoginPopup] = useState(null);
  const [playerBoost, setPlayerBoost] = useState(1);
  const [xpBoost, setXpBoost] = useState(1);
const [crateResult, setCrateResult] = useState(null);
const [crateOpening, setCrateOpening] = useState(false);
const [toast, setToast] = useState(null);
const [streak, setStreak] = useState(0);
const [loginStreak, setLoginStreak] = useState(0);
const [spinning, setSpinning] = useState(false);
const [winningIndices, setWinningIndices] = useState([]);
const [floatingWin, setFloatingWin] = useState(null);
const [sessionExpired, setSessionExpired] = useState(false);
  const bet = 100;
const audioCtxRef = useRef(null);
const spinLockRef = useRef(false);
const coinLockRef = useRef(false);
const autoSpinRef = useRef(autoSpin);
const spinFnRef = useRef(null);
const API = import.meta.env.VITE_API_URL + "api";
const displayBalance = useCountUp(balance);
const displayPayout = useCountUp(payout, 400);

async function authedFetch(url, options = {}) {
  const res = await fetch(url, { credentials: "include", ...options });
  if (res.status === 401) {
    setSessionExpired(true);
    return null;
  }
  return res;
}


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
    } catch {
      spinSoundRef.current = null;
      return;
    }

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
  const res = await authedFetch(`${API}/game/upgrade/xp`, {
    method: "POST"
  });

  if (!res) return;

  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  setBalance(data.balance);
  setXpBoost(data.xpBoost);
  setToast("⚡ XP Boost upgraded!");
}

async function upgradePayout() {
  const res = await authedFetch(`${API}/game/upgrade/payout`, {
    method: "POST"
  });

  if (!res) return;

  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  setBalance(data.balance);
  setPlayerBoost(data.payoutBoost);
  setToast("💰 Payout Boost upgraded!");
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
          if (data.payout > 0) {
            setFloatingWin({ amount: data.payout, id: Date.now() });
          }
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
    spinLockRef.current = false;
    if (autoSpinRef.current) {
      spinFnRef.current();
    }
  }, totalSpinTime + 100);
}


useEffect(() => {
  if (!toast) return;
  const t = setTimeout(() => setToast(null), 2500);
  return () => clearTimeout(t);
}, [toast]);

useEffect(() => {
  if (!floatingWin) return;
  const t = setTimeout(() => setFloatingWin(null), 1200);
  return () => clearTimeout(t);
}, [floatingWin]);

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
              const res = await authedFetch(`${API}/game/state`);

              if (!res) return;

              const data = await res.json();

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
        async function spin() {
          if (spinLockRef.current) return; // 🔒 HARD LOCK
          spinLockRef.current = true;

          setSpinning(true);

          try {
            const res = await authedFetch(`${API}/game/spin`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bet: 100 * multiplier,
                multiplier,

              })
            });

            if (!res) {
              spinLockRef.current = false;
              setSpinning(false);
              return;
            }

            const data = await res.json();

            if (data.error) {
              console.error(data.error);
              spinLockRef.current = false;
              setSpinning(false);
              return;
            }

            // ✅ ONLY THIS
            finishSpin(data);

          } catch (err) {
            console.error(err);
            spinLockRef.current = false;
            setSpinning(false);
          }
        }
        useEffect(() => {
          spinFnRef.current = spin;
        });

  // COIN FLIP
        async function playCoinflip(choice) {
          if (coinLockRef.current) return;
          coinLockRef.current = true;
          setFlipping(true);
          setCoinResult(null);

          try {
            const res = await authedFetch(`${API}/game/coinflip`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bet: 100 * multiplier, choice })
            });

            if (!res) {
              coinLockRef.current = false;
              setFlipping(false);
              return;
            }

            const data = await res.json();

            if (data.error) {
              setToast(data.error);
              coinLockRef.current = false;
              setFlipping(false);
              return;
            }

            // let the flip animation finish before revealing
            setTimeout(() => {
              coinLockRef.current = false;
              setFlipping(false);
              setCoinResult(data);
              setBalance(data.balance);
              setXp(data.xp || xp);
              setLevel(data.level || level);
              setStreak(data.streak || 0);

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
            }, 900);
          } catch (err) {
            console.error(err);
            coinLockRef.current = false;
            setFlipping(false);
          }
        }

        function switchGame(game) {
          if (game !== "slots" && autoSpin) {
            autoSpinRef.current = false;
            setAutoSpin(false);
          }
          setActiveGame(game);
        }

  // AUTO SPIN — chained: next spin fires when the previous one unlocks.
        useEffect(() => {
          autoSpinRef.current = autoSpin;
          if (autoSpin && !spinLockRef.current && !spinning) {
            const t = setTimeout(() => spinFnRef.current(), 0);
            return () => clearTimeout(t);
          }
        }, [autoSpin]);

  // SET DECK
    useEffect(() => {
      if (!deck || deck.length !== 3) return;

      // 🚫 prevent saving empty deck on load
      if (deck.every(c => c === null)) return;

      fetch(`${API}/game/set-deck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newDeck: deck })
      });

    }, [deck]);

  async function openCrate(type) {
    try {
      const res = await authedFetch(`${API}/game/open-crate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });

      if (!res) return;

      const data = await res.json();

      if (data.error) {
        setToast(data.error);
        return;
      }

      if (data.balance) setBalance(data.balance);

      if (data.rewards) {
        // 🎁 suspense beat: shake the crate, then reveal the cards
        setCrateOpening(true);
        setTimeout(() => {
          setCrateOpening(false);
          setCrateResult(data.rewards);

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
        }, 900);
      }
    } catch (err) {
      console.error("Failed to open crate:", err);
    }
  }

  async function logout() {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    window.location.reload();
  }

  const tabs = [
    { id: "deck", label: "🎴 Deck" },
    { id: "inventory", label: "🧳 Inventory" },
    { id: "store", label: "🛒 Store" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      <HudBar
        balance={displayBalance}
        xp={xp}
        level={level}
        loginStreak={loginStreak}
        onLogout={logout}
      />

    <div className="max-w-5xl mx-auto p-4 flex flex-col lg:flex-row gap-4 items-start">

      {/* 🎰 GAME COLUMN */}
      <main className="w-full max-w-md mx-auto lg:mx-0 shrink-0">

      {/* 🎮 GAME SWITCHER */}
      <div className="flex gap-2 mb-3">
        {[{ id: "slots", label: "🎰 Slots" }, { id: "coinflip", label: "🪙 Coin Flip" }].map((g) => (
          <button
            key={g.id}
            onClick={() => switchGame(g.id)}
            className={`flex-1 py-2 px-2 text-sm font-semibold rounded-xl transition
              ${activeGame === g.id
                ? "bg-zinc-700 text-white shadow-[0_0_10px_rgba(255,255,255,0.08)]"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }
            `}
          >
            {g.label}
          </button>
        ))}
      </div>

      {activeGame === "slots" && (
      <div className="bg-zinc-800 border border-zinc-700 p-6 rounded-2xl shadow-2xl w-full">

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
          ${spinning ? "blur-[2px] opacity-80 scale-95" : ""}
          ${!spinning && isWinner
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

  {/* 🎈 FLOATING WIN */}
  {floatingWin && (
    <div
      key={floatingWin.id}
      className="absolute inset-x-0 top-1/4 z-20 pointer-events-none flex justify-center"
    >
      <div
        className="text-5xl font-extrabold text-yellow-300 drop-shadow-[0_0_16px_rgba(250,204,21,0.9)]"
        style={{ animation: "floatUp 1.15s ease-out forwards" }}
      >
        +${floatingWin.amount.toLocaleString()}
      </div>
    </div>
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
      {displayPayout > 0 ? `+$${displayPayout.toLocaleString()}` : "—"}
    </div>
  </div>

  {/* 🎮 CONTROLS UNDER */}
  <div className="flex gap-3 mt-3">

    {/* 🎰 SPIN */}
    <button
      onClick={spin}
      disabled={spinning}
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
      )}

      {activeGame === "coinflip" && (
        <CoinFlip
          multiplier={multiplier}
          setMultiplier={setMultiplier}
          onFlip={playCoinflip}
          flipping={flipping}
          result={coinResult}
        />
      )}
      </main>

      {/* 🗂️ PANEL COLUMN */}
      <aside className="w-full flex-1 min-w-0">
        <div className="flex gap-2 mb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-2 text-sm font-semibold rounded-xl transition
                ${activeTab === tab.id
                  ? "bg-zinc-700 text-white shadow-[0_0_10px_rgba(255,255,255,0.08)]"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "deck" && (
          <DeckPanel
            deck={deck}
            inventory={inventory}
            setDeck={setDeck}
            setToast={setToast}
          />
        )}
        {activeTab === "inventory" && (
          <InventoryPanel inventory={inventory} />
        )}
        {activeTab === "store" && (
          <StorePanel
            onUpgradeXP={upgradeXP}
            onUpgradePayout={upgradePayout}
            onOpenCrate={openCrate}
          />
        )}
      </aside>

    </div>

    {/* 🎁 CRATE OPENING */}
    {crateOpening && (
      <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 p-4">
        <div
          className="text-8xl"
          style={{ animation: "crateShake 0.35s ease-in-out infinite" }}
        >
          🎁
        </div>
        <div className="text-zinc-400 mt-4 text-sm tracking-widest uppercase animate-pulse">
          Opening...
        </div>
      </div>
    )}

    {/*  CRATE RESULTS */}
      {crateResult && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 border border-purple-500 p-6 rounded-2xl text-center shadow-2xl w-full max-w-sm">

                <div className="text-xl font-bold text-purple-400 mb-3">
                  🎁 Crate Rewards
                </div>

                <div className="flex gap-3 justify-center mb-2">
                  {crateResult.map((r, i) => (
                    <div
                      key={i}
                      className="w-24 h-32"
                      style={{
                        animation: "popIn 0.4s ease-out both",
                        animationDelay: `${i * 140}ms`
                      }}
                    >
                      <Card id={r.id} rarity={r.rarity} count={r.amount || 1} />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setCrateResult(null)}
                  className="mt-3 bg-purple-500 px-6 py-1.5 rounded-lg font-semibold"
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
    {/* 🔒 SESSION EXPIRED */}
    {sessionExpired && (
      <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">🔒</div>
        <div className="text-xl font-bold">Session expired</div>
        <p className="text-zinc-400 text-sm max-w-xs">
          Your session ran out. Log back in to keep spinning.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-xl font-semibold"
        >
          Back to Login
        </button>
      </div>
    )}

    {/* 🔔 TOAST */}
    {toast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-600 text-sm text-white px-5 py-3 rounded-xl shadow-2xl z-50 animate-[pulse_0.3s_ease]">
        {toast}
      </div>
    )}

  </div>
  
  );
}