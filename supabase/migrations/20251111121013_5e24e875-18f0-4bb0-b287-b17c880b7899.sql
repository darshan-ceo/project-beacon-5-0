-- Add CHECK constraint to enforce at least one association at database level
ALTER TABLE public.documents 
ADD CONSTRAINT documents_at_least_one_link 
CHECK (
  case_id IS NOT NULL OR 
  client_id IS NOT NULL OR 
  hearing_id IS NOT NULL OR 
  task_id IS NOT NULL OR 
  folder_id IS NOT NULL
);

-- Ensure tenant_id cannot be NULL (redundant but explicit for safety)
ALTER TABLE public.documents 
ALTER COLUMN tenant_id SET NOT NULL;