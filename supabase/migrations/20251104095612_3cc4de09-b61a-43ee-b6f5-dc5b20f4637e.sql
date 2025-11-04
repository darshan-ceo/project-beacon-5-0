-- Add full_name column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Populate full_name from email for existing records
UPDATE employees 
SET full_name = SPLIT_PART(email, '@', 1)
WHERE full_name IS NULL;

-- Set NOT NULL constraint
ALTER TABLE employees 
ALTER COLUMN full_name SET NOT NULL;

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_employees_full_name 
ON employees(full_name);