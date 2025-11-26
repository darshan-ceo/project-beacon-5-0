-- Add missing columns to courts table
ALTER TABLE courts ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'Active';
ALTER TABLE courts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS bench_location text;

-- Add missing columns to judges table
ALTER TABLE judges ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'Active';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS bench text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS jurisdiction text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS appointment_date date;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS retirement_date date;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS years_of_service integer DEFAULT 0;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS specialization text[] DEFAULT '{}';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS chambers text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS assistant jsonb DEFAULT '{}';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '{}';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS photo_url text;