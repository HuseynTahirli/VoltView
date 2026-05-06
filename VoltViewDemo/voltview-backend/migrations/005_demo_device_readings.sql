-- =============================================================
-- VoltView Demo Seed: Readings for Refrigerator, TV, Washing Machine
-- Run in Supabase Dashboard → SQL Editor
-- Safe: INSERT only. Never touches ESP32 (Legacy) data.
-- =============================================================

DO $$
DECLARE
  v_fridge_id  UUID;
  v_tv_id      UUID;
  v_washer_id  UUID;
  v_missing    TEXT := '';
BEGIN

  -- ── Resolve device IDs by name ────────────────────────────
  SELECT id INTO v_fridge_id FROM devices WHERE device_name = 'Refrigerator' LIMIT 1;
  SELECT id INTO v_tv_id     FROM devices WHERE device_name = 'TV'           LIMIT 1;
  SELECT id INTO v_washer_id FROM devices WHERE device_name = 'Washing Machine' LIMIT 1;

  -- ── Safety check: abort if any device is missing ──────────
  IF v_fridge_id IS NULL THEN v_missing := v_missing || '  • Refrigerator' || chr(10); END IF;
  IF v_tv_id     IS NULL THEN v_missing := v_missing || '  • TV'           || chr(10); END IF;
  IF v_washer_id IS NULL THEN v_missing := v_missing || '  • Washing Machine' || chr(10); END IF;

  IF v_missing <> '' THEN
    RAISE EXCEPTION
      E'Aborting — the following devices were not found in the devices table:\n%'
      'Create them from the dashboard first, then re-run this script.',
      v_missing;
  END IF;

  RAISE NOTICE 'Devices resolved — Refrigerator: %, TV: %, Washing Machine: %',
    v_fridge_id, v_tv_id, v_washer_id;

  -- ============================================================
  -- REFRIGERATOR  (steady low draw, ~120–220 W)
  -- ============================================================
  INSERT INTO readings (device_id, voltage, current, power, energy, frequency, pf, timestamp) VALUES

  -- 7 days ago
  (v_fridge_id, 119.850, 1.4200, 169.800, 0.00472, 60.010, 0.9980, NOW() - INTERVAL '7 days' + INTERVAL '2 hours'),
  (v_fridge_id, 120.100, 1.5100, 181.200, 0.00503, 60.020, 0.9975, NOW() - INTERVAL '7 days' + INTERVAL '8 hours'),
  (v_fridge_id, 119.970, 1.3800, 165.600, 0.00460, 59.990, 0.9982, NOW() - INTERVAL '7 days' + INTERVAL '14 hours'),

  -- 5 days ago
  (v_fridge_id, 120.450, 1.6000, 192.700, 0.00535, 60.000, 0.9978, NOW() - INTERVAL '5 days' + INTERVAL '3 hours'),
  (v_fridge_id, 119.800, 1.4500, 173.700, 0.00482, 60.010, 0.9977, NOW() - INTERVAL '5 days' + INTERVAL '9 hours'),
  (v_fridge_id, 120.200, 1.5500, 186.300, 0.00518, 60.020, 0.9976, NOW() - INTERVAL '5 days' + INTERVAL '16 hours'),

  -- 3 days ago
  (v_fridge_id, 120.300, 1.7200, 206.900, 0.00575, 60.010, 0.9979, NOW() - INTERVAL '3 days' + INTERVAL '1 hour'),
  (v_fridge_id, 119.750, 1.3500, 161.700, 0.00449, 59.980, 0.9983, NOW() - INTERVAL '3 days' + INTERVAL '7 hours'),
  (v_fridge_id, 120.100, 1.8000, 216.200, 0.00600, 60.000, 0.9974, NOW() - INTERVAL '3 days' + INTERVAL '13 hours'),

  -- Yesterday
  (v_fridge_id, 120.050, 1.5800, 189.700, 0.00527, 60.010, 0.9977, NOW() - INTERVAL '1 day'  + INTERVAL '4 hours'),
  (v_fridge_id, 119.900, 1.4100, 168.900, 0.00469, 60.000, 0.9980, NOW() - INTERVAL '1 day'  + INTERVAL '10 hours'),
  (v_fridge_id, 120.200, 1.6500, 198.300, 0.00551, 60.020, 0.9976, NOW() - INTERVAL '1 day'  + INTERVAL '18 hours'),

  -- Today
  (v_fridge_id, 120.100, 1.5200, 182.500, 0.00507, 60.010, 0.9978, NOW() - INTERVAL '3 hours'),
  (v_fridge_id, 119.950, 1.4800, 177.400, 0.00493, 59.990, 0.9979, NOW() - INTERVAL '1 hour');


  -- ============================================================
  -- TV  (light draw, ~60–150 W)
  -- ============================================================
  INSERT INTO readings (device_id, voltage, current, power, energy, frequency, pf, timestamp) VALUES

  -- 7 days ago
  (v_tv_id, 120.100, 0.6200,  74.500, 0.00207, 60.010, 0.9500, NOW() - INTERVAL '7 days' + INTERVAL '19 hours'),
  (v_tv_id, 119.950, 0.8500, 101.900, 0.00283, 60.000, 0.9520, NOW() - INTERVAL '7 days' + INTERVAL '21 hours'),

  -- 6 days ago
  (v_tv_id, 120.200, 1.1000, 132.200, 0.00367, 60.020, 0.9480, NOW() - INTERVAL '6 days' + INTERVAL '18 hours'),
  (v_tv_id, 120.050, 0.9800, 117.700, 0.00327, 60.010, 0.9490, NOW() - INTERVAL '6 days' + INTERVAL '20 hours'),
  (v_tv_id, 119.900, 0.7500,  89.900, 0.00250, 59.990, 0.9510, NOW() - INTERVAL '6 days' + INTERVAL '22 hours'),

  -- 4 days ago
  (v_tv_id, 120.150, 0.5800,  69.700, 0.00194, 60.010, 0.9530, NOW() - INTERVAL '4 days' + INTERVAL '20 hours'),
  (v_tv_id, 120.000, 1.1500, 138.000, 0.00383, 60.000, 0.9470, NOW() - INTERVAL '4 days' + INTERVAL '21 hours'),

  -- 2 days ago
  (v_tv_id, 120.200, 0.8800, 105.800, 0.00294, 60.020, 0.9500, NOW() - INTERVAL '2 days' + INTERVAL '19 hours'),
  (v_tv_id, 119.850, 0.6500,  77.900, 0.00216, 59.980, 0.9520, NOW() - INTERVAL '2 days' + INTERVAL '22 hours'),

  -- Yesterday
  (v_tv_id, 120.100, 1.2000, 144.100, 0.00400, 60.010, 0.9460, NOW() - INTERVAL '1 day'  + INTERVAL '19 hours'),
  (v_tv_id, 120.050, 0.9200, 110.400, 0.00307, 60.000, 0.9490, NOW() - INTERVAL '1 day'  + INTERVAL '21 hours'),

  -- Today
  (v_tv_id, 120.200, 0.7800,  93.800, 0.00261, 60.020, 0.9510, NOW() - INTERVAL '2 hours'),
  (v_tv_id, 119.950, 1.0500, 125.900, 0.00350, 59.990, 0.9480, NOW() - INTERVAL '30 minutes');


  -- ============================================================
  -- WASHING MACHINE  (high variable draw, 350–900 W)
  -- ============================================================
  INSERT INTO readings (device_id, voltage, current, power, energy, frequency, pf, timestamp) VALUES

  -- 6 days ago (wash cycle)
  (v_washer_id, 120.100, 3.2000, 384.300, 0.01068, 60.010, 0.9850, NOW() - INTERVAL '6 days' + INTERVAL '9 hours'),
  (v_washer_id, 119.950, 7.4500, 893.300, 0.02481, 59.990, 0.9870, NOW() - INTERVAL '6 days' + INTERVAL '9 hours' + INTERVAL '15 minutes'),
  (v_washer_id, 120.200, 6.9000, 829.400, 0.02304, 60.020, 0.9860, NOW() - INTERVAL '6 days' + INTERVAL '9 hours' + INTERVAL '30 minutes'),
  (v_washer_id, 120.050, 4.1000, 492.200, 0.01367, 60.010, 0.9855, NOW() - INTERVAL '6 days' + INTERVAL '9 hours' + INTERVAL '45 minutes'),

  -- 4 days ago (short cycle)
  (v_washer_id, 120.300, 3.5000, 421.100, 0.01170, 60.020, 0.9840, NOW() - INTERVAL '4 days' + INTERVAL '11 hours'),
  (v_washer_id, 119.800, 7.8000, 935.200, 0.02598, 59.980, 0.9875, NOW() - INTERVAL '4 days' + INTERVAL '11 hours' + INTERVAL '20 minutes'),
  (v_washer_id, 120.100, 5.5000, 661.000, 0.01836, 60.010, 0.9862, NOW() - INTERVAL '4 days' + INTERVAL '11 hours' + INTERVAL '40 minutes'),

  -- 2 days ago (rinse + spin)
  (v_washer_id, 120.000, 4.8000, 576.000, 0.01600, 60.000, 0.9850, NOW() - INTERVAL '2 days' + INTERVAL '10 hours'),
  (v_washer_id, 119.900, 6.2000, 743.400, 0.02065, 59.990, 0.9868, NOW() - INTERVAL '2 days' + INTERVAL '10 hours' + INTERVAL '25 minutes'),
  (v_washer_id, 120.200, 3.1000, 372.600, 0.01035, 60.020, 0.9845, NOW() - INTERVAL '2 days' + INTERVAL '10 hours' + INTERVAL '50 minutes'),

  -- Today (quick wash)
  (v_washer_id, 120.100, 3.8000, 456.400, 0.01268, 60.010, 0.9855, NOW() - INTERVAL '4 hours'),
  (v_washer_id, 119.950, 7.2000, 863.600, 0.02399, 59.990, 0.9872, NOW() - INTERVAL '3 hours' - INTERVAL '40 minutes'),
  (v_washer_id, 120.050, 4.5000, 540.200, 0.01501, 60.000, 0.9858, NOW() - INTERVAL '3 hours' - INTERVAL '20 minutes');


  RAISE NOTICE 'Done. Inserted: 14 Refrigerator readings, 13 TV readings, 13 Washing Machine readings.';

END $$;


-- =============================================================
-- VERIFICATION QUERY
-- Run this separately after the block above to confirm results.
-- =============================================================
SELECT
  d.device_name,
  COUNT(r.id)              AS reading_count,
  MAX(r.timestamp)         AS latest_reading,
  ROUND(AVG(r.power), 1)  AS avg_power_w,
  ROUND(AVG(r.voltage), 2) AS avg_voltage_v
FROM devices d
LEFT JOIN readings r ON r.device_id = d.id
WHERE d.device_name IN ('Refrigerator', 'TV', 'Washing Machine', 'ESP32 (Legacy)')
GROUP BY d.device_name
ORDER BY d.device_name;
