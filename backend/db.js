const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Local-first storage: better-sqlite3 (replaces the pg Pool that pointed at a
// cloud DATABASE_URL). The file lives next to this module; schema.sql is
// applied on first open so a fresh clone works without a manual init step.
const db = new Database(path.join(__dirname, "cardgame.db"));
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