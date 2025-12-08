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

  // ===== NEW: READINGS TABLE =====
  db.run(
    `CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voltage REAL,
      current REAL,
      power REAL,
      timestamp TEXT
    )`
  );

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
