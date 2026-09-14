require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const db = require("./db");
const SqliteSessionStore = require("./sessionStore");
const cors = require("cors");

// Local-only app (the old Vercel/Render deploy is retired). One server hosts
// the API and — when a frontend build exists — the static renderer, so the
// Electron app and single-server mode need no second process.
function startServer({ port = process.env.PORT || 3000, serveDir = null } = {}) {
  const app = express();

  app.set("trust proxy", 1);

  app.use(cors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    credentials: true
  }));

  app.use(express.json());

  // Health check (the Electron host polls this to wait for boot).
  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use(session({
    store: new SqliteSessionStore(db),
    // Packaged builds exclude backend/.env, so a fallback is required.
    secret: process.env.SESSION_SECRET || "cardgame-local-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,      // local-only over http
      sameSite: "lax"     // same-origin renderer + API
    }
  }));

  // ROUTES
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/game", require("./routes/gameRoutes"));

  // Static renderer (Electron / single-server mode). Registered after the API
  // so /api/* is never shadowed; non-GET and /api paths fall through.
  if (serveDir && fs.existsSync(serveDir)) {
    app.use(express.static(serveDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) return next();
      res.sendFile(path.join(serveDir, "index.html"));
    });
  } else {
    // Backend-only dev/test route (kept for tooling that pings /).
    app.get("/", (req, res) => {
      res.send("Backend is running ✅");
    });
  }

  // GLOBAL ERROR HANDLER — always answer JSON so the frontend never has
  // to parse an HTML error page (Express 5 forwards async throws here).
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(`💥 ${req.method} ${req.path}:`, err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: "Server error" });
  });

  const server = app.listen(port, () => console.log(`Server running on ${port}`));
  return server;
}

if (require.main === module) {
  // Standalone boot: serve ../frontend/dist when it exists (single-server
  // mode), otherwise API only.
  const distDir = path.join(__dirname, "..", "frontend", "dist");
  startServer({ serveDir: fs.existsSync(distDir) ? distDir : null });
}

module.exports = { startServer };
