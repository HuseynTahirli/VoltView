-- =============================================================
-- VoltView Migration 002: Per-user alert email settings
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================

-- Add alert email columns to the existing users table.
-- alert_email: where to send alerts (can differ from login email)
-- email_alerts_enabled: whether this user wants email alerts at all

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS alert_email          TEXT,
  ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE;
