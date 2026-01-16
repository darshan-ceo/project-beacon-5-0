-- Drop the overly permissive policy and replace with tenant-scoped one
DROP POLICY IF EXISTS "Users can update client visibility on task messages" ON public.task_messages;

-- Create properly scoped policy for updating task messages (including client visibility)
CREATE POLICY "Users can update task messages in their tenant"
ON public.task_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.tenant_id = task_messages.tenant_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.tenant_id = task_messages.tenant_id
  )
);