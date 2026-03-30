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

  document.getElementById("result").innerText = JSON.stringify(data, null, 2);

  // ✅ ONLY update balance if it exists
  if (data.balance !== undefined) {
    document.getElementById("balance").innerText = data.balance;
  }

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
