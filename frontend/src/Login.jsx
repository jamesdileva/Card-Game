import { useState } from "react";
// Same-origin API: the dev server proxies /api → localhost:3000 (see
// vite.config.js) and packaged/single-server builds serve API + renderer
// from one origin.
const API = "/api";
export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 🔥 IMPORTANT FOR SESSION
        body: JSON.stringify({
          username,
          password
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      // 🔍 DEBUG (same as your old version)
      console.log("🚨 LOGIN ROUTE WITH REWARD HIT");
      console.log("---- LOGIN DEBUG ----");
      console.log("response:", data);
      console.log("status:", data.status);
      console.log("reward:", data.loginReward);
      console.log("streak:", data.loginStreak);

      if (data.status === "logged_in" || data.success) {
        if (data.loginReward > 0) {
          alert(`🎁 Daily Reward: $${data.loginReward} (Streak: ${data.loginStreak})`);
        }

        console.log("✅ LOGIN SUCCESS", data);

        onLogin(); // 🔥 THIS replaces location.href
      } else {
        console.log("❌ LOGIN FAILED", data);
        // Surface the server's verdict ("Invalid login" vs "Invalid input"
        // vs "Server error") instead of a blanket message.
        alert(data.error || "Login failed");
      }

    } catch (err) {
      console.error("Login error:", err);
    }
  }

  async function handleRegister() {
    const res = await fetch(`${API}/auth/register` , {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password
      })
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    // Never claim success on a rejection ("User exists" / invalid input).
    if (!res.ok || data.error) {
      alert(data.error || `Registration failed (status ${res.status})`);
      return;
    }

    alert("Registered! Now login.");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white gap-3">
      <h1 className="text-2xl font-bold mb-2">Login</h1>

      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        className="bg-zinc-800 p-2 rounded-lg"
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="bg-zinc-800 p-2 rounded-lg"
      />

      <button
        onClick={handleLogin}
        className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-xl font-bold"
      >
        Login
      </button>

      <button
        onClick={handleRegister}
        className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-xl font-bold"
      >
        Register
      </button>

      <p className="text-xs text-zinc-500 mt-1">
        username 3–20 chars (letters, numbers, _) · password 4+ chars
      </p>
    </div>
  );
}