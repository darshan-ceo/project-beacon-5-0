-- Create task_creation_footprints table for idempotency tracking
CREATE TABLE IF NOT EXISTS public.task_creation_footprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  case_id UUID NOT NULL,
  template_id UUID NOT NULL,
  task_id UUID NOT NULL,
  stage TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique constraint per case-template-stage combination
  UNIQUE(tenant_id, case_id, template_id, stage)
);

-- Enable Row Level Security
ALTER TABLE public.task_creation_footprints ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view footprints in their tenant
CREATE POLICY "Users can view footprints in their tenant"
ON public.task_creation_footprints
FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

-- RLS Policy: System can create footprints
CREATE POLICY "System can create footprints"
ON public.task_creation_footprints
FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_footprints_case_template ON public.task_creation_footprints(case_id, template_id);
CREATE INDEX idx_footprints_tenant ON public.task_creation_footprints(tenant_id);

COMMENT ON TABLE public.task_creation_footprints IS 'Tracks automated task creation to prevent duplicate task generation during stage transitions';
COMMENT ON COLUMN public.task_creation_footprints.case_id IS 'References the case for which the task was created';
COMMENT ON COLUMN public.task_creation_footprints.template_id IS 'References the task template that generated this task';
COMMENT ON COLUMN public.task_creation_footprints.task_id IS 'The actual task ID that was created';
COMMENT ON COLUMN public.task_creation_footprints.stage IS 'The stage at which this task was auto-created';