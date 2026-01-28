-- Day 1: Unified Address Architecture - Database Schema Alignment
-- Task 1: Add unified address JSONB column to employees table

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS address JSONB;

-- Add documentation comment for the new column
COMMENT ON COLUMN employees.address IS 
  'Unified structured address replacing legacy current_address/permanent_address fields after migration. Structure: {line1, line2, pincode, cityId, cityName, stateId, stateName, source, addressType, ...}';

-- Create functional indexes for address searches
CREATE INDEX IF NOT EXISTS idx_employees_address_city 
  ON employees ((address->>'cityName'));
CREATE INDEX IF NOT EXISTS idx_employees_address_state 
  ON employees ((address->>'stateName'));

-- Task 2: Mark legacy TEXT address column as deprecated in courts table
COMMENT ON COLUMN courts.address IS 
  'DEPRECATED: Use address_jsonb instead. This TEXT column is preserved for backward compatibility. All new writes should target address_jsonb column. Will be removed in future migration.';