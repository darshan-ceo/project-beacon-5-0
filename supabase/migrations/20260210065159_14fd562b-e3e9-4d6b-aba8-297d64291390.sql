
-- Step 1A: Trigger function to auto-create stage_instance on case INSERT
CREATE OR REPLACE FUNCTION public.initialize_stage_instance_on_case_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.stage_instances (
    tenant_id, case_id, stage_key, cycle_no, 
    started_at, status, created_by
  ) VALUES (
    NEW.tenant_id, NEW.id, 
    COALESCE(NEW.stage_code, 'Assessment'), 
    1, now(), 'Active', 
    COALESCE(NEW.owner_id, auth.uid())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_initialize_stage_instance
AFTER INSERT ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.initialize_stage_instance_on_case_create();

-- Step 1B: Backfill existing cases without stage instances
INSERT INTO stage_instances (tenant_id, case_id, stage_key, cycle_no, started_at, status, created_by)
SELECT c.tenant_id, c.id, COALESCE(c.stage_code, 'Assessment'), 1, COALESCE(c.created_at, now()), 'Active', c.owner_id
FROM cases c
WHERE NOT EXISTS (
  SELECT 1 FROM stage_instances si WHERE si.case_id = c.id
)
AND COALESCE(c.status, 'Open') != 'Completed';
