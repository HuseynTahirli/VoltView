const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const supabase = require("./supabaseClient");
const { sendAlertEmail } = require("./mailer");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// ── JWT Verification Middleware ──────────────────────────────────────
async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ ok: false, message: 'Unauthorized: Invalid or expired token' });
  }
  req.user = user;
  next();
}

// Serve reports directory specifically (for downloads)
app.use("/reports", express.static(path.join(__dirname, "reports")));


// ================== ESP32 DATA INGESTION ==================
app.post("/api/esp32", async (req, res) => {
  const { device_key, voltage, current, power, energy, frequency, pf } = req.body;

  if (voltage === undefined || current === undefined || power === undefined) {
    return res.status(400).json({
      ok: false,
      message: "Missing required fields: voltage, current, power"
    });
  }

  // Resolve device — fall back to legacy device if key not provided
  const resolvedKey = device_key || "esp32-legacy-default";
  const { data: device, error: deviceErr } = await supabase
    .from('devices')
    .select('id')
    .eq('device_key', resolvedKey)
    .single();

  if (deviceErr || !device) {
    console.warn(`⚠️  Unknown device_key: ${resolvedKey}`);
    return res.status(400).json({ ok: false, message: "Unknown device_key" });
  }

  const timestamp = new Date().toISOString();

  const { data: savedData, error } = await supabase
    .from('readings')
    .insert([{
      device_id: device.id,
      voltage,
      current,
      power,
      energy: energy || null,
      frequency: frequency || null,
      pf: pf || null,
      timestamp,
      reading_source: 'hardware',
    }])
    .select()
    .single();

  if (error) {
    console.error("Supabase Insert Error:", error);
    return res.status(500).json({ ok: false, message: "Database error" });
  }

  console.log("📥 PZEM Reading Saved:", savedData);

  checkThresholds({ voltage, current, power, frequency, pf });

  res.json({ ok: true, saved: savedData });
});

const alertCooldowns = {};
const COOLDOWN_TIME = 5 * 60 * 1000;

// Returns all users who have email alerts enabled, with their destination address.
async function getAlertEmailTargets() {
  const { data: users, error } = await supabase
    .from('users')
    .select('email, alert_email, email_alerts_enabled')
    .eq('email_alerts_enabled', true);
  if (error || !users) return [];
  return users.map(u => u.alert_email?.trim() || u.email?.trim()).filter(Boolean);
}

async function checkThresholds(reading) {
  const { data: thresholds, error } = await supabase.from('thresholds').select('*');
  if (error || !thresholds) return;

  for (const t of thresholds) {
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

        // Fetch all registered users so each gets their own alert row
        const { data: allUsers } = await supabase.from('users').select('id');
        const ts = new Date().toISOString();

        // One alert row per user (scoped); fall back to one unscoped row if no users yet
        const alertRows = (allUsers && allUsers.length > 0)
          ? allUsers.map(u => ({ type, message: msg, timestamp: ts, resolved: false, user_id: u.id }))
          : [{ type, message: msg, timestamp: ts, resolved: false }];

        const { error: alertErr } = await supabase.from('alerts').insert(alertRows);

        if (!alertErr) {
          alertCooldowns[t.key] = now;

          // Send email to every user who has alerts enabled
          const targets = await getAlertEmailTargets();
          for (const recipient of targets) {
            sendAlertEmail({ type, message: msg, timestamp: ts, enabled: true, recipient })
              .catch(err => console.error("Email send error:", err.message));
          }
        } else {
          console.error("Error creating alert in Supabase:", alertErr);
        }
      }
    }
  }
}

// ================== THRESHOLDS API ==================
app.get("/api/thresholds", verifyToken, async (req, res) => {
  const { data, error } = await supabase.from('thresholds').select('*');
  if (error) return res.status(500).json({ error: "Supabase error" });
  res.json(data || []);
});

app.post("/api/thresholds", verifyToken, async (req, res) => {
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

// ================== DEVICES API ==================
app.get("/api/devices", verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to fetch devices" });

  // Auto-create legacy device if this user has absolutely no devices
  if (!data || data.length === 0) {
    const { data: newDevice, error: createErr } = await supabase
      .from('devices')
      .insert([{
        user_id: req.user.id,
        device_name: 'Main Hardware',
        device_key: 'esp32-legacy-default',
        data_mode: 'device'
      }])
      .select()
      .single();
      
    if (!createErr && newDevice) {
      return res.json([newDevice]);
    }
  }

  res.json(data || []);
});

app.post("/api/devices", verifyToken, async (req, res) => {
  const { device_name, location } = req.body;

  if (!device_name || !device_name.trim()) {
    return res.status(400).json({ error: "device_name is required" });
  }

  const device_key = `voltview-${req.user.id.slice(0, 8)}-${Date.now()}`;

  const { data, error } = await supabase
    .from('devices')
    .insert([{
      user_id: req.user.id,
      device_name: device_name.trim(),
      location: location?.trim() || null,
      device_key,
    }])
    .select()
    .single();

  if (error) {
    console.error("Failed to create device:", error.message);
    return res.status(500).json({ error: "Failed to create device" });
  }

  res.json({ ok: true, device: data });
});

// ================== DEMO READING GENERATOR ==================
app.post("/api/demo/devices/:deviceId/reading", verifyToken, async (req, res) => {
  const { deviceId } = req.params;

  // Confirm device belongs to the requesting user
  const { data: device, error: deviceErr } = await supabase
    .from('devices')
    .select('id, device_name, device_key, user_id, data_mode')
    .eq('id', deviceId)
    .eq('user_id', req.user.id)
    .single();

  if (deviceErr || !device) {
    return res.status(404).json({ error: "Device not found or access denied" });
  }

  if (device.device_key === 'esp32-legacy-default') {
    return res.status(400).json({ error: "Demo readings are not allowed for the real ESP32 device" });
  }

  if (device.data_mode !== 'simulation') {
    return res.status(400).json({ error: "Demo readings are disabled while device is in Device Mode" });
  }

  // Helpers
  const rand = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(4));

  // Generate values based on device name
  let voltage, current, power, energy, frequency, pf;
  const name = device.device_name.toLowerCase();

  if (name.includes('refrigerator') || name.includes('fridge')) {
    voltage   = rand(119.5, 121.0);
    current   = rand(1.0,   1.9);
    power     = rand(120,   220);
    energy    = rand(0.010, 0.050);
    frequency = rand(59.95, 60.05);
    pf        = rand(0.9970, 0.9985);
  } else if (name.includes('tv') || name.includes('television')) {
    voltage   = rand(119.5, 121.0);
    current   = rand(0.5,   1.2);
    power     = rand(60,    150);
    energy    = rand(0.005, 0.030);
    frequency = rand(59.95, 60.05);
    pf        = rand(0.9450, 0.9530);
  } else if (name.includes('washing') || name.includes('washer')) {
    voltage   = rand(119.5, 121.0);
    current   = rand(3.0,   8.0);
    power     = rand(350,   950);
    energy    = rand(0.020, 0.120);
    frequency = rand(59.95, 60.05);
    pf        = rand(0.9840, 0.9880);
  } else {
    // Generic fallback for any other software device
    voltage   = rand(119.5, 121.0);
    current   = rand(0.5,   3.0);
    power     = rand(60,    360);
    energy    = rand(0.005, 0.050);
    frequency = rand(59.95, 60.05);
    pf        = rand(0.9500, 0.9900);
  }

  const timestamp = new Date().toISOString();

  const { data: savedData, error: insertErr } = await supabase
    .from('readings')
    .insert([{ device_id: device.id, voltage, current, power, energy, frequency, pf, timestamp, reading_source: 'simulation' }])
    .select()
    .single();

  if (insertErr) {
    console.error("Demo reading insert error:", insertErr.message);
    return res.status(500).json({ error: "Failed to insert demo reading" });
  }

  console.log(`🎭 Demo reading saved [${device.device_name}]: ${power.toFixed(1)}W`);
  res.json({ ok: true, reading: savedData });
});

// ================== OWNERSHIP HELPERS ==================
// Returns UUIDs of all devices owned by userId.
async function getOwnedDeviceIds(userId) {
  const { data, error } = await supabase
    .from('devices').select('id').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(d => d.id);
}

// Builds a scoped readings query restricted to devices the user owns.
// If device_id is in the request it is validated against ownership first.
// Optionally filters by reading_source ('simulation' | 'hardware') via query param.
// Returns { query, forbidden } where query is null when the user has no devices.
async function buildOwnedReadingsQuery(req, select = '*') {
  let base = supabase.from('readings').select(select);

  if (req.query.reading_source) {
    base = base.eq('reading_source', req.query.reading_source);
  }

  if (req.query.device_id) {
    const ownedIds = await getOwnedDeviceIds(req.user.id);
    if (!ownedIds.includes(req.query.device_id)) {
      return { query: null, forbidden: true };
    }
    return { query: base.eq('device_id', req.query.device_id), forbidden: false };
  }

  const ownedIds = await getOwnedDeviceIds(req.user.id);
  if (ownedIds.length === 0) return { query: null, forbidden: false };
  return { query: base.in('device_id', ownedIds), forbidden: false };
}

// ================== RETURN LATEST READING ==================
app.get("/api/latest", verifyToken, async (req, res) => {
  const { query, forbidden } = await buildOwnedReadingsQuery(req);
  if (forbidden) return res.status(403).json({ error: "Access denied" });
  if (!query)    return res.status(404).json({ error: "No data yet" });

  const { data, error } = await query.order('id', { ascending: false }).limit(1);
  if (error) return res.status(500).json({ error: "Supabase error" });
  if (!data || data.length === 0) return res.status(404).json({ error: "No data yet" });
  res.json(data[0]);
});

// ================== RETURN FULL HISTORY ==================
app.get("/api/history", verifyToken, async (req, res) => {
  const all = req.query.all === "true";

  const { query: baseQuery, forbidden } = await buildOwnedReadingsQuery(req);
  if (forbidden) return res.status(403).json({ error: "Access denied" });
  if (!baseQuery) return res.json([]);

  if (all) {
    const { data, error } = await baseQuery.order('id', { ascending: true });
    if (error) return res.status(500).json({ error: "Supabase error" });
    return res.json(data);
  }

  const maxLimit = 5000;
  let limit = parseInt(req.query.limit, 10) || 100;
  if (isNaN(limit) || limit <= 0) limit = 100;
  limit = Math.min(limit, maxLimit);
  let offset = parseInt(req.query.offset, 10) || 0;
  if (isNaN(offset) || offset < 0) offset = 0;

  const { data, error } = await baseQuery
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return res.status(500).json({ error: "Supabase error" });
  res.json(data.reverse());
});

// ================== EXPORT API ==================
app.get("/api/export", verifyToken, async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: "start and end query params are required (YYYY-MM-DD)" });
  }

  const startISO = new Date(`${start}T00:00:00.000Z`).toISOString();
  const endISO   = new Date(`${end}T23:59:59.999Z`).toISOString();

  if (isNaN(new Date(startISO).getTime()) || isNaN(new Date(endISO).getTime())) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }
  if (new Date(startISO) > new Date(endISO)) {
    return res.status(400).json({ error: "start must be before or equal to end" });
  }

  const { query: baseQuery, forbidden } = await buildOwnedReadingsQuery(
    req, 'id, timestamp, voltage, current, power, energy, frequency, pf, device_id'
  );
  if (forbidden) return res.status(403).json({ error: "Access denied" });
  if (!baseQuery) return res.json([]);

  const { data, error } = await baseQuery
    .gte('timestamp', startISO)
    .lte('timestamp', endISO)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error("Export query error:", error.message);
    return res.status(500).json({ error: "Database error" });
  }
  res.json(data || []);
});

app.get("/api/history/week", verifyToken, async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { query: baseQuery, forbidden } = await buildOwnedReadingsQuery(req);
  if (forbidden) return res.status(403).json({ error: "Access denied" });
  if (!baseQuery) return res.json([]);

  const { data, error } = await baseQuery
    .gte('timestamp', weekAgo)
    .order('timestamp', { ascending: true });
  if (error) return res.status(500).json({ error: "Supabase error" });
  res.json(data || []);
});

// ================== DELETE DEVICE ==================
app.delete("/api/devices/:deviceId", verifyToken, async (req, res) => {
  const { deviceId } = req.params;

  const { data: device, error: findErr } = await supabase
    .from('devices')
    .select('id, device_key')
    .eq('id', deviceId)
    .eq('user_id', req.user.id)
    .single();

  if (findErr || !device) {
    return res.status(404).json({ error: "Device not found or access denied" });
  }

  if (device.device_key === 'esp32-legacy-default') {
    return res.status(400).json({ error: "Cannot delete the real ESP32 device" });
  }

  // readings.device_id has ON DELETE CASCADE — deleting this device
  // will also delete all readings associated with it.
  const { error: deleteErr } = await supabase
    .from('devices').delete().eq('id', deviceId);

  if (deleteErr) {
    console.error("Failed to delete device:", deleteErr.message);
    return res.status(500).json({ error: "Failed to delete device" });
  }

  console.log(`🗑️  Device deleted: ${deviceId}`);
  res.json({ ok: true, message: "Device deleted" });
});

// ================== DEVICE MODE ==================
app.patch("/api/devices/:deviceId/mode", verifyToken, async (req, res) => {
  const { deviceId } = req.params;
  const { data_mode } = req.body;

  if (!['simulation', 'device'].includes(data_mode)) {
    return res.status(400).json({ error: "data_mode must be 'simulation' or 'device'" });
  }

  const { data: device, error: findErr } = await supabase
    .from('devices')
    .select('id, device_key')
    .eq('id', deviceId)
    .eq('user_id', req.user.id)
    .single();

  if (findErr || !device) {
    return res.status(404).json({ error: "Device not found or access denied" });
  }

  if (device.device_key === 'esp32-legacy-default') {
    return res.status(400).json({ error: "ESP32 Legacy must stay in Device Mode" });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('devices')
    .update({ data_mode })
    .eq('id', deviceId)
    .select()
    .single();

  if (updateErr) {
    console.error("Failed to update device mode:", updateErr.message);
    return res.status(500).json({ error: "Failed to update device mode" });
  }

  console.log(`⚙️  Device ${deviceId} mode → ${data_mode}`);
  res.json({ ok: true, device: updated });
});

// ================== ANALYTICS API ==================
app.get("/api/analytics", verifyToken, async (req, res) => {
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

  res.json({
    ok: true,
    username: data.user.email,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Missing credentials" });
  }

  // 1. Explicitly check if user already exists in Supabase Auth (using ADMIN privilege)
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (!listError) {
    const existing = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ ok: false, message: "Account already exists with this email. Please sign in." });
    }
  }

  // 2. Also check our public users table just in case the sync is broken
  const { data: existingPublic } = await supabase.from('users').select('id').eq('email', email).single();
  if (existingPublic) {
    return res.status(400).json({ ok: false, message: "Account already exists with this email. Please sign in." });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Supabase Signup Error:", error.message);
    return res.status(400).json({ ok: false, message: error.message });
  }

  // Supabase returns a user with empty identities array when email already exists
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return res.status(400).json({
      ok: false,
      message: "An account with this email already exists. Please sign in instead."
    });
  }

  if (data.user) {
    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        id: data.user.id,
        username: email,
        email: email
      }]);

    if (dbError && !dbError.message.includes('duplicate')) {
      console.error("❌ USER SYNC FAILED:", dbError.message);
    } else {
      console.log("✅ User metadata synced to public table.");
    }
  }

  res.json({
    ok: true,
    message: "Registration successful. Please check your email to confirm your account.",
    user: data.user
  });
});

// ================== ALERTS API ==================
// Get all alerts
app.get("/api/alerts", verifyToken, async (req, res) => {
  const includeResolved = req.query.resolved === "true";
  const { userEmail } = req.query;

  let query = supabase.from('alerts').select('*').order('id', { ascending: false });

  if (userEmail) {
    // Resolve email → UUID, then filter to that user's rows only
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userErr || !user) {
      // Unknown user — return empty list (never leak other users' alerts)
      return res.json([]);
    }
    query = query.eq('user_id', user.id);
  }

  if (!includeResolved) {
    query = query.eq('resolved', false);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: "Supabase error" });
  res.json(data || []);
});

// Create new alert
app.post("/api/alerts", verifyToken, async (req, res) => {
  const { type, userEmail } = req.body;
  // Strip all HTML tags from message before storing
  const message = typeof req.body.message === 'string'
    ? req.body.message.replace(/<[^>]*>/g, '').trim()
    : '';

  if (!type || !message) {
    return res.status(400).json({ error: "type and message are required" });
  }

  let user_id = null;
  if (userEmail) {
    const { data: user } = await supabase.from('users').select('id').eq('email', userEmail).single();
    user_id = user?.id || null;
  }

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from('alerts')
    .insert([{ type, message, timestamp, resolved: false, user_id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: "Supabase error" });

  const targets = await getAlertEmailTargets();
  for (const recipient of targets) {
    sendAlertEmail({ type, message, timestamp, enabled: true, recipient })
      .catch(err => console.error("Email send error:", err.message));
  }

  res.json({ ok: true, alert: data });
});

// Resolve an alert
app.put("/api/alerts/:id/resolve", verifyToken, async (req, res) => {
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
app.get("/api/settings/email", verifyToken, async (req, res) => {
  const { userEmail } = req.query;
  if (!userEmail) return res.json({ emailAlertsEnabled: false, alertEmail: '' });

  const { data, error } = await supabase
    .from('users')
    .select('alert_email, email_alerts_enabled')
    .eq('email', userEmail)
    .single();

  if (error || !data) return res.json({ emailAlertsEnabled: false, alertEmail: '' });
  res.json({
    emailAlertsEnabled: !!data.email_alerts_enabled,
    alertEmail: data.alert_email || '',
  });
});

app.post("/api/settings/email", verifyToken, async (req, res) => {
  const { emailAlertsEnabled, alertEmail, userEmail } = req.body;
  if (typeof emailAlertsEnabled === "undefined" || typeof alertEmail === "undefined" || !userEmail) {
    return res.status(400).json({ error: "userEmail, emailAlertsEnabled, and alertEmail are required" });
  }

  const { error } = await supabase
    .from('users')
    .update({
      alert_email: alertEmail.trim(),
      email_alerts_enabled: !!emailAlertsEnabled,
    })
    .eq('email', userEmail);

  if (error) {
    console.error("Error saving email settings to Supabase:", error.message);
    return res.status(500).json({ error: "Failed to save settings" });
  }

  console.log(`📧 Email settings saved for ${userEmail} — enabled: ${emailAlertsEnabled}, recipient: ${alertEmail.trim() || '(none)'}`);
  res.json({ ok: true });
});

// ================== REPORTS API ==================
// Get all reports
app.get("/api/reports", verifyToken, async (req, res) => {
  const { data, error } = await supabase.from('reports').select('*').order('date', { ascending: false });
  if (error) {
    console.error("❌ Supabase GET reports error:", error.message, error.details, error.hint);
    return res.status(500).json({ error: error.message || "Supabase error" });
  }
  res.json(data || []);
});

// Create new report
app.post("/api/reports", verifyToken, async (req, res) => {
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

const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir);
}

app.post("/api/reports/generate", verifyToken, async (req, res) => {
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

// ================== PASSWORD RESET API ==================
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, message: 'A valid email address is required.' });
  }

  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${siteUrl}/reset-password`,
  });

  // Always return success — never reveal whether the email exists (prevents enumeration)
  if (error) {
    console.error('Password reset request error:', error.message);
  } else {
    console.log(`🔑 Password reset email sent to: ${email}`);
  }
  res.json({ ok: true });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { access_token, password } = req.body;
  if (!access_token || !password) {
    return res.status(400).json({ ok: false, message: 'Token and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ ok: false, message: 'Password must be at least 8 characters.' });
  }

  // Verify the recovery token and identify the user
  const { data: { user }, error: verifyErr } = await supabase.auth.getUser(access_token);
  if (verifyErr || !user) {
    return res.status(401).json({ ok: false, message: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  // Update the password using admin privileges (bypasses RLS/auth flow)
  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (updateErr) {
    console.error('Password update error:', updateErr.message);
    return res.status(500).json({ ok: false, message: 'Failed to update password. Please try again.' });
  }

  console.log(`✅ Password updated successfully for: ${user.email}`);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`🔥 VoltView backend running at http://localhost:${PORT}`);
});
