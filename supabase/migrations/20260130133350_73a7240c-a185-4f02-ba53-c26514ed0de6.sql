-- Add residence_address column for Legal Forum
ALTER TABLE courts 
ADD COLUMN IF NOT EXISTS residence_address JSONB;

-- Add documentation
COMMENT ON COLUMN courts.residence_address IS 
'Residence address for the legal forum, following UnifiedAddress JSONB schema. Independent from legacy address field.';