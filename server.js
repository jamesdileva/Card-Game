require("dotenv").config(); // ✅ FIRST LINE
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db");
const path = require("path");
const cors = require("cors");
const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// SESSION STORE
// ✅ 3. SESSION (your existing code — KEEP THIS)
app.use(session({
  store: new pgSession({
    pool,
    createTableIfMissing: true
  }),
  secret: "secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    sameSite: "lax" // 👈 ADD THIS (important for cookies)
  }
}));

// STATIC
app.use(express.static(path.join(__dirname, "public")));

// ROUTES (FIXED PATHS)
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/game", require("./src/routes/gameRoutes"));

app.listen(3000, () => console.log("Server running on 3000"));