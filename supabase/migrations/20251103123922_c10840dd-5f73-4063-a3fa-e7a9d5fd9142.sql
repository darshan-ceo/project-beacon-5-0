-- Create task_notes table
CREATE TABLE task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('comment', 'status_change', 'time_log', 'follow_up')),
  note text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX idx_task_notes_tenant_id ON task_notes(tenant_id);
CREATE INDEX idx_task_notes_created_at ON task_notes(created_at DESC);

-- Enable RLS on task_notes
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_notes
CREATE POLICY "Users can view task notes in their tenant"
  ON task_notes FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can create task notes"
  ON task_notes FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'partner'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own task notes"
  ON task_notes FOR UPDATE
  USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete task notes"
  ON task_notes FOR DELETE
  USING (
    tenant_id = get_user_tenant_id() 
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role))
  );

-- Create task_followups table
CREATE TABLE task_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  work_date date NOT NULL,
  status text,
  outcome text,
  client_interaction boolean DEFAULT false,
  internal_review boolean DEFAULT false
);

CREATE INDEX idx_task_followups_task_id ON task_followups(task_id);
CREATE INDEX idx_task_followups_tenant_id ON task_followups(tenant_id);
CREATE INDEX idx_task_followups_work_date ON task_followups(work_date DESC);

-- Enable RLS on task_followups
ALTER TABLE task_followups ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_followups
CREATE POLICY "Users can view task followups in their tenant"
  ON task_followups FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can create task followups"
  ON task_followups FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'partner'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own task followups"
  ON task_followups FOR UPDATE
  USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete task followups"
  ON task_followups FOR DELETE
  USING (
    tenant_id = get_user_tenant_id() 
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role))
  );