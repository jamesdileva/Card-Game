require("dotenv").config();
const express = require("express");
const session = require("express-session");
const db = require("./db");
const SqliteSessionStore = require("./sessionStore");
const cors = require("cors");

const app = express();

app.set("trust proxy", 1); // ✅ REQUIRED FOR RENDER

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://card-game-phi-topaz.vercel.app"
  ],
  credentials: true
}));

app.use(express.json());

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

const isProd = process.env.NODE_ENV === "production";

app.use(session({
  store: new SqliteSessionStore(db),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,                         // ✅ HTTPS only in prod
    sameSite: isProd ? "none" : "lax"       // ✅ FIX HERE
  }
}));

// ✅ ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/game", require("./routes/gameRoutes"));

// ✅ GLOBAL ERROR HANDLER — always answer JSON so the frontend never has
// to parse an HTML error page (Express 5 forwards async throws here).
app.use((err, req, res, next) => {
  console.error(`💥 ${req.method} ${req.path}:`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Server error" });
});

// ✅ PORT FIX
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));