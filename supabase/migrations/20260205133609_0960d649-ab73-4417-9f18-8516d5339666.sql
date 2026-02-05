-- Add Notice Workflow Alignment - Schema Enhancement
-- Add new columns to stage_notices for expanded notice metadata

-- Notice Identification & Authority
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS offline_reference_no varchar;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS issuing_authority varchar;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS issuing_designation varchar;

-- Tax Period & Financial Year
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS tax_period_start date;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS tax_period_end date;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS financial_year varchar;

-- Demand Breakdown with "As Applicable" flags
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS tax_amount numeric;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS interest_amount numeric;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS penalty_amount numeric;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS tax_applicable boolean DEFAULT true;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS interest_applicable boolean DEFAULT true;
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS penalty_applicable boolean DEFAULT true;

-- Notice Micro-Workflow Step tracking
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS workflow_step varchar DEFAULT 'notice';

-- Add filing_mode to stage_replies for Portal/Physical/Email tracking
ALTER TABLE public.stage_replies ADD COLUMN IF NOT EXISTS filing_mode varchar;

-- Add notice_id to hearings for notice-level linking (optional FK)
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS notice_id uuid REFERENCES public.stage_notices(id) ON DELETE SET NULL;

-- Add hearing purpose and outcome fields if not present
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS hearing_purpose varchar;
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS hearing_outcome varchar;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stage_notices_workflow_step ON public.stage_notices(workflow_step);
CREATE INDEX IF NOT EXISTS idx_hearings_notice_id ON public.hearings(notice_id);