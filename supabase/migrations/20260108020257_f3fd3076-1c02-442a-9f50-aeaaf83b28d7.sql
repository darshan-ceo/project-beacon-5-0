-- Add case completion fields
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completed_by UUID;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completion_reason VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN DEFAULT FALSE;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_completed_at ON cases(completed_at) WHERE completed_at IS NOT NULL;