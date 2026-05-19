-- Gate 3 proposal loop columns
-- Add with IF NOT EXISTS — safe to run on DBs that already have some of these from earlier schema versions.
ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS chosen_solution        jsonb,
  ADD COLUMN IF NOT EXISTS chosen_solution_context jsonb,
  ADD COLUMN IF NOT EXISTS proposal_json          jsonb,
  ADD COLUMN IF NOT EXISTS sharepoint_proposal_url text,
  ADD COLUMN IF NOT EXISTS gate3_rollback_available boolean DEFAULT false;
