
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES public.stage_instances(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES public.stage_instances(id);
