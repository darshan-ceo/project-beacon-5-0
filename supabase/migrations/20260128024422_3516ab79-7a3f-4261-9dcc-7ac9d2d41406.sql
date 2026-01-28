-- Phase 2: Unified Address Database Migration
-- Align all entity tables to use JSONB address format

-- 1. Courts: Convert address from TEXT to JSONB (with data migration)
-- First, add new JSONB column
ALTER TABLE courts ADD COLUMN IF NOT EXISTS address_jsonb JSONB;

-- Migrate existing data: Convert TEXT address + city fields into JSONB
UPDATE courts 
SET address_jsonb = jsonb_build_object(
  'line1', COALESCE(address, ''),
  'cityName', COALESCE(city, ''),
  'stateName', COALESCE(state, ''),
  'pincode', '',
  'countryId', 'IN',
  'countryName', 'India',
  'source', 'imported'
)
WHERE address IS NOT NULL OR city IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN courts.address_jsonb IS 'Unified JSONB address replacing legacy TEXT address field';

-- 2. Client Contacts: Add address JSONB column
ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS address JSONB;
COMMENT ON COLUMN client_contacts.address IS 'Unified JSONB address for contact mailing address';

-- 3. Add index for address searches on courts
CREATE INDEX IF NOT EXISTS idx_courts_address_city ON courts ((address_jsonb->>'cityName'));
CREATE INDEX IF NOT EXISTS idx_courts_address_state ON courts ((address_jsonb->>'stateName'));

-- 4. Add index for address searches on client_contacts
CREATE INDEX IF NOT EXISTS idx_client_contacts_address_city ON client_contacts ((address->>'cityName'));
CREATE INDEX IF NOT EXISTS idx_client_contacts_address_state ON client_contacts ((address->>'stateName'));