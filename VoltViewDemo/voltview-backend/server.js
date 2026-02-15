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
  const { voltage, current, power, energy, frequency, pf } = req.body;

  // Validate required fields
  if (voltage === undefined || current === undefined || power === undefined) {
    return res.status(400).json({
      ok: false,
      message: "Missing required fields: voltage, current, power"
    });
  }

  const timestamp = new Date().toISOString();

  // Insert all PZEM data into SQLite DB
  db.run(
    `INSERT INTO readings (voltage, current, power, energy, frequency, pf, timestamp) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [voltage, current, power, energy || null, frequency || null, pf || null, timestamp],
    function (err) {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ ok: false, message: "Database error" });
      }

      console.log("📥 PZEM Reading Saved:", {
        id: this.lastID,
        voltage,
        current,
        power,
        energy,
        frequency,
        pf,
        timestamp,
      });

      // --- NEW: Threshold Monitoring Logic ---
      checkThresholds({ voltage, current, power, frequency, pf });

      res.json({
        ok: true,
        saved: {
          id: this.lastID,
          voltage,
          current,
          power,
          energy,
          frequency,
          pf,
          timestamp
        },
      });
    }
  );
});

// Cache for threshold cooldowns to prevent spamming
const alertCooldowns = {};
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes

async function checkThresholds(reading) {
  db.all("SELECT * FROM thresholds", [], (err, thresholds) => {
    if (err || !thresholds) return;

    thresholds.forEach(t => {
      let triggered = false;
      let msg = "";
      let type = "warning";

      if (t.key === 'power_max' && reading.power > t.value) {
        triggered = true;
        msg = `High Power Draw: ${reading.power.toFixed(1)}W exceeds limit of ${t.value}W`;
        type = "critical";
      } else if (t.key === 'voltage_max' && reading.voltage > t.value) {
        triggered = true;
        msg = `Overvoltage Detected: ${reading.voltage.toFixed(1)}V exceeds limit of ${t.value}V`;
        type = "critical";
      } else if (t.key === 'voltage_min' && reading.voltage < t.value && reading.voltage > 50) { // Ignore zero/low voltage (outage)
        triggered = true;
        msg = `Undervoltage Detected: ${reading.voltage.toFixed(1)}V is below limit of ${t.value}V`;
        type = "warning";
      } else if (t.key === 'current_max' && reading.current > t.value) {
        triggered = true;
        msg = `Overcurrent Detected: ${reading.current.toFixed(2)}A exceeds limit of ${t.value}A`;
        type = "critical";
      }

      if (triggered) {
        const lastAlertTime = alertCooldowns[t.key] || 0;
        const now = Date.now();

        if (now - lastAlertTime > COOLDOWN_TIME) {
          console.log(`🚨 THRESHOLD TRIGGERED: ${msg}`);
          const alertTimestamp = new Date().toISOString();
          db.run(
            "INSERT INTO alerts (type, message, timestamp, resolved) VALUES (?, ?, ?, 0)",
            [type, msg, alertTimestamp]
          );
          alertCooldowns[t.key] = now;
        }
      }
    });
  });
}

// ================== THRESHOLDS API ==================
app.get("/api/thresholds", (req, res) => {
  db.all("SELECT * FROM thresholds", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows || []);
  });
});

app.post("/api/thresholds", (req, res) => {
  const { thresholds } = req.body; // Expecting array of {key, value}

  if (!thresholds || !Array.isArray(thresholds)) {
    return res.status(400).json({ error: "Thresholds array required" });
  }

  let completed = 0;
  thresholds.forEach(t => {
    db.run("UPDATE thresholds SET value = ? WHERE key = ?", [t.value, t.key], (err) => {
      completed++;
      if (completed === thresholds.length) {
        res.json({ ok: true, message: "Thresholds updated" });
      }
    });
  });
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


// ================== ALERTS API ==================
// Get all alerts
app.get("/api/alerts", (req, res) => {
  const includeResolved = req.query.resolved === "true";

  let query = "SELECT * FROM alerts ORDER BY id DESC";
  if (!includeResolved) {
    query = "SELECT * FROM alerts WHERE resolved = 0 ORDER BY id DESC";
  }

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows || []);
  });
});

// Create new alert
app.post("/api/alerts", (req, res) => {
  const { type, message } = req.body;

  if (!type || !message) {
    return res.status(400).json({ error: "type and message are required" });
  }

  const timestamp = new Date().toISOString();

  db.run(
    "INSERT INTO alerts (type, message, timestamp, resolved) VALUES (?, ?, ?, 0)",
    [type, message, timestamp],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });

      res.json({
        ok: true,
        alert: {
          id: this.lastID,
          type,
          message,
          timestamp,
          resolved: 0
        }
      });
    }
  );
});

// Resolve an alert
app.put("/api/alerts/:id/resolve", (req, res) => {
  const alertId = req.params.id;

  db.run(
    "UPDATE alerts SET resolved = 1 WHERE id = ?",
    [alertId],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });

      if (this.changes === 0) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json({ ok: true, message: "Alert resolved" });
    }
  );
});

// ================== REPORTS API ==================
// Get all reports
app.get("/api/reports", (req, res) => {
  db.all(
    "SELECT * FROM reports ORDER BY date DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json(rows || []);
    }
  );
});

// Create new report
app.post("/api/reports", (req, res) => {
  const { date, summary, report_type, status, file_path } = req.body;

  if (!date || !summary || !report_type) {
    return res.status(400).json({ error: "date, summary, and report_type are required" });
  }

  const created_at = new Date().toISOString();

  db.run(
    "INSERT INTO reports (date, summary, report_type, status, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [date, summary, report_type, status || "Generated", file_path || null, created_at],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });

      res.json({
        ok: true,
        report: {
          id: this.lastID,
          date,
          summary,
          report_type,
          status,
          file_path,
          created_at
        }
      });
    }
  );
});
// ================== CSV REPORT GENERATION ==================
const fs = require('fs');
const path = require('path');

// Ensure reports directory exists
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir);
}

// Serve reports directory
app.use('/reports', express.static(reportsDir));

app.post("/api/reports/generate", (req, res) => {
  const now = new Date();
  const timestamp = now.toISOString(); // Keep ISO for log/internal use
  const dateStr = now.toLocaleDateString('en-CA'); // Local YYYY-MM-DD
  const filename = `report-${Date.now()}.csv`;
  const filePath = path.join(reportsDir, filename);
  const publicPath = `/reports/${filename}`;

  // Fetch all readings for the report
  db.all("SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1000", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "DB error fetch readings" });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "No data available to generate report" });
    }

    // Calculate Summary Stats
    let totalPower = 0;
    let totalVoltage = 0;
    let maxPower = 0;
    const count = rows.length;

    rows.forEach(r => {
      totalPower += (r.power || 0);
      totalVoltage += (r.voltage || 0);
      if ((r.power || 0) > maxPower) maxPower = r.power;
    });

    // Use local date from latest row, or current local date if no rows
    // Force en-CA to get YYYY-MM-DD format
    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/New_York' };
    const latestRowDate = rows[0].timestamp ? new Date(rows[0].timestamp) : now;

    // Format to YYYY-MM-DD
    const parts = latestRowDate.toLocaleDateString('en-CA', dateOptions).split('-');
    const dateStrForReport = `${parts[0]}-${parts[1]}-${parts[2]}`;

    const avgPower = (totalPower / count).toFixed(2);
    const avgVoltage = (totalVoltage / count).toFixed(2);

    // Create CSV Content
    let csvContent = `Report Generated: ${timestamp}\n`;
    csvContent += `Summary: ${count} Readings analyzed. Avg Power: ${avgPower}W, Peak Power: ${maxPower}W, Avg Voltage: ${avgVoltage}V\n\n`;
    csvContent += `Timestamp,Voltage (V),Current (A),Power (W),Energy (kWh),Frequency (Hz),PF\n`;

    rows.forEach(r => {
      csvContent += `${r.timestamp},${r.voltage},${r.current},${r.power},${r.energy || 0},${r.frequency || 0},${r.pf || 0}\n`;
    });

    // Write to file
    fs.writeFile(filePath, csvContent, (err) => {
      if (err) {
        console.error("Error writing report:", err);
        return res.status(500).json({ error: "File write error" });
      }

      // Save to Database
      const summary = `Avg Pwr: ${avgPower}W | Peak: ${maxPower}W | ${count} records`;

      db.run(
        "INSERT INTO reports (date, summary, report_type, status, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [dateStrForReport, summary, "System CSV", "Completed", publicPath, timestamp],
        function (err) {
          if (err) return res.status(500).json({ error: "DB Insert error" });

          res.json({
            ok: true,
            message: "Report generated successfully",
            report: {
              id: this.lastID,
              date: dateStrForReport,
              summary,
              report_type: "System CSV",
              status: "Completed",
              file_path: publicPath
            }
          });
        }
      );
    });
  });
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🔥 VoltView backend running at http://localhost:${PORT}`);
});
