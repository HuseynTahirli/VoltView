-- =============================================================
-- VoltView Supabase Migration: 001_initial_schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- ─────────────────────────────────────────────
-- 1. READINGS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS readings (
  id          BIGSERIAL PRIMARY KEY,
  voltage     NUMERIC(8,3) NOT NULL,
  current     NUMERIC(8,4) NOT NULL,
  power       NUMERIC(10,3) NOT NULL,
  energy      NUMERIC(12,5),
  frequency   NUMERIC(7,3),
  pf          NUMERIC(5,4),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings (timestamp DESC);

-- ─────────────────────────────────────────────
-- 2. ALERTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('critical', 'warning', 'info')),
  message     TEXT NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts (resolved);

-- ─────────────────────────────────────────────
-- 3. THRESHOLDS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS thresholds (
  id      BIGSERIAL PRIMARY KEY,
  key     TEXT UNIQUE NOT NULL,
  value   NUMERIC NOT NULL,
  label   TEXT
);

-- Insert default thresholds (only if table is empty)
INSERT INTO thresholds (key, value, label)
VALUES
  ('power_max',   3500, 'Max Power (W)'),
  ('voltage_max', 255,  'Max Voltage (V)'),
  ('voltage_min', 205,  'Min Voltage (V)'),
  ('current_max', 16,   'Max Current (A)')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────
-- 4. USERS TABLE (mirrors Supabase auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username  TEXT,
  email     TEXT
);

-- ─────────────────────────────────────────────
-- 5. REPORTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          BIGSERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  summary     TEXT,
  report_type TEXT,
  status      TEXT DEFAULT 'Generated',
  file_path   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- NOTE: The backend uses the service role key which bypasses RLS.
-- These policies apply to any direct client-side Supabase access.
-- Enable them so the tables are protected if the anon key is used.
-- =============================================================

ALTER TABLE readings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports   ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (already implicit, but explicit for clarity)
-- Service role bypasses RLS automatically — no policy needed.

-- Deny all access to anon/authenticated roles by default
-- (backend uses service key, so dashboard queries still work)

-- If you want authenticated users to read their own user row:
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- =============================================================
-- MULTI-USER UPGRADE (run this AFTER confirming single-device setup works)
-- Adds user_id to readings and alerts for per-user data isolation.
-- This requires updating the ESP32 endpoint to pass a device API key.
-- =============================================================

-- ALTER TABLE readings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- ALTER TABLE alerts   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- ALTER TABLE thresholds ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Per-user RLS policies (uncomment after adding user_id columns):
-- CREATE POLICY "Users see own readings"
--   ON readings FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users see own alerts"
--   ON alerts FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users manage own thresholds"
--   ON thresholds FOR ALL USING (auth.uid() = user_id);
