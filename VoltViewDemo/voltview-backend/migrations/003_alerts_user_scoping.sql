-- =============================================================
-- VoltView Migration 003: Scope alerts to individual users
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================

-- Add user_id to alerts so each alert is tied to a specific user.
-- Nullable so existing rows (created before this migration) are
-- kept in the table without error and are treated as legacy global alerts.
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts (user_id);

-- RLS policy: users can only see their own alerts (or legacy rows with no user_id)
-- The backend still uses the service role key (bypasses RLS), but this protects
-- any future direct-client queries.
CREATE POLICY "Users see own alerts"
  ON alerts FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Allow authenticated users to update (resolve) only their own alerts
CREATE POLICY "Users resolve own alerts"
  ON alerts FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);
