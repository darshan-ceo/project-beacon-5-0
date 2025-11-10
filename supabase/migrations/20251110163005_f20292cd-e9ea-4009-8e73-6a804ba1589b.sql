-- Add missing columns to tasks table for complete task data model
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage VARCHAR(100),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS case_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS due_date_validated BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_case_number ON tasks(case_number);
CREATE INDEX IF NOT EXISTS idx_tasks_is_auto_generated ON tasks(is_auto_generated);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Add helpful column comments
COMMENT ON COLUMN tasks.assigned_by IS 'User ID who created/assigned this task';
COMMENT ON COLUMN tasks.stage IS 'Case stage when task was created';
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated time to complete (hours)';
COMMENT ON COLUMN tasks.is_auto_generated IS 'Whether task was auto-created by automation';
COMMENT ON COLUMN tasks.escalation_level IS 'Task escalation level (0=normal, 1+=escalated)';
COMMENT ON COLUMN tasks.tags IS 'Array of tags for task categorization';

-- Update RLS policy to include assigned_by in access checks
DROP POLICY IF EXISTS "Users can view tasks in their tenant" ON tasks;
CREATE POLICY "Users can view tasks in their tenant" ON tasks
  FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      assigned_to = auth.uid() 
      OR assigned_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'partner'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- Ensure INSERT policy allows setting assigned_by
DROP POLICY IF EXISTS "Users can create tasks in their tenant" ON tasks;
CREATE POLICY "Users can create tasks in their tenant" ON tasks
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND assigned_by = auth.uid()
  );

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update tasks in their tenant" ON tasks;
CREATE POLICY "Users can update tasks in their tenant" ON tasks
  FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      assigned_to = auth.uid()
      OR assigned_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'partner'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete tasks in their tenant" ON tasks;
CREATE POLICY "Users can delete tasks in their tenant" ON tasks
  FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      assigned_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'partner'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );