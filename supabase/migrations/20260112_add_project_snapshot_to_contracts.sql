-- Add project_snapshot column to contracts table
-- This column stores a JSON snapshot of contract-relevant project fields
-- to determine if regeneration is needed (excluding photos, progress, etc.)

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS project_snapshot TEXT;

COMMENT ON COLUMN contracts.project_snapshot IS 'JSON snapshot of contract-relevant project fields (title, description, dates, budget, team) to track changes';
