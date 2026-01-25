-- Create stage_instances table to track each stage occurrence with cycle count
CREATE TABLE public.stage_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  stage_key VARCHAR(50) NOT NULL,
  cycle_no INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Remanded', 'Superseded')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create stage_checklist_items table for stage-specific checklists
CREATE TABLE public.stage_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  stage_instance_id UUID NOT NULL REFERENCES public.stage_instances(id) ON DELETE CASCADE,
  item_key VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  rule_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (rule_type IN ('auto_dms', 'auto_hearing', 'auto_field', 'manual')),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Auto✓', 'Attested', 'Override', 'Pending')),
  attested_by UUID REFERENCES public.profiles(id),
  attested_at TIMESTAMPTZ,
  note TEXT,
  evidence_file_id UUID REFERENCES public.documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_stage_instances_case_id ON public.stage_instances(case_id);
CREATE INDEX idx_stage_instances_tenant_stage ON public.stage_instances(tenant_id, stage_key);
CREATE INDEX idx_stage_instances_status ON public.stage_instances(status) WHERE status = 'Active';
CREATE INDEX idx_stage_checklist_stage_instance ON public.stage_checklist_items(stage_instance_id);

-- Enable RLS
ALTER TABLE public.stage_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stage_instances
CREATE POLICY "Users can view stage instances in their tenant"
ON public.stage_instances FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create stage instances in their tenant"
ON public.stage_instances FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update stage instances in their tenant"
ON public.stage_instances FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

-- RLS Policies for stage_checklist_items
CREATE POLICY "Users can view checklist items in their tenant"
ON public.stage_checklist_items FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can create checklist items in their tenant"
ON public.stage_checklist_items FOR INSERT
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update checklist items in their tenant"
ON public.stage_checklist_items FOR UPDATE
USING (tenant_id = public.get_user_tenant_id());

-- Trigger for updated_at
CREATE TRIGGER update_stage_instances_updated_at
BEFORE UPDATE ON public.stage_instances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stage_checklist_items_updated_at
BEFORE UPDATE ON public.stage_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for stage_instances
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_instances;

-- Create function to automatically create stage instance on transition
CREATE OR REPLACE FUNCTION public.create_stage_instance_on_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_existing_instance UUID;
  v_new_cycle_no INTEGER;
BEGIN
  -- Check if there's already an Active instance for this stage
  SELECT id INTO v_existing_instance
  FROM public.stage_instances
  WHERE case_id = NEW.case_id
    AND stage_key = NEW.to_stage
    AND status = 'Active';

  -- If an active instance exists, don't create a new one
  IF v_existing_instance IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate cycle number (how many times this stage has been visited)
  SELECT COALESCE(MAX(cycle_no), 0) + 1 INTO v_new_cycle_no
  FROM public.stage_instances
  WHERE case_id = NEW.case_id
    AND stage_key = NEW.to_stage;

  -- End any currently active instance for this case
  UPDATE public.stage_instances
  SET status = CASE 
      WHEN NEW.transition_type = 'Remand' THEN 'Remanded'
      ELSE 'Completed'
    END,
    ended_at = now(),
    updated_at = now()
  WHERE case_id = NEW.case_id
    AND status = 'Active';

  -- Create new stage instance
  INSERT INTO public.stage_instances (
    tenant_id, case_id, stage_key, cycle_no, started_at, status, created_by
  ) VALUES (
    NEW.tenant_id, NEW.case_id, NEW.to_stage, v_new_cycle_no, now(), 'Active', NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to stage_transitions
CREATE TRIGGER trg_create_stage_instance_on_transition
AFTER INSERT ON public.stage_transitions
FOR EACH ROW EXECUTE FUNCTION public.create_stage_instance_on_transition();