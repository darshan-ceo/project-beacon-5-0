-- Create the 'employees' folder for all existing tenants
INSERT INTO public.document_folders (id, tenant_id, name, parent_id, case_id, description, path, created_by, is_default)
SELECT 
  'employees',
  t.id,
  'Employees',
  NULL,
  NULL,
  'Employee documents (resumes, ID proofs, etc.)',
  '/folders/employees',
  NULL,
  true
FROM public.tenants t
ON CONFLICT (id) DO NOTHING;