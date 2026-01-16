-- 1. Add context fields to tasks table for creation tracking
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS creation_stage_code varchar,
ADD COLUMN IF NOT EXISTS creation_reason varchar DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS task_category varchar,
ADD COLUMN IF NOT EXISTS sla_hours integer,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- 2. Add client visibility fields to task_messages table
ALTER TABLE public.task_messages 
ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);

-- 3. Create index for efficient client visibility queries
CREATE INDEX IF NOT EXISTS idx_task_messages_client_visible 
ON public.task_messages(task_id, is_client_visible) 
WHERE is_client_visible = true;

-- 4. Create index for creation reason queries
CREATE INDEX IF NOT EXISTS idx_tasks_creation_reason 
ON public.tasks(creation_reason);

-- 5. Update existing auto-generated tasks to set creation_reason
UPDATE public.tasks 
SET creation_reason = 'auto_bundle' 
WHERE (description ILIKE '%Auto-created from bundle%' OR description ILIKE '%Auto-generated%')
AND creation_reason IS NULL;

UPDATE public.tasks 
SET creation_reason = 'manual' 
WHERE creation_reason IS NULL;

-- 6. Add RLS policies for new columns
CREATE POLICY "Users can update client visibility on task messages"
ON public.task_messages
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);