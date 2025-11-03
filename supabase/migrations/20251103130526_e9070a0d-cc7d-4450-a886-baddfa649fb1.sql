-- Phase 1: Add Missing Database Columns

-- Add missing columns to cases table
ALTER TABLE cases 
  ADD COLUMN forum_id uuid REFERENCES courts(id) ON DELETE RESTRICT,
  ADD COLUMN authority_id uuid REFERENCES courts(id) ON DELETE RESTRICT,
  ADD COLUMN next_hearing_date timestamptz;

-- Create indexes for cases table
CREATE INDEX idx_cases_forum_id ON cases(forum_id);
CREATE INDEX idx_cases_authority_id ON cases(authority_id);
CREATE INDEX idx_cases_next_hearing ON cases(next_hearing_date);

-- Add missing columns to hearings table
ALTER TABLE hearings 
  ADD COLUMN forum_id uuid REFERENCES courts(id) ON DELETE RESTRICT,
  ADD COLUMN authority_id uuid REFERENCES courts(id) ON DELETE RESTRICT,
  ADD COLUMN court_id uuid;

-- Add foreign key constraint for hearings.court_id
ALTER TABLE hearings 
  ADD CONSTRAINT hearings_court_id_fkey 
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE RESTRICT;

-- Create indexes for hearings table
CREATE INDEX idx_hearings_forum_id ON hearings(forum_id);
CREATE INDEX idx_hearings_authority_id ON hearings(authority_id);
CREATE INDEX idx_hearings_court_id ON hearings(court_id);