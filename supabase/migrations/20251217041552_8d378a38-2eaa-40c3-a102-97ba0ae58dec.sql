-- Step 1: Create helper function to get employee's data_scope with smart defaults
CREATE OR REPLACE FUNCTION public.get_employee_data_scope(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT data_scope FROM employees WHERE id = _user_id LIMIT 1),
    -- Default based on role: admin/partner get 'All Cases', others get 'Own Cases'
    CASE 
      WHEN has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN 'All Cases'
      ELSE 'Own Cases'
    END
  )
$$;

-- Step 2: Fix Cases Table RLS Policies
-- Drop existing role-specific SELECT policies that don't respect data_scope
DROP POLICY IF EXISTS "CA and Advocate can view all cases" ON cases;
DROP POLICY IF EXISTS "Staff can view cases with hierarchy access" ON cases;

-- Create new unified data_scope-aware policy for CA/Advocate
CREATE POLICY "CA and Advocate view cases based on data_scope" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (
    -- 'All Cases' scope
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    -- 'Team Cases' scope: own + hierarchy
    (get_employee_data_scope(auth.uid()) = 'Team Cases' 
     AND (assigned_to = auth.uid() 
          OR owner_id = auth.uid() 
          OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)))
    OR
    -- 'Own Cases' scope: only assigned or owned
    (get_employee_data_scope(auth.uid()) = 'Own Cases' 
     AND (assigned_to = auth.uid() OR owner_id = auth.uid()))
  )
);

-- Create new data_scope-aware policy for Staff/User roles
CREATE POLICY "Staff view cases based on data_scope" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user'))
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    (get_employee_data_scope(auth.uid()) = 'Team Cases'
     AND (assigned_to = auth.uid() 
          OR owner_id = auth.uid()
          OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)))
    OR
    (get_employee_data_scope(auth.uid()) = 'Own Cases'
     AND (assigned_to = auth.uid() OR owner_id = auth.uid()))
  )
);

-- Step 3: Fix Tasks Table RLS Policies
DROP POLICY IF EXISTS "CA and Advocate can view own tasks" ON tasks;

CREATE POLICY "CA and Advocate view tasks based on data_scope" ON tasks
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    (get_employee_data_scope(auth.uid()) = 'Team Cases'
     AND (assigned_to = auth.uid() 
          OR assigned_by = auth.uid()
          OR can_view_subordinate_tasks(auth.uid(), assigned_to)
          OR is_in_same_team(auth.uid(), assigned_to)))
    OR
    (get_employee_data_scope(auth.uid()) = 'Own Cases'
     AND (assigned_to = auth.uid() OR assigned_by = auth.uid()))
  )
);

-- Step 4: Fix Clients Table RLS Policies
DROP POLICY IF EXISTS "CAs and Advocates can view all clients" ON clients;

CREATE POLICY "CA and Advocate view clients based on data_scope" ON clients
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    id IN (
      SELECT client_id FROM cases 
      WHERE tenant_id = get_user_tenant_id()
      AND (
        (get_employee_data_scope(auth.uid()) = 'Team Cases'
         AND (assigned_to = auth.uid() OR owner_id = auth.uid() 
              OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)))
        OR
        (get_employee_data_scope(auth.uid()) = 'Own Cases'
         AND (assigned_to = auth.uid() OR owner_id = auth.uid()))
      )
    )
  )
);

-- Step 5: Fix Manager Policy to also respect data_scope
DROP POLICY IF EXISTS "Managers can view all clients" ON clients;

CREATE POLICY "Managers view clients based on data_scope" ON clients
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'manager')
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    id IN (
      SELECT client_id FROM cases 
      WHERE tenant_id = get_user_tenant_id()
      AND (
        (get_employee_data_scope(auth.uid()) = 'Team Cases'
         AND (assigned_to = auth.uid() OR owner_id = auth.uid()
              OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)))
        OR
        (get_employee_data_scope(auth.uid()) = 'Own Cases'
         AND (assigned_to = auth.uid() OR owner_id = auth.uid()))
      )
    )
  )
);