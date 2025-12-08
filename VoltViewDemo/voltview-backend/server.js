// (analytics route moved below app initialization)
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// ================== ESP32 DATA INGESTION ==================
app.post("/api/esp32", (req, res) => {
  const { current } = req.body;

  if (current === undefined) {
    return res.status(400).json({ ok: false, message: "Missing current value" });
  }

  // Generate voltage & power server-side
  const voltage = (Math.random() * (125 - 115) + 115).toFixed(2);
  const power = ((voltage * current) / 1000).toFixed(2);
  const timestamp = new Date().toISOString();

  // Insert into SQLite DB
  db.run(
    `INSERT INTO readings (voltage, current, power, timestamp) VALUES (?, ?, ?, ?)`,
    [voltage, current, power, timestamp],
    function (err) {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ ok: false, message: "Database error" });
      }

      console.log("📥 ESP32 Reading Saved:", {
        id: this.lastID,
        voltage,
        current,
        power,
        timestamp,
      });

      res.json({
        ok: true,
        saved: { id: this.lastID, voltage, current, power, timestamp },
      });
    }
  );
});

// ================== RETURN LATEST READING ==================
app.get("/api/latest", (req, res) => {
  db.get(
    `SELECT * FROM readings ORDER BY id DESC LIMIT 1`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: "DB error" });
      if (!row) return res.status(404).json({ error: "No data yet" });
      res.json(row);
    }
  );
});

// ================== RETURN FULL HISTORY ==================
app.get("/api/history", (req, res) => {
  // Support query params: ?limit=NUM, ?offset=NUM and ?all=true to return full history
  const all = req.query.all === "true";
  if (all) {
    db.all(`SELECT * FROM readings ORDER BY id ASC`, [], (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error" });
      return res.json(rows);
    });
    return;
  }

  const maxLimit = 5000;
  let limit = parseInt(req.query.limit, 10) || 100;
  if (isNaN(limit) || limit <= 0) limit = 100;
  limit = Math.min(limit, maxLimit);
  let offset = parseInt(req.query.offset, 10) || 0;
  if (isNaN(offset) || offset < 0) offset = 0;

  db.all(
    `SELECT * FROM readings ORDER BY id DESC LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json(rows.reverse()); // oldest → newest
    }
  );
});

// ================== LOGIN API ==================
// ================== ANALYTICS API ==================
app.get("/api/analytics", (req, res) => {
  db.all(
    `SELECT * FROM readings ORDER BY timestamp ASC`,
    [],
    (err, readings) => {
      if (err) return res.status(500).json({ error: "DB error" });
      // Group readings by date
      const grouped = {};
      readings.forEach(r => {
        const date = r.timestamp.slice(0, 10); // YYYY-MM-DD
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(r);
      });
      res.json({ grouped });
    }
  );
});
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "Missing credentials" });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).json({ ok: false, message: "Server error" });
      }

      if (!user) {
        return res
          .status(401)
          .json({ ok: false, message: "Invalid username or password" });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res
          .status(401)
          .json({ ok: false, message: "Invalid username or password" });
      }

      res.json({ ok: true, username: user.username });
    }
  );
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🔥 VoltView backend running at http://localhost:${PORT}`);
});
