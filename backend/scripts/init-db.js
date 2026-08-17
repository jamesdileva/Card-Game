// One-time setup: creates backend/cardgame.db with schema + seed data.
// Run via `npm run db:init` from backend/. Safe to re-run (INSERT OR IGNORE).
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "cardgame.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8"));
db.exec(fs.readFileSync(path.join(__dirname, "..", "seed.sql"), "utf8"));
const users = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
const cards = db.prepare("SELECT COUNT(*) AS n FROM inventory").get().n;
const deck = db.prepare("SELECT COUNT(*) AS n FROM deck").get().n;
console.log(`cardgame.db ready: ${users} users, ${cards} inventory, ${deck} deck rows`);
db.close();