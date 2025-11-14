-- Add missing columns to clients table for contact details, constitution type, and structured address
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS address JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS signatories JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT NULL;

-- Add helpful comments for documentation
COMMENT ON COLUMN clients.address IS 'Structured address data with line1, line2, city, state, pincode, country';
COMMENT ON COLUMN clients.signatories IS 'Array of contact persons with name, designation, emails, phones';
COMMENT ON COLUMN clients.type IS 'Client constitution type (Company, Partnership, Individual, Trust, Other)';