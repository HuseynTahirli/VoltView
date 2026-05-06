-- =============================================================
-- VoltView Migration 004: Multi-device support
-- Run in Supabase Dashboard → SQL Editor
-- Safe: no DROP, no DELETE, no table renames.
-- =============================================================


-- ─────────────────────────────────────────────
-- A. CREATE devices TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT        NOT NULL,
  device_key  TEXT        UNIQUE NOT NULL,
  location    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user device lookups
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);


-- ─────────────────────────────────────────────
-- B. ADD device_id TO readings
-- Nullable so existing rows are unaffected and
-- the current ESP32 endpoint keeps working
-- without code changes.
-- ─────────────────────────────────────────────
ALTER TABLE readings
  ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES devices(id) ON DELETE CASCADE;

-- Index for per-device history queries
CREATE INDEX IF NOT EXISTS idx_readings_device_id ON readings (device_id);

-- Ensure the timestamp index exists (already in 001, but safe to repeat)
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings (timestamp DESC);


-- ─────────────────────────────────────────────
-- C. BACKFILL: assign existing readings to a
--    "Legacy ESP32" device so history is intact.
--    Uses the first user found in the users table.
--    Safe to run multiple times (ON CONFLICT guard).
-- ─────────────────────────────────────────────
DO $$
DECLARE
  v_user_id    UUID;
  v_device_id  UUID;
  v_count      BIGINT;
BEGIN
  -- Only backfill if there are readings without a device
  SELECT COUNT(*) INTO v_count FROM readings WHERE device_id IS NULL;
  IF v_count = 0 THEN
    RAISE NOTICE 'No unassigned readings found — backfill skipped.';
    RETURN;
  END IF;

  -- Pick the first registered user (the single-device owner)
  SELECT id INTO v_user_id FROM users LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found — creating legacy device with NULL owner.';
  END IF;

  -- Insert the legacy device (idempotent via ON CONFLICT)
  INSERT INTO devices (user_id, device_name, device_key, location)
  VALUES (v_user_id, 'ESP32 (Legacy)', 'esp32-legacy-default', 'Default Location')
  ON CONFLICT (device_key) DO NOTHING;

  -- Resolve the device id (works whether just inserted or already existed)
  SELECT id INTO v_device_id FROM devices WHERE device_key = 'esp32-legacy-default';

  -- Assign all unassigned readings to this device
  UPDATE readings SET device_id = v_device_id WHERE device_id IS NULL;

  RAISE NOTICE 'Backfilled % readings → device %', v_count, v_device_id;
END $$;


-- ─────────────────────────────────────────────
-- D. RLS FOR devices TABLE
-- Backend uses the service role key (bypasses RLS).
-- These policies protect direct client-side access.
-- ─────────────────────────────────────────────
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Users can read only their own devices
CREATE POLICY "Users see own devices"
  ON devices FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own devices (future: device registration UI)
CREATE POLICY "Users insert own devices"
  ON devices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own devices (rename, change location)
CREATE POLICY "Users update own devices"
  ON devices FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own devices
CREATE POLICY "Users delete own devices"
  ON devices FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- E. RLS FOR readings TABLE (scoped to device ownership)
-- The readings table already has RLS enabled (001).
-- We add a SELECT policy tied to device ownership.
-- INSERT still goes through the service role key.
-- ─────────────────────────────────────────────

-- Users can read readings whose device belongs to them,
-- OR readings with no device_id (legacy rows before migration).
CREATE POLICY "Users see own device readings"
  ON readings FOR SELECT
  USING (
    device_id IS NULL
    OR device_id IN (
      SELECT id FROM devices WHERE user_id = auth.uid()
    )
  );

