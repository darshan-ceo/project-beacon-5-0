-- Add tax_jurisdiction and officer_designation columns to courts table
ALTER TABLE courts 
ADD COLUMN IF NOT EXISTS tax_jurisdiction text,
ADD COLUMN IF NOT EXISTS officer_designation text;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_courts_tax_jurisdiction ON courts(tax_jurisdiction);
CREATE INDEX IF NOT EXISTS idx_courts_officer_designation ON courts(officer_designation);

-- Add comments for documentation
COMMENT ON COLUMN courts.tax_jurisdiction IS 'CGST or SGST jurisdiction';
COMMENT ON COLUMN courts.officer_designation IS 'Officer rank/designation in GST hierarchy (e.g., DEPUTY_COMMISSIONER, JOINT_COMMISSIONER)';