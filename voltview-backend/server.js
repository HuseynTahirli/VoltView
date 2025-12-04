// server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
const PORT = 4000;

// ------------- MIDDLEWARE -------------
app.use(cors());
app.use(express.json());

// ------------- SIMULATED SMART METER DATA -------------
// We now store readings in the SQLite database instead of only in memory.

function generateReading() {
  const voltage = (Math.random() * (125 - 115) + 115).toFixed(2); // 115–125 V
  const current = (Math.random() * (20 - 10) + 10).toFixed(2);    // 10–20 A
  const power = ((voltage * current) / 1000).toFixed(2);          // kW
  const timestamp = new Date().toISOString();

  const reading = {
    voltage: Number(voltage),
    current: Number(current),
    power: Number(power),
    timestamp,
  };

  // Insert into SQLite
  db.run(
    "INSERT INTO readings (voltage, current, power, timestamp) VALUES (?, ?, ?, ?)",
    [reading.voltage, reading.current, reading.power, reading.timestamp],
    (err) => {
      if (err) {
        console.error("❌ Error inserting reading:", err.message);
      }
    }
  );
}

// Start generating fake data every 2 seconds
setInterval(generateReading, 2000);
generateReading();

// ------------- API ROUTES -------------

// Get latest reading (from DB)
app.get("/api/latest", (req, res) => {
  db.get(
    "SELECT voltage, current, power, timestamp FROM readings ORDER BY id DESC LIMIT 1",
    [],
    (err, row) => {
      if (err) {
        console.error("❌ DB error in /api/latest:", err.message);
        return res.status(500).json({ error: "Server error" });
      }
      if (!row) {
        return res.status(404).json({ error: "No data yet" });
      }
      res.json(row);
    }
  );
});

// Get history (last N readings from DB, default 100)
app.get("/api/history", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;

  db.all(
    "SELECT voltage, current, power, timestamp FROM readings ORDER BY id DESC LIMIT ?",
    [limit],
    (err, rows) => {
      if (err) {
        console.error("❌ DB error in /api/history:", err.message);
        return res.status(500).json({ error: "Server error" });
      }
      // rows are newest first; reverse to send oldest → newest
      res.json(rows.reverse());
    }
  );
});

// Get total energy usage for last 24 hours (kWh)
app.get("/api/usage-last-24h", (req, res) => {
  // ISO string for 24 hours ago
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  db.all(
    "SELECT power, timestamp FROM readings WHERE timestamp >= ? ORDER BY timestamp ASC",
    [since],
    (err, rows) => {
      if (err) {
        console.error("❌ DB error in /api/usage-last-24h:", err.message);
        return res.status(500).json({ error: "Server error" });
      }

      if (!rows || rows.length < 2) {
        // Not enough data to calculate usage
        return res.json({
          kWh: 0,
          avgPower: 0,
          numPoints: rows ? rows.length : 0,
        });
      }

      let totalEnergyKWh = 0;
      let totalDurationHours = 0;

      for (let i = 0; i < rows.length - 1; i++) {
        const p = Number(rows[i].power); // kW
        const t1 = new Date(rows[i].timestamp);
        const t2 = new Date(rows[i + 1].timestamp);

        const dtHours = (t2 - t1) / (1000 * 60 * 60); // ms → hours
        if (dtHours <= 0 || !isFinite(dtHours)) continue;

        totalDurationHours += dtHours;
        totalEnergyKWh += p * dtHours; // kW * hours = kWh
      }

      const avgPower =
        totalDurationHours > 0 ? totalEnergyKWh / totalDurationHours : 0;

      res.json({
        kWh: Number(totalEnergyKWh.toFixed(2)),
        avgPower: Number(avgPower.toFixed(2)),
        numPoints: rows.length,
      });
    }
  );
});

// ------------- LOGIN API -------------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ ok: false, message: "Missing credentials" });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        console.error("DB error:", err);
        return res
          .status(500)
          .json({ ok: false, message: "Server error" });
      }

      if (!user) {
        return res
          .status(401)
          .json({ ok: false, message: "Invalid username or password" });
      }

      try {
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          return res
            .status(401)
            .json({ ok: false, message: "Invalid username or password" });
        }

        // Success – for demo we just return ok + username
        res.json({ ok: true, username: user.username });
      } catch (compareErr) {
        console.error("bcrypt error:", compareErr);
        res
          .status(500)
          .json({ ok: false, message: "Server error" });
      }
    }
  );
});

// ------------- START SERVER -------------
app.listen(PORT, () => {
  console.log(`✅ VoltView backend running on http://localhost:${PORT}`);
});
