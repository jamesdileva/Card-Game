-- SQLite schema for Card-Game (migrated from the PostgreSQL dump of 2026-04-06).
-- Applied automatically by db.js on first open and by `npm run db:init`.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  balance INTEGER DEFAULT 1000,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  payout_boost REAL DEFAULT 1.0,
  xp_boost REAL DEFAULT 1.0,
  win_streak INTEGER DEFAULT 0,
  last_login TEXT,
  login_streak INTEGER DEFAULT 0,
  last_rewarded_level INTEGER DEFAULT 0,
  claimed_level_rewards TEXT DEFAULT '[]',
  inventory TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  card_id TEXT,
  rarity TEXT
);

CREATE TABLE IF NOT EXISTS deck (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  slot INTEGER,
  card_id TEXT,
  UNIQUE (user_id, slot)
);

CREATE TABLE IF NOT EXISTS session (
  sid TEXT PRIMARY KEY,
  sess TEXT,
  expire INTEGER
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);