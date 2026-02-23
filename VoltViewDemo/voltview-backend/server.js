const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const supabase = require("./supabaseClient");
const { sendAlertEmail } = require("./mailer");

const app = express();
const PORT = 4000;

// ── Email / notification settings persisted to settings.json ──────
const SETTINGS_FILE = path.join(__dirname, "settings.json");

function loadEmailSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Error loading settings.json:", e.message);
  }
  return { emailAlertsEnabled: false, alertEmail: "" };
}

function saveEmailSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    console.error("Error saving settings.json:", e.message);
    return false;
  }
}

app.use(cors());
app.use(express.json());

// Serve static frontend files (unified port 4000 deployment)
const frontendPath = path.join(__dirname, "../voltview-frontend");
app.use(express.static(frontendPath));

// Serve reports directory specifically (for downloads)
app.use("/reports", express.static(path.join(__dirname, "reports")));

// Explicitly serve index.html for the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Fallback for other dashboard routes (if using HTML5 history or for safety)
app.get(["/dashboard", "/analytics", "/devices", "/alerts", "/settings"], (req, res) => {
  const page = req.path.substring(1);
  res.sendFile(path.join(frontendPath, `${page}.html`));
});

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

  // Insert all PZEM data into Supabase
  supabase
    .from('readings')
    .insert([{
      voltage,
      current,
      power,
      energy: energy || null,
      frequency: frequency || null,
      pf: pf || null,
      timestamp
    }])
    .select()
    .single()
    .then(({ data: savedData, error }) => {
      if (error) {
        console.error("Supabase Insert Error:", error);
        return res.status(500).json({ ok: false, message: "Database error" });
      }

      console.log("📥 PZEM Reading Saved:", savedData);

      // --- NEW: Threshold Monitoring Logic ---
      checkThresholds({ voltage, current, power, frequency, pf });

      res.json({
        ok: true,
        saved: savedData,
      });
    });
});

// Cache for threshold cooldowns to prevent spamming
const alertCooldowns = {};
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes

async function checkThresholds(reading) {
  const { data: thresholds, error } = await supabase.from('thresholds').select('*');
  if (error || !thresholds) return;

  thresholds.forEach(async (t) => {
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
    } else if (t.key === 'voltage_min' && reading.voltage < t.value && reading.voltage > 50) {
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
        const { error: alertErr } = await supabase
          .from('alerts')
          .insert([{ type, message: msg, timestamp: new Date().toISOString(), resolved: false }]);

        if (!alertErr) {
          alertCooldowns[t.key] = now;
          // Send email notification for threshold breach
          const { emailAlertsEnabled, alertEmail } = loadEmailSettings();
          sendAlertEmail({ type, message: msg, timestamp: new Date().toISOString(), enabled: emailAlertsEnabled, recipient: alertEmail })
            .catch(err => console.error("Email send error:", err.message));
        } else {
          console.error("Error creating alert in Supabase:", alertErr);
        }
      }
    }
  });
}

// ================== THRESHOLDS API ==================
app.get("/api/thresholds", async (req, res) => {
  const { data, error } = await supabase.from('thresholds').select('*');
  if (error) return res.status(500).json({ error: "Supabase error" });
  res.json(data || []);
});

app.post("/api/thresholds", async (req, res) => {
  const { thresholds } = req.body;
  if (!thresholds || !Array.isArray(thresholds)) {
    return res.status(400).json({ error: "Thresholds array required" });
  }

  try {
    const promises = thresholds.map(t =>
      supabase.from('thresholds').update({ value: t.value }).eq('key', t.key)
    );
    await Promise.all(promises);
    res.json({ ok: true, message: "Thresholds updated" });
  } catch (err) {
    res.status(500).json({ error: "Supabase error" });
  }
});

// ================== RETURN LATEST READING ==================
app.get("/api/latest", async (req, res) => {
  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .order('id', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error: "Supabase error" });
  if (!data || data.length === 0) return res.status(404).json({ error: "No data yet" });
  res.json(data[0]);
});

// ================== RETURN FULL HISTORY ==================
app.get("/api/history", async (req, res) => {
  const all = req.query.all === "true";
  if (all) {
    const { data, error } = await supabase.from('readings').select('*').order('id', { ascending: true });
    if (error) return res.status(500).json({ error: "Supabase error" });
    return res.json(data);
  }

  const maxLimit = 5000;
  let limit = parseInt(req.query.limit, 10) || 100;
  if (isNaN(limit) || limit <= 0) limit = 100;
  limit = Math.min(limit, maxLimit);
  let offset = parseInt(req.query.offset, 10) || 0;
  if (isNaN(offset) || offset < 0) offset = 0;

  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: "Supabase error" });
  res.json(data.reverse());
});

// ================== ANALYTICS API ==================
app.get("/api/analytics", async (req, res) => {
  const { data: readings, error } = await supabase
    .from('readings')
    .select('*')
    .order('timestamp', { ascending: true });

  if (error) return res.status(500).json({ error: "Supabase error" });

  const grouped = {};
  readings.forEach(r => {
    const date = r.timestamp.slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(r);
  });
  res.json({ grouped });
});

// ================== LOGIN API ==================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Missing credentials" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase Auth Error:", error.message);
    return res.status(401).json({ ok: false, message: error.message });
  }

  // Sync to public 'users' table on login (handles older users)
  if (data.user) {
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: data.user.id,
        username: data.user.email,
        email: data.user.email
      });

    if (dbError) {
      console.warn("User metadata sync failed during login:", dbError.message);
    } else {
      console.log("✅ User metadata synced on login.");
    }
  }

  res.json({ ok: true, username: data.user.email });
});

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Missing credentials" });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Supabase Signup Error:", error.message);
    return res.status(400).json({ ok: false, message: error.message });
  }

  // Sync to public 'users' table
  if (data.user) {
    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        id: data.user.id,
        username: email,
        email: email
      }]);

    if (dbError) {
      console.error("❌ USER SYNC FAILED:", dbError.message);
      console.log("Tip: Run the 'Recreate Users Table' SQL in Supabase editor.");
    } else {
      console.log("✅ User metadata synced to public table.");
    }
  }

  res.json({
    ok: true,
    message: "Registration successful. Please check your email for confirmation.",
    user: data.user
  });
});


// ================== ALERTS API ==================
// Get all alerts
app.get("/api/alerts", async (req, res) => {
  const includeResolved = req.query.resolved === "true";
  let query = supabase.from('alerts').select('*').order('id', { ascending: false });

  if (!includeResolved) {
    query = query.eq('resolved', false);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: "Supabase error" });
  res.json(data || []);
});

// Create new alert
app.post("/api/alerts", async (req, res) => {
  const { type, message } = req.body;
  if (!type || !message) {
    return res.status(400).json({ error: "type and message are required" });
  }

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from('alerts')
    .insert([{ type, message, timestamp, resolved: false }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Supabase error" });

  // Send email notification (non-blocking — don't fail the request if email errors)
  const { emailAlertsEnabled, alertEmail } = loadEmailSettings();
  sendAlertEmail({ type, message, timestamp, enabled: emailAlertsEnabled, recipient: alertEmail })
    .catch(err => console.error("Email send error:", err.message));

  res.json({ ok: true, alert: data });
});

// Resolve an alert
app.put("/api/alerts/:id/resolve", async (req, res) => {
  const alertId = req.params.id;
  const { data, error } = await supabase
    .from('alerts')
    .update({ resolved: true })
    .eq('id', alertId)
    .select();

  if (error) return res.status(500).json({ error: "Supabase error" });
  if (!data || data.length === 0) return res.status(404).json({ error: "Alert not found" });

  res.json({ ok: true, message: "Alert resolved" });
});

// ================== EMAIL SETTINGS API ==================
app.get("/api/settings/email", (req, res) => {
  res.json(loadEmailSettings());
});

app.post("/api/settings/email", (req, res) => {
  const { emailAlertsEnabled, alertEmail } = req.body;
  if (typeof emailAlertsEnabled === "undefined" || typeof alertEmail === "undefined") {
    return res.status(400).json({ error: "emailAlertsEnabled and alertEmail are required" });
  }
  const current = loadEmailSettings();
  const updated = { ...current, emailAlertsEnabled: !!emailAlertsEnabled, alertEmail: alertEmail.trim() };
  if (saveEmailSettings(updated)) {
    console.log(`📧 Email settings updated — enabled: ${updated.emailAlertsEnabled}, recipient: ${updated.alertEmail}`);
    res.json({ ok: true, settings: updated });
  } else {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ================== REPORTS API ==================
// Get all reports
app.get("/api/reports", async (req, res) => {
  const { data, error } = await supabase.from('reports').select('*').order('date', { ascending: false });
  if (error) {
    console.error("❌ Supabase GET reports error:", error.message, error.details, error.hint);
    return res.status(500).json({ error: error.message || "Supabase error" });
  }
  res.json(data || []);
});

// Create new report
app.post("/api/reports", async (req, res) => {
  const { date, summary, report_type, status, file_path } = req.body;
  if (!date || !summary || !report_type) {
    return res.status(400).json({ error: "date, summary, and report_type are required" });
  }

  const { data, error } = await supabase
    .from('reports')
    .insert([{ date, summary, report_type, status: status || "Generated", file_path: file_path || null, created_at: new Date().toISOString() }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Supabase error" });
  res.json({ ok: true, report: data });
});
// Ensure reports directory exists
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir);
}

app.post("/api/reports/generate", async (req, res) => {
  const now = new Date();
  const timestamp = now.toISOString();
  const filename = `report-${Date.now()}.csv`;
  const filePath = path.join(reportsDir, filename);
  const publicPath = `/reports/${filename}`;

  const { data: rows, error: fetchErr } = await supabase
    .from('readings')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1000);

  if (fetchErr) {
    console.error("❌ Supabase fetch readings error:", fetchErr.message, fetchErr.details, fetchErr.hint);
    return res.status(500).json({ error: fetchErr.message || "Supabase fetch error" });
  }
  if (!rows || rows.length === 0) return res.status(400).json({ error: "No data available" });

  let totalPower = 0;
  let totalVoltage = 0;
  let maxPower = 0;
  const count = rows.length;

  rows.forEach(r => {
    totalPower += (r.power || 0);
    totalVoltage += (r.voltage || 0);
    if ((r.power || 0) > maxPower) maxPower = r.power;
  });

  const latestRowDate = rows[0].timestamp ? new Date(rows[0].timestamp) : now;
  const parts = latestRowDate.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/New_York' }).split('-');
  const dateStrForReport = `${parts[0]}-${parts[1]}-${parts[2]}`;

  const avgPower = (totalPower / count).toFixed(2);
  const avgVoltage = (totalVoltage / count).toFixed(2);

  let csvContent = `Report Generated: ${timestamp}\n`;
  csvContent += `Summary: ${count} Readings analyzed. Avg Power: ${avgPower}W, Peak Power: ${maxPower}W, Avg Voltage: ${avgVoltage}V\n\n`;
  csvContent += `Timestamp,Voltage (V),Current (A),Power (W),Energy (kWh),Frequency (Hz),PF\n`;

  rows.forEach(r => {
    csvContent += `${r.timestamp},${r.voltage},${r.current},${r.power},${r.energy || 0},${r.frequency || 0},${r.pf || 0}\n`;
  });

  fs.writeFile(filePath, csvContent, async (err) => {
    if (err) return res.status(500).json({ error: "File write error" });

    const summary = `Avg Pwr: ${avgPower}W | Peak: ${maxPower}W | ${count} records`;
    const { data: reportData, error: reportErr } = await supabase
      .from('reports')
      .insert([{ date: dateStrForReport, summary, report_type: "Generated", status: "Generated", file_path: publicPath }])
      .select()
      .single();

    if (reportErr) {
      console.error("❌ Supabase insert error:", reportErr.message, reportErr.details, reportErr.hint);
      return res.status(500).json({ error: reportErr.message || "Supabase insert error" });
    }

    res.json({
      ok: true,
      message: "Report generated successfully",
      report: reportData
    });
  });
});

// ================== START SERVER ==================
app.listen(PORT, () => {
  console.log(`🔥 VoltView backend running at http://localhost:${PORT}`);
});
