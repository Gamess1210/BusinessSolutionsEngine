-- Add consolidation pipeline columns to engagements
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- All columns are nullable — no existing rows are affected.

ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS structured_brief    JSONB,
  ADD COLUMN IF NOT EXISTS last_successful_gate INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_log           JSONB;
