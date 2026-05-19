-- Add Document A SharePoint URL column to engagements
-- Populated after Gate 2 approval when SolutionOptions.pdf is filed to SharePoint
ALTER TABLE engagements
  ADD COLUMN IF NOT EXISTS sharepoint_solution_options_url text;
