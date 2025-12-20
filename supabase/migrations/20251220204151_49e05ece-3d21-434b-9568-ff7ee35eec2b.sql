-- Drop the existing CHECK constraint
ALTER TABLE public.audit_log 
DROP CONSTRAINT IF EXISTS audit_log_action_type_check;

-- Add constraint with ALL action types including hearing and task actions
ALTER TABLE public.audit_log 
ADD CONSTRAINT audit_log_action_type_check 
CHECK (action_type::text = ANY (ARRAY[
  -- Document-related actions
  'upload'::text, 'update'::text, 'delete'::text, 
  'view'::text, 'download'::text, 'approve'::text, 
  'reject'::text, 'version_create'::text, 'share'::text, 
  'comment'::text,
  -- Auth/user actions
  'login'::text, 'logout'::text, 'signup'::text,
  -- Employee actions
  'create_employee'::text, 'update_employee'::text, 'delete_employee'::text,
  'assign_role'::text, 'revoke_role'::text,
  -- Case actions
  'create_case'::text, 'update_case'::text, 'delete_case'::text,
  -- Hearing actions
  'create_hearing'::text, 'update_hearing'::text, 'delete_hearing'::text,
  -- Task actions
  'create_task'::text, 'update_task'::text, 'delete_task'::text
]));