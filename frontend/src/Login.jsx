import { useState } from "react";
const API = import.meta.env.VITE_API_URL + "api";
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

      const data = await res.json();

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
        alert("Login failed");
      }

    } catch (err) {
      console.error("Login error:", err);
    }
  }

  async function handleRegister() {
    await fetch(`${API}/auth/register` , {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password
      })
    });

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
    </div>
  );
}