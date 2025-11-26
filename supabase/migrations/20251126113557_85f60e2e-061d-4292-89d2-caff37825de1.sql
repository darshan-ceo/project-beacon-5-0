-- Add jurisdiction JSONB column to clients table for GST Portal compliance
-- Captures both State Jurisdiction (Administrative Office) and Center Jurisdiction (CBIC - Other Office)

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS jurisdiction JSONB DEFAULT '{}';

-- Add index for jurisdiction queries
CREATE INDEX IF NOT EXISTS idx_clients_jurisdiction ON clients USING GIN (jurisdiction);

-- Add helpful comment
COMMENT ON COLUMN clients.jurisdiction IS 'GST Portal jurisdiction details: State (Administrative Office: state, division, range, unit) and Center (CBIC Other Office: zone, commissionerate, division, range)';
