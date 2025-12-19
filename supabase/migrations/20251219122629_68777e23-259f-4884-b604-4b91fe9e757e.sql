-- Fix Phase 2: Correct mismatched RBAC role assignments in user_roles table
-- This fixes the bug where edge function mapped roles incorrectly

-- Fix Advocate employees who incorrectly got 'manager' role
UPDATE public.user_roles 
SET role = 'advocate'
WHERE user_id IN (
  SELECT e.id FROM public.employees e 
  WHERE e.role = 'Advocate' AND LOWER(e.status) = 'active'
)
AND role = 'manager';

-- Fix Partner employees who incorrectly got 'admin' role (should be 'partner')
UPDATE public.user_roles 
SET role = 'partner'
WHERE user_id IN (
  SELECT e.id FROM public.employees e 
  WHERE e.role = 'Partner' AND LOWER(e.status) = 'active'
)
AND role = 'admin';

-- Fix CA employees who incorrectly got 'admin' role (should be 'ca')
UPDATE public.user_roles 
SET role = 'ca'
WHERE user_id IN (
  SELECT e.id FROM public.employees e 
  WHERE e.role = 'CA' AND LOWER(e.status) = 'active'
)
AND role = 'admin';

-- Add missing role entries for employees without any RBAC role
-- For Partner employees
INSERT INTO public.user_roles (user_id, role, granted_by, is_active)
SELECT e.id, 'partner'::app_role, e.id, true
FROM public.employees e
WHERE e.role = 'Partner' 
AND LOWER(e.status) = 'active'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'partner'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- For CA employees
INSERT INTO public.user_roles (user_id, role, granted_by, is_active)
SELECT e.id, 'ca'::app_role, e.id, true
FROM public.employees e
WHERE e.role = 'CA' 
AND LOWER(e.status) = 'active'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'ca'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- For Advocate employees
INSERT INTO public.user_roles (user_id, role, granted_by, is_active)
SELECT e.id, 'advocate'::app_role, e.id, true
FROM public.employees e
WHERE e.role = 'Advocate' 
AND LOWER(e.status) = 'active'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'advocate'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- For Manager employees
INSERT INTO public.user_roles (user_id, role, granted_by, is_active)
SELECT e.id, 'manager'::app_role, e.id, true
FROM public.employees e
WHERE e.role = 'Manager' 
AND LOWER(e.status) = 'active'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'manager'
)
ON CONFLICT (user_id, role) DO NOTHING;

-- For Staff employees
INSERT INTO public.user_roles (user_id, role, granted_by, is_active)
SELECT e.id, 'staff'::app_role, e.id, true
FROM public.employees e
WHERE e.role = 'Staff' 
AND LOWER(e.status) = 'active'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'staff'
)
ON CONFLICT (user_id, role) DO NOTHING;