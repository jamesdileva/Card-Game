// Electron host for Card Game (local-only, portable win-unpacked build).
//
// Packaged: runs the Express backend in-process (no child processes, so
// nothing can orphan on exit) and serves the bundled renderer over
// http://localhost:<port> — never file://, so no CORS/cookie/router issues.
//
// Dev (!app.isPackaged): spawns ../backend/server.js as a child *plain-node*
// process (native modules keep their Node ABI there) and loads either
// CARDGAME_RENDERER_URL (Vite dev server) or the backend itself.
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const { app, BrowserWindow, dialog } = require("electron");

const PORT = Number(process.env.CARDGAME_PORT || 3000);
const LOG_FILE = path.join(os.tmpdir(), "cardgame-electron.log");
let backendChild = null;
let mainWindow = null;

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    // logging must never crash startup
  }
  console.log(...args);
}

// Packaged backend errors (e.g. Express 500s) would otherwise vanish with
// the detached console — mirror them into the log file.
const origConsoleError = console.error.bind(console);
console.error = (...args) => {
  try {
    fs.appendFileSync(
      LOG_FILE,
      `[${new Date().toISOString()}] [backend-error] ` +
        args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(" ") +
        "\n"
    );
  } catch {
    // logging must never crash startup
  }
  origConsoleError(...args);
};

async function waitForHealth(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
    title: "Card Game",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.loadURL(url);
  mainWindow.webContents.on("did-finish-load", () => log("renderer finished loading", url));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  log("renderer loaded", url);
}

async function startBackendPackaged() {
  // Install dir (app.asar) is read-only → writable DB under userData.
  // Never derive this from __dirname (inside app.asar when packaged).
  const userData = app.getPath("userData");
  fs.mkdirSync(userData, { recursive: true });
  process.env.CARDGAME_DB_PATH = path.join(userData, "cardgame.db");
  // Bundled copies: backend code inside asar, renderer in extraResources
  // (unpacked — express.static over http needs real files, not asar).
  const backendDir = path.join(__dirname, "backend");
  const serveDir = path.join(process.resourcesPath, "frontend-dist");
  log("starting backend in-process", `db=${process.env.CARDGAME_DB_PATH}`);
  const { startServer } = require(path.join(backendDir, "server.js"));
  return new Promise((resolve, reject) => {
    const server = startServer({ port: PORT, serveDir });
    server.on("listening", () => {
      log("backend listening", `port=${PORT}`);
      resolve(server);
    });
    server.on("error", reject);
  });
}

async function startBackendDev() {
  // Dev: plain-node child so better-sqlite3 uses its Node ABI.
  // (Under Electron, process.execPath is the Electron binary, not node.)
  const serverJs = path.join(__dirname, "..", "backend", "server.js");
  log("spawning dev backend", serverJs);
  backendChild = spawn("node", [serverJs], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "inherit",
  });
  backendChild.on("exit", (code) => log("dev backend exited", `code=${code}`));
  const ok = await waitForHealth(`http://localhost:${PORT}/api/health`);
  if (!ok) throw new Error("dev backend never became healthy");
}

function failStartup(err) {
  const msg = String((err && err.message) || err);
  log("startup failed", msg);
  if (msg.includes("EADDRINUSE")) {
    dialog.showErrorBox(
      "Card Game",
      `Port ${PORT} is already in use. Close the other Card Game window and try again.`
    );
  } else {
    dialog.showErrorBox("Card Game", `Failed to start:\n${msg}\n\nDetails: ${LOG_FILE}`);
  }
  app.quit();
}

// Double-clicking the exe twice focuses the first window instead of
// fighting over the backend port.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      let url;
      if (app.isPackaged) {
        await startBackendPackaged();
        url = `http://localhost:${PORT}/`;
      } else {
        await startBackendDev();
        url = process.env.CARDGAME_RENDERER_URL || `http://localhost:${PORT}/`;
      }
      createWindow(url);
    } catch (err) {
      failStartup(err);
    }
  });
}

app.on("window-all-closed", () => {
  if (backendChild) backendChild.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(`http://localhost:${PORT}/`);
  }
});
