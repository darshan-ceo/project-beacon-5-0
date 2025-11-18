-- Add State Bench location columns to cases table
-- These columns store state and city for GSTAT State Bench cases

ALTER TABLE cases
ADD COLUMN IF NOT EXISTS state_bench_state TEXT,
ADD COLUMN IF NOT EXISTS state_bench_city TEXT;

-- Add index for state bench location queries
CREATE INDEX IF NOT EXISTS idx_cases_state_bench_location 
ON cases(state_bench_state, state_bench_city) 
WHERE state_bench_state IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN cases.state_bench_state IS 'State selection for GSTAT State Bench cases (e.g., Gujarat, Maharashtra)';
COMMENT ON COLUMN cases.state_bench_city IS 'City selection for GSTAT State Bench cases (e.g., Ahmedabad, Mumbai)';
