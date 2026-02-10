
-- Step 1: Add hearing_type column to existing hearings table
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS hearing_type VARCHAR DEFAULT 'General';

-- Step 2: Create hearing_ph_details extension table
CREATE TABLE public.hearing_ph_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  hearing_id UUID UNIQUE NOT NULL REFERENCES public.hearings(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id),
  ph_notice_ref_no TEXT NOT NULL,
  ph_notice_date DATE NOT NULL,
  hearing_mode TEXT DEFAULT 'Physical',
  place_of_hearing TEXT,
  attended_by TEXT,
  additional_submissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hearing_ph_details ENABLE ROW LEVEL SECURITY;

-- RLS policies matching hearings table pattern (tenant-scoped)
CREATE POLICY "Tenant users can view hearing PH details"
  ON public.hearing_ph_details FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant users can insert hearing PH details"
  ON public.hearing_ph_details FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant users can update hearing PH details"
  ON public.hearing_ph_details FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant users can delete hearing PH details"
  ON public.hearing_ph_details FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Auto-update trigger for updated_at
CREATE TRIGGER update_hearing_ph_details_updated_at
  BEFORE UPDATE ON public.hearing_ph_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
