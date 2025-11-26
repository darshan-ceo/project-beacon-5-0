-- Add missing case management fields to cases table

-- Add case classification and reference fields
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS case_type VARCHAR,
ADD COLUMN IF NOT EXISTS case_year VARCHAR,
ADD COLUMN IF NOT EXISTS case_sequence VARCHAR,
ADD COLUMN IF NOT EXISTS office_file_no VARCHAR,
ADD COLUMN IF NOT EXISTS issue_type TEXT,
ADD COLUMN IF NOT EXISTS form_type VARCHAR,
ADD COLUMN IF NOT EXISTS section_invoked VARCHAR,
ADD COLUMN IF NOT EXISTS financial_year VARCHAR;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_cases_case_type ON cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_financial_year ON cases(financial_year);
CREATE INDEX IF NOT EXISTS idx_cases_issue_type ON cases(issue_type);

-- Add comment for documentation
COMMENT ON COLUMN cases.case_type IS 'Type of case: GST, Income_Tax, Custom_Duty, Other';
COMMENT ON COLUMN cases.case_year IS 'Year component extracted from case number';
COMMENT ON COLUMN cases.office_file_no IS 'Office file reference number';
COMMENT ON COLUMN cases.issue_type IS 'Type of legal issue or dispute';
COMMENT ON COLUMN cases.form_type IS 'Form type (e.g., DRC-01, DRC-03)';
COMMENT ON COLUMN cases.section_invoked IS 'Legal sections or provisions invoked';
COMMENT ON COLUMN cases.financial_year IS 'Financial year for case filing';