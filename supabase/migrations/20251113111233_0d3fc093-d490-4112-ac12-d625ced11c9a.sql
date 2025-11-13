-- Create stage_transitions table for tracking case stage changes
CREATE TABLE IF NOT EXISTS public.stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  case_id UUID NOT NULL,
  from_stage VARCHAR(100),
  to_stage VARCHAR(100) NOT NULL,
  transition_type VARCHAR(50) NOT NULL CHECK (transition_type IN ('Forward', 'Send Back', 'Remand')),
  comments TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_stage_transitions_case_id ON public.stage_transitions(case_id);
CREATE INDEX idx_stage_transitions_tenant_id ON public.stage_transitions(tenant_id);
CREATE INDEX idx_stage_transitions_created_at ON public.stage_transitions(created_at DESC);

-- Enable RLS
ALTER TABLE public.stage_transitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view stage transitions in their tenant"
  ON public.stage_transitions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can create stage transitions"
  ON public.stage_transitions
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
    AND (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'partner') OR
      has_role(auth.uid(), 'manager') OR
      has_role(auth.uid(), 'advocate') OR
      has_role(auth.uid(), 'ca')
    )
  );

COMMENT ON TABLE public.stage_transitions IS 'Tracks all case stage transitions for audit trail and history';
COMMENT ON COLUMN public.stage_transitions.transition_type IS 'Type of transition: Forward, Send Back, or Remand';