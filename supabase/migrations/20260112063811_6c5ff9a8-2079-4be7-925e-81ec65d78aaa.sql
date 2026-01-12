-- Enhance stage_transitions table for legal-grade auditing
ALTER TABLE stage_transitions 
  ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'passed',
  ADD COLUMN IF NOT EXISTS validation_warnings TEXT[],
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_comments TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT true;

-- Create stage_transition_approvals table for approval workflow history
CREATE TABLE IF NOT EXISTS stage_transition_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  transition_id UUID NOT NULL REFERENCES stage_transitions(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('request', 'approve', 'reject', 'comment')),
  actor_id UUID NOT NULL REFERENCES profiles(id),
  actor_role VARCHAR(100),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on stage_transition_approvals
ALTER TABLE stage_transition_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stage_transition_approvals
CREATE POLICY "Users can view approvals in their tenant"
  ON stage_transition_approvals FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create approvals in their tenant"
  ON stage_transition_approvals FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create storage bucket for transition attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transition-attachments',
  'transition-attachments',
  false,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for transition attachments
CREATE POLICY "Users can view transition attachments in their tenant"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'transition-attachments' AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can upload transition attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'transition-attachments' AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  ));

-- Add index for faster approval queries
CREATE INDEX IF NOT EXISTS idx_stage_transition_approvals_transition_id 
  ON stage_transition_approvals(transition_id);

CREATE INDEX IF NOT EXISTS idx_stage_transitions_case_approval 
  ON stage_transitions(case_id, approval_status) 
  WHERE approval_status IS NOT NULL;