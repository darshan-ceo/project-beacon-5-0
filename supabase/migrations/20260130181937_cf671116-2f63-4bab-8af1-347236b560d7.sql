-- Drop address columns from courts table
ALTER TABLE courts DROP COLUMN IF EXISTS address;
ALTER TABLE courts DROP COLUMN IF EXISTS address_jsonb;
ALTER TABLE courts DROP COLUMN IF EXISTS residence_address;

-- Add comment documenting removal
COMMENT ON TABLE courts IS 'Legal authorities/forums table. Address columns removed 2026-01-30 due to persistent data integrity issues.';