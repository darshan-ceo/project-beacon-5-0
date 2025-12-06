
-- Create task_messages table for conversation-style follow-ups
CREATE TABLE IF NOT EXISTS public.task_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Message content
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  
  -- Optional status update
  status_update VARCHAR(50),
  
  -- System message flag (for auto-generated messages)
  is_system_message BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by UUID,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_messages_task_id ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_created_at ON task_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_task_messages_tenant_id ON task_messages(tenant_id);

-- Enable RLS
ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view messages in their tenant"
  ON task_messages FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can create messages"
  ON task_messages FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own messages"
  ON task_messages FOR UPDATE
  USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete messages"
  ON task_messages FOR DELETE
  USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));

-- Add attachments column to tasks if not exists
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Add tags column to tasks if not exists
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Enable realtime for task_messages
ALTER PUBLICATION supabase_realtime ADD TABLE task_messages;

-- Create updated_at trigger for task_messages
CREATE TRIGGER update_task_messages_updated_at
  BEFORE UPDATE ON task_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
