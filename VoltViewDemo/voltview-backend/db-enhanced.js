const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("./voltview.db");

db.serialize(() => {
  // ===== USERS TABLE =====
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT
    )`
  );

  // ===== READINGS TABLE =====
  db.run(
    `CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voltage REAL,
      current REAL,
      power REAL,
      energy REAL,
      frequency REAL,
      pf REAL,
      timestamp TEXT
    )`
  );

  // ===== ALERTS TABLE =====
  db.run(
    `CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      message TEXT,
      timestamp TEXT,
      resolved INTEGER DEFAULT 0
    )`
  );

  // ===== REPORTS TABLE =====
  db.run(
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      summary TEXT,
      report_type TEXT,
      status TEXT,
      file_path TEXT,
      created_at TEXT
    )`
  );

  // ===== MIGRATE EXISTING TABLE (Add new columns if they don't exist) =====
  db.run(`ALTER TABLE readings ADD COLUMN energy REAL`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding energy column:", err);
    }
  });

  db.run(`ALTER TABLE readings ADD COLUMN frequency REAL`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding frequency column:", err);
    }
  });

  db.run(`ALTER TABLE readings ADD COLUMN pf REAL`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding pf column:", err);
    }
  });

  // ===== DEMO USER CREATION =====
  const demoUsername = "demo";
  const demoPassword = "demo123";

  db.get(
    "SELECT id FROM users WHERE username = ?",
    [demoUsername],
    async (err, row) => {
      if (err) {
        console.error("Error checking demo user:", err);
        return;
      }
      if (!row) {
        try {
          const hash = await bcrypt.hash(demoPassword, 10);
          db.run(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [demoUsername, hash],
            (err2) => {
              if (err2) {
                console.error("Error inserting demo user:", err2);
              } else {
                console.log("Demo user created -> username: demo, password: demo123");
              }
            }
          );
        } catch (hashErr) {
          console.error("Error hashing password:", hashErr);
        }
      }
    }
  );
});

module.exports = db;
