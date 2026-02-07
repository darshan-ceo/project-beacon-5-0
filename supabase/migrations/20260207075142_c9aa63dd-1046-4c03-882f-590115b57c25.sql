-- Drop the old constraint
ALTER TABLE client_contacts DROP CONSTRAINT IF EXISTS chk_lead_status;

-- Create new constraint with all valid values (new 4-status flow + legacy for backward compatibility)
ALTER TABLE client_contacts ADD CONSTRAINT chk_lead_status CHECK (
  lead_status IS NULL OR lead_status = ANY (ARRAY[
    'new',
    'follow_up', 
    'converted',
    'not_proceeding',
    'contacted',
    'qualified', 
    'proposal_sent',
    'negotiation',
    'won',
    'lost'
  ])
);