-- Create communication_logs table for communication tracking
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  case_id UUID REFERENCES cases(id),
  client_id UUID REFERENCES clients(id),
  
  -- Message details
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  direction VARCHAR NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  message TEXT NOT NULL,
  
  -- Sender/Recipient
  sent_by UUID REFERENCES profiles(id),
  sent_by_name VARCHAR,
  sent_to VARCHAR NOT NULL,
  sent_to_name VARCHAR,
  
  -- Status tracking
  status VARCHAR NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  message_id VARCHAR,  -- External provider message ID
  failure_reason TEXT,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Attachments (JSONB array)
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key constraint for tenant_id
ALTER TABLE communication_logs
  ADD CONSTRAINT communication_logs_tenant_id_fkey 
  FOREIGN KEY (tenant_id) 
  REFERENCES tenants(id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_communication_logs_tenant ON communication_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_case ON communication_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_client ON communication_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_channel ON communication_logs(channel);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created ON communication_logs(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE communication_logs;

-- RLS Policies
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;

-- Users can view communication logs in their tenant
CREATE POLICY "Users can view communication logs in their tenant"
  ON communication_logs
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- Authorized users can create communication logs
CREATE POLICY "Authorized users can create communication logs"
  ON communication_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id() AND
    sent_by = auth.uid() AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'partner'::app_role) OR
      has_role(auth.uid(), 'manager'::app_role) OR
      has_role(auth.uid(), 'ca'::app_role) OR
      has_role(auth.uid(), 'advocate'::app_role) OR
      has_role(auth.uid(), 'staff'::app_role)
    )
  );

-- Add comments for documentation
COMMENT ON TABLE communication_logs IS 'Tracks all email, SMS, and WhatsApp communications with clients';
COMMENT ON COLUMN communication_logs.channel IS 'Communication channel: email, sms, or whatsapp';
COMMENT ON COLUMN communication_logs.direction IS 'Message direction: inbound or outbound';
COMMENT ON COLUMN communication_logs.message_id IS 'External provider message ID (from Resend, Twilio, etc.)';
COMMENT ON COLUMN communication_logs.attachments IS 'Array of attachment metadata stored as JSONB';