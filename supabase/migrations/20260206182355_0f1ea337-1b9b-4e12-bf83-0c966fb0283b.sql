-- Add lead/CRM fields to existing client_contacts table
ALTER TABLE client_contacts
ADD COLUMN IF NOT EXISTS lead_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lead_source text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_value numeric(15,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expected_close_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lost_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS converted_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT NOW();

-- Create lead_status check constraint
ALTER TABLE client_contacts
ADD CONSTRAINT chk_lead_status 
CHECK (lead_status IS NULL OR lead_status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'));

-- Index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON client_contacts(lead_status) WHERE lead_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_owner_lead ON client_contacts(owner_user_id, lead_status) WHERE lead_status IS NOT NULL;

-- Create lead_activities table for tracking interactions
CREATE TABLE IF NOT EXISTS lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES client_contacts(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  subject text,
  description text,
  outcome text,
  next_action text,
  next_action_date date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT NOW()
);

-- Add check constraint for activity_type
ALTER TABLE lead_activities
ADD CONSTRAINT chk_activity_type 
CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'status_change', 'conversion'));

-- Enable RLS on lead_activities
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_activities (inherit from client_contacts pattern)
CREATE POLICY "Users can view lead activities for their tenant"
ON lead_activities FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create lead activities for their tenant"
ON lead_activities FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update their own lead activities"
ON lead_activities FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own lead activities"
ON lead_activities FOR DELETE
USING (created_by = auth.uid());

-- Index for activity queries
CREATE INDEX IF NOT EXISTS idx_lead_activities_contact ON lead_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON lead_activities(tenant_id);