-- =============================================================
-- VoltView Demo Seed: multi-device sample data
-- OPTIONAL — run only for presentation / demo purposes.
-- Safe: inserts only, skips on conflict.
-- Requires 004_multi_device_support.sql to be run first.
-- Replace 'your-user-uuid-here' with a real UUID from your
-- Supabase Auth → Users dashboard before running.
-- =============================================================

-- ─────────────────────────────────────────────
-- HOW TO GET YOUR USER UUID:
-- Supabase Dashboard → Authentication → Users
-- Copy the UUID of the account you want to own the demo devices.
-- Paste it in place of 'your-user-uuid-here' in all 3 inserts below.
-- ─────────────────────────────────────────────

-- 1. Insert demo devices
INSERT INTO devices (user_id, device_name, device_key, location)
VALUES
  ('your-user-uuid-here', 'Lab ESP32',   'esp32-lab-01',  'Laboratory'),
  ('your-user-uuid-here', 'Room ESP32',  'esp32-room-01', 'Living Room'),
  ('your-user-uuid-here', 'Demo ESP32',  'esp32-demo-01', 'Demo Station')
ON CONFLICT (device_key) DO NOTHING;


-- 2. Insert a few sample readings for each demo device.
--    Columns match the existing readings table exactly:
--    voltage, current, power, energy, frequency, pf, timestamp
--    device_id is resolved by sub-select so no UUID copy-paste needed.

INSERT INTO readings (voltage, current, power, energy, frequency, pf, timestamp, device_id)
SELECT
  r.voltage, r.current, r.power, r.energy, r.frequency, r.pf,
  r.timestamp, d.id
FROM (VALUES
  -- Lab ESP32 readings
  (230.450, 2.1500, 495.200, 0.13751, 50.020, 0.9980, NOW() - INTERVAL '10 minutes', 'esp32-lab-01'),
  (231.200, 2.2000, 508.600, 0.14125, 50.010, 0.9975, NOW() - INTERVAL '5 minutes',  'esp32-lab-01'),
  (229.870, 2.0800, 478.500, 0.13292, 49.990, 0.9982, NOW() - INTERVAL '1 minute',   'esp32-lab-01'),

  -- Room ESP32 readings
  (228.100, 1.5200, 346.700, 0.09630, 50.030, 0.9970, NOW() - INTERVAL '12 minutes', 'esp32-room-01'),
  (229.500, 1.5500, 355.500, 0.09875, 50.010, 0.9968, NOW() - INTERVAL '6 minutes',  'esp32-room-01'),
  (230.000, 1.4900, 342.700, 0.09519, 50.020, 0.9971, NOW() - INTERVAL '2 minutes',  'esp32-room-01'),

  -- Demo ESP32 readings
  (232.100, 3.0100, 698.200, 0.19394, 50.000, 0.9990, NOW() - INTERVAL '15 minutes', 'esp32-demo-01'),
  (231.800, 2.9800, 690.800, 0.19189, 49.980, 0.9988, NOW() - INTERVAL '8 minutes',  'esp32-demo-01'),
  (232.500, 3.0500, 709.100, 0.19697, 50.010, 0.9991, NOW() - INTERVAL '3 minutes',  'esp32-demo-01')
) AS r (voltage, current, power, energy, frequency, pf, timestamp, device_key)
JOIN devices d ON d.device_key = r.device_key;
