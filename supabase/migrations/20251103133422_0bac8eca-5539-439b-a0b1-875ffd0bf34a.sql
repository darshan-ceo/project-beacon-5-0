-- Create timeline_entries table for case activity tracking
CREATE TABLE IF NOT EXISTS public.timeline_entries (
  id TEXT PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'doc_saved', 'ai_draft_generated', 'case_created', 
    'hearing_scheduled', 'task_completed', 'stage_change', 
    'comment', 'deadline', 'case_assigned'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeline_case ON public.timeline_entries(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_tenant ON public.timeline_entries(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view timeline in their tenant"
  ON public.timeline_entries FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can create timeline entries"
  ON public.timeline_entries FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own timeline entries"
  ON public.timeline_entries FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete timeline entries"
  ON public.timeline_entries FOR DELETE
  USING (tenant_id = get_user_tenant_id() AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role)
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_entries;