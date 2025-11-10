-- Phase 1: Add new fields to cases table for compliance and financial tracking
-- Notice Date and Reply Due Date for compliance tracking
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reply_due_date DATE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(15, 2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC(15, 2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS total_demand NUMERIC(15, 2);

-- Create issue_types master table for standardization
CREATE TABLE IF NOT EXISTS issue_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  frequency_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed common GST issues
INSERT INTO issue_types (name, category) VALUES
  ('Input Tax Credit Disallowance', 'ITC'),
  ('Excess ITC Availed', 'ITC'),
  ('Mismatch in Returns (GSTR-2A vs 3B)', 'Returns'),
  ('Late Filing of Returns', 'Compliance'),
  ('Non-filing of Returns', 'Compliance'),
  ('Refund Claim Rejection', 'Refund'),
  ('Wrong Classification of Goods/Services', 'Classification'),
  ('Tax Rate Mismatch', 'Tax Computation'),
  ('E-way Bill Violations', 'E-waybill'),
  ('Place of Supply Dispute', 'Jurisdictional')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE issue_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON issue_types;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON issue_types;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON issue_types;

-- Create RLS policies for issue_types
CREATE POLICY "Allow read access to all authenticated users"
  ON issue_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert for authenticated users"
  ON issue_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
  ON issue_types FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_issue_types_name ON issue_types(name);
CREATE INDEX IF NOT EXISTS idx_issue_types_category ON issue_types(category);
CREATE INDEX IF NOT EXISTS idx_cases_reply_due_date ON cases(reply_due_date);
CREATE INDEX IF NOT EXISTS idx_cases_notice_date ON cases(notice_date);