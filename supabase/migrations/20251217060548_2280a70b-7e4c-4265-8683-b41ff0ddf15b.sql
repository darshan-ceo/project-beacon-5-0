
-- =====================================================
-- OPTION B: Database-Level Access & Rights Enforcement
-- Using PL/pgSQL for proper type handling
-- =====================================================

-- Step 1: Create has_module_permission() function using PL/pgSQL
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM role_permissions rp
    JOIN user_roles ur ON rp.role = CAST(ur.role AS TEXT)
    JOIN permissions p ON rp.permission_key = p.key
    WHERE ur.user_id = _user_id 
    AND ur.is_active = true
    AND p.module = _module
    AND p.action = _action
  ) INTO _has_permission;
  
  RETURN COALESCE(_has_permission, false);
END;
$$;

-- Step 2: Fix Cases Table - Remove advocate/ca from overly permissive ALL policy
DROP POLICY IF EXISTS "Users can manage cases in their tenant" ON cases;

-- Recreate management policy for admin/partner/manager only
CREATE POLICY "Admin_Partner_Manager can manage all cases" ON cases
FOR ALL TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner') 
    OR has_role(auth.uid(), 'manager')
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner') 
    OR has_role(auth.uid(), 'manager')
  )
);

-- CA/Advocate INSERT policy
CREATE POLICY "CA_Advocate can create cases" ON cases
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND has_module_permission(auth.uid(), 'cases', 'create')
);

-- CA/Advocate UPDATE policy - only assigned/owned cases
CREATE POLICY "CA_Advocate can update assigned cases" ON cases
FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (assigned_to = auth.uid() OR owner_id = auth.uid())
  AND has_module_permission(auth.uid(), 'cases', 'update')
);

-- Step 3: Fix Employees Table - Enforce module permissions
DROP POLICY IF EXISTS "Users view employees based on hierarchy" ON employees;

-- Admin/Partner/Manager with employees read permission
CREATE POLICY "Admin_Partner_Manager view all employees" ON employees
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'))
  AND has_module_permission(auth.uid(), 'employees', 'read')
);

-- CA/Advocate with employees read permission
CREATE POLICY "CA_Advocate view employees with permission" ON employees
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND has_module_permission(auth.uid(), 'employees', 'read')
);

-- Staff/User/Clerk view based on hierarchy (always limited)
CREATE POLICY "Staff view employees based on hierarchy" ON employees
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user') OR has_role(auth.uid(), 'clerk'))
  AND (
    id = auth.uid() 
    OR is_in_same_team(auth.uid(), id) 
    OR reporting_to = auth.uid()
  )
);

-- Keep existing policy for employees to view own record (doesn't need permission)
CREATE POLICY "Users can always view own employee record" ON employees
FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  AND tenant_id = get_user_tenant_id()
);
