const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Local-first storage: better-sqlite3 (replaces the pg Pool that pointed at a
// cloud DATABASE_URL). The file lives next to this module by default; set
// CARDGAME_DB_PATH to relocate it (the Electron app points it at the user's
// app-data dir, since the install location is read-only).
const dbPath = process.env.CARDGAME_DB_PATH || path.join(__dirname, "cardgame.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'").get()) {
  db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
}

// Lightweight migrations for databases created before a column existed.
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("users", "pending_crate", "TEXT DEFAULT NULL");
ensureColumn("inventory", "mutation", "REAL DEFAULT 1.0");
ensureColumn("inventory", "corrupted", "INTEGER DEFAULT 0");

module.exports = db;