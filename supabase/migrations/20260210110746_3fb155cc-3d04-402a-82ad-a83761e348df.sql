
-- Create structured_reply_details table (1:1 extension of stage_replies for appeal stages)
CREATE TABLE public.structured_reply_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  reply_id UUID NOT NULL UNIQUE REFERENCES public.stage_replies(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id),
  prepared_by TEXT,
  filed_by_name TEXT,
  pre_deposit_pct NUMERIC,
  pre_deposit_amount NUMERIC,
  pre_deposit_remarks TEXT,
  cross_obj_ref TEXT,
  cross_obj_date DATE,
  ack_reference_id TEXT,
  filing_proof_doc_ids JSONB DEFAULT '[]'::jsonb,
  delay_reason TEXT,
  condonation_filed BOOLEAN DEFAULT false,
  key_arguments TEXT,
  strength_weakness TEXT,
  expected_outcome TEXT,
  additional_submissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.structured_reply_details ENABLE ROW LEVEL SECURITY;

-- RLS policies (tenant-scoped, matching stage_replies pattern)
CREATE POLICY "Users can view structured reply details in their tenant"
ON public.structured_reply_details FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert structured reply details in their tenant"
ON public.structured_reply_details FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update structured reply details in their tenant"
ON public.structured_reply_details FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete structured reply details in their tenant"
ON public.structured_reply_details FOR DELETE
USING (tenant_id = public.get_user_tenant_id());

-- Auto-update timestamp trigger
CREATE TRIGGER update_structured_reply_details_updated_at
BEFORE UPDATE ON public.structured_reply_details
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
