-- Create gst_credentials table for OAuth token storage
CREATE TABLE public.gst_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gstin VARCHAR(15) NOT NULL,
  
  -- Consent Information
  consent_id VARCHAR(100),
  consent_status VARCHAR(20) DEFAULT 'pending',
  consent_granted_at TIMESTAMPTZ,
  consent_valid_till TIMESTAMPTZ,
  consent_revoked_at TIMESTAMPTZ,
  
  -- OAuth Tokens (will be encrypted at application level)
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  
  -- GSP Profile Data (cached)
  registered_email VARCHAR(255),
  registered_mobile VARCHAR(20),
  filing_frequency VARCHAR(20),
  aato_band VARCHAR(10),
  e_invoice_enabled BOOLEAN DEFAULT false,
  e_waybill_enabled BOOLEAN DEFAULT false,
  authorized_signatories JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  last_sync TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  
  -- Constraints
  UNIQUE (tenant_id, client_id, gstin)
);

-- Indexes for gst_credentials
CREATE INDEX idx_gst_credentials_tenant_id ON gst_credentials(tenant_id);
CREATE INDEX idx_gst_credentials_client_id ON gst_credentials(client_id);
CREATE INDEX idx_gst_credentials_gstin ON gst_credentials(gstin);
CREATE INDEX idx_gst_credentials_consent_status ON gst_credentials(consent_status);

-- Enable RLS on gst_credentials
ALTER TABLE gst_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gst_credentials
CREATE POLICY "Users can view GST credentials in their tenant"
ON gst_credentials FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can manage GST credentials"
ON gst_credentials FOR ALL
USING (
  tenant_id = get_user_tenant_id() 
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner') 
    OR has_role(auth.uid(), 'manager')
    OR has_role(auth.uid(), 'ca')
  )
);

-- Create gst_return_status table for filing status tracking
CREATE TABLE public.gst_return_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gstin VARCHAR(15) NOT NULL,
  
  -- Return Information
  return_type VARCHAR(20) NOT NULL,
  return_period VARCHAR(10) NOT NULL,
  financial_year VARCHAR(10),
  
  -- Filing Status
  filing_status VARCHAR(30) DEFAULT 'pending',
  filing_date TIMESTAMPTZ,
  due_date DATE,
  is_overdue BOOLEAN DEFAULT false,
  
  -- Liability Information
  tax_liability NUMERIC(15,2),
  tax_paid NUMERIC(15,2),
  late_fee NUMERIC(10,2),
  interest NUMERIC(10,2),
  
  -- ARN and Reference
  arn VARCHAR(50),
  reference_id VARCHAR(100),
  
  -- Sync Metadata
  last_synced_at TIMESTAMPTZ,
  sync_source VARCHAR(20) DEFAULT 'manual',
  sync_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE (tenant_id, gstin, return_type, return_period)
);

-- Indexes for gst_return_status
CREATE INDEX idx_gst_return_status_tenant_id ON gst_return_status(tenant_id);
CREATE INDEX idx_gst_return_status_client_id ON gst_return_status(client_id);
CREATE INDEX idx_gst_return_status_gstin ON gst_return_status(gstin);
CREATE INDEX idx_gst_return_status_return_type ON gst_return_status(return_type);
CREATE INDEX idx_gst_return_status_filing_status ON gst_return_status(filing_status);
CREATE INDEX idx_gst_return_status_due_date ON gst_return_status(due_date);
CREATE INDEX idx_gst_return_status_is_overdue ON gst_return_status(is_overdue) WHERE is_overdue = true;

-- Enable RLS on gst_return_status
ALTER TABLE gst_return_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gst_return_status
CREATE POLICY "Users can view return status in their tenant"
ON gst_return_status FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can create return status records"
ON gst_return_status FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can update return status"
ON gst_return_status FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() 
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner') 
    OR has_role(auth.uid(), 'manager')
    OR has_role(auth.uid(), 'ca')
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_gst_credentials_updated_at
  BEFORE UPDATE ON gst_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gst_return_status_updated_at
  BEFORE UPDATE ON gst_return_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();