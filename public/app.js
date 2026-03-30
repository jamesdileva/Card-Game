const API = "/api/game";

// SPIN
async function spin() {
  const res = await fetch(`${API}/spin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ bet: 100 })
  });

  const data = await res.json();

  if (data.error) {
    document.getElementById("result").innerText = data.error;
    return;
  }

const symbols = {
  cherry: "🍒",
  lemon: "🍋",
  orange: "🍊",
  grape: "🍇",
  bar: "🔲",
  seven: "7️⃣",
  diamond: "💎",   // ✅ ADD THIS
  star: "⭐"       // ✅ ADD THIS
};
  const getSymbol = (s) => symbols[s] || "❓";
  // 🎰 Update slot display
  document.getElementById("slot").innerText =
  `${getSymbol(data.reels[0])}   ${getSymbol(data.reels[1])}   ${getSymbol(data.reels[2])}`;
  console.log(data.reels);
  // 💰 Balance
  document.getElementById("balance").innerText = data.balance;

  // 📄 Result
  document.getElementById("result").innerText = `Payout: ${data.payout}`;

  update();
}
// LOAD GAME
async function loadGame() {
  const res = await fetch("/api/game/state");
  const data = await res.json();

  document.getElementById("balance").innerText = data.balance;
  document.getElementById("inventory").innerText =
    JSON.stringify(data.inventory, null, 2);
  document.getElementById("deck").innerText =
    JSON.stringify(data.deck, null, 2);
}
loadGame(); //

// CRATE
async function openCrate(type) {
  const res = await fetch(`${API}/open-crate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ type })
  });

  const data = await res.json();

  if (data.balance !== undefined) {
    document.getElementById("balance").innerText = data.balance;
}

  update();
}

async function setDeck() {
  const c1 = document.getElementById("card1").value;
  const c2 = document.getElementById("card2").value;
  const c3 = document.getElementById("card3").value;

  const res = await fetch(`${API}/set-deck`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      newDeck: [c1, c2, c3]
    })
  });

  const data = await res.json();

  document.getElementById("result").innerText = JSON.stringify(data, null, 2);

  update();
}

// UPDATE UI
async function update() {
  const inv = await fetch(`${API}/inventory`).then(r => r.json());
  const deck = await fetch(`${API}/deck`).then(r => r.json());

  document.getElementById("inventory").innerText = JSON.stringify(inv, null, 2);
  document.getElementById("deck").innerText = JSON.stringify(deck, null, 2);
}

// INIT
//update();
