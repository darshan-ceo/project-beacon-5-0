
-- Create case_intelligence_snapshots table for immutable report snapshots
CREATE TABLE public.case_intelligence_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  snapshot_data JSONB NOT NULL,
  risk_score TEXT NOT NULL DEFAULT 'Low',
  financial_exposure NUMERIC DEFAULT 0,
  label TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_intelligence_snapshots ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped read
CREATE POLICY "Users can view snapshots in their tenant"
ON public.case_intelligence_snapshots
FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Tenant-scoped insert
CREATE POLICY "Users can create snapshots in their tenant"
ON public.case_intelligence_snapshots
FOR INSERT
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- No UPDATE policy (immutable snapshots)
-- Delete only by creator
CREATE POLICY "Users can delete their own snapshots"
ON public.case_intelligence_snapshots
FOR DELETE
USING (created_by = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_intelligence_snapshots_case_id ON public.case_intelligence_snapshots(case_id);
CREATE INDEX idx_intelligence_snapshots_tenant_id ON public.case_intelligence_snapshots(tenant_id);
