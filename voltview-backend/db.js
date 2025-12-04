// db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Use the DB file in the parent VoltViewDemo folder
const dbPath = path.join(__dirname, "..", "voltview.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to connect to SQLite:", err.message);
  } else {
    console.log("✅ Connected to SQLite database:", dbPath);
  }
});

// Ensure tables exist
db.serialize(() => {
  // Users table (login)
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       username TEXT UNIQUE NOT NULL,
       password_hash TEXT NOT NULL
     );`
  );

  // Readings table (usage data)
  db.run(
    `CREATE TABLE IF NOT EXISTS readings (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       voltage REAL NOT NULL,
       current REAL NOT NULL,
       power REAL NOT NULL,
       timestamp TEXT NOT NULL
     );`,
    (err) => {
      if (err) {
        console.error("❌ Error ensuring readings table:", err.message);
      } else {
        console.log("✅ readings table is ready");
      }
    }
  );
});

module.exports = db;
