const { Store } = require("express-session");

// Minimal SQLite-backed express-session store (replaces connect-pg-simple).
// Table: session(sid TEXT PRIMARY KEY, sess TEXT, expire INTEGER in ms).
class SqliteSessionStore extends Store {
  constructor(db) {
    super();
    this.db = db;
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS session (sid TEXT PRIMARY KEY, sess TEXT, expire INTEGER)"
    );
    this.db.exec("CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire)");
  }

  _expiry(sess) {
    if (sess && sess.cookie && sess.cookie.expires) {
      return new Date(sess.cookie.expires).getTime();
    }
    return Date.now() + 24 * 60 * 60 * 1000;
  }

  get(sid, cb) {
    try {
      const row = this.db.prepare("SELECT sess, expire FROM session WHERE sid = ?").get(sid);
      if (!row) return cb(null, null);
      if (row.expire < Date.now()) {
        this.destroy(sid, () => cb(null, null));
        return;
      }
      cb(null, JSON.parse(row.sess));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      this.db
        .prepare(
          "INSERT INTO session (sid, sess, expire) VALUES (?, ?, ?) " +
            "ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire"
        )
        .run(sid, JSON.stringify(sess), this._expiry(sess));
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.db.prepare("DELETE FROM session WHERE sid = ?").run(sid);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      this.db
        .prepare("UPDATE session SET sess = ?, expire = ? WHERE sid = ?")
        .run(JSON.stringify(sess), this._expiry(sess), sid);
      cb(null);
    } catch (err) {
      cb(err);
    }
  }
}

module.exports = SqliteSessionStore;