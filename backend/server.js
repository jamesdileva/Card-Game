require("dotenv").config();
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db");
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

// ✅ SESSION
app.use(session({
  store: new pgSession({
    pool,
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "none"
  }
}));

// ✅ ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/game", require("./routes/gameRoutes"));

// ✅ PORT FIX
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));