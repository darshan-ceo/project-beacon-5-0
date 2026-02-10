
-- Create stage_closure_details table
CREATE TABLE public.stage_closure_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  stage_instance_id UUID NOT NULL UNIQUE REFERENCES public.stage_instances(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  closure_status TEXT NOT NULL,
  closure_ref_no TEXT,
  closure_date DATE,
  issuing_authority TEXT,
  officer_name TEXT,
  officer_designation TEXT,
  final_tax_amount JSONB DEFAULT '{"igst":0,"cgst":0,"sgst":0,"cess":0}',
  final_interest_amount NUMERIC DEFAULT 0,
  final_penalty_amount NUMERIC DEFAULT 0,
  final_total_demand NUMERIC DEFAULT 0,
  closure_notes TEXT,
  is_draft BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stage_closure_details ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped RLS policies
CREATE POLICY "Users can view closure details in their tenant"
ON public.stage_closure_details FOR SELECT
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert closure details in their tenant"
ON public.stage_closure_details FOR INSERT
TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update closure details in their tenant"
ON public.stage_closure_details FOR UPDATE
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete closure details in their tenant"
ON public.stage_closure_details FOR DELETE
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER handle_stage_closure_details_updated_at
  BEFORE UPDATE ON public.stage_closure_details
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
