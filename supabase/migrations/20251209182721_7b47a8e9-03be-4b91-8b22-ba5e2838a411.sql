-- First create the is_in_same_team function
CREATE OR REPLACE FUNCTION is_in_same_team(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM employees e1
    JOIN employees e2 ON e1.reporting_to = e2.reporting_to
    WHERE e1.id = _user_id 
    AND e2.id = _other_user_id
    AND e1.reporting_to IS NOT NULL
  )
$$;

-- Create the can_view_subordinate_tasks function
CREATE OR REPLACE FUNCTION can_view_subordinate_tasks(_viewer_id uuid, _assignee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Viewer equals assignee (own tasks)
    _viewer_id = _assignee_id
    OR
    -- Viewer is direct manager of assignee
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = _assignee_id
      AND e.reporting_to = _viewer_id
    )
    OR
    -- Viewer is in manager chain (up to 3 levels)
    EXISTS (
      SELECT 1 FROM employees e1
      JOIN employees e2 ON e1.reporting_to = e2.id
      WHERE e1.id = _assignee_id
      AND e2.reporting_to = _viewer_id
    )
    OR
    EXISTS (
      SELECT 1 FROM employees e1
      JOIN employees e2 ON e1.reporting_to = e2.id
      JOIN employees e3 ON e2.reporting_to = e3.id
      WHERE e1.id = _assignee_id
      AND e3.reporting_to = _viewer_id
    )
$$;

-- Now fix Task RLS Policy for Hierarchy-Based Access
DROP POLICY IF EXISTS "Users can view tasks in their tenant" ON tasks;

-- Create new hierarchy-based SELECT policy for tasks
CREATE POLICY "Users can view tasks with hierarchy access" ON tasks
FOR SELECT USING (
  tenant_id = get_user_tenant_id() 
  AND (
    -- Admin/Partner roles see all tasks in tenant
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role) OR
    -- Manager role sees all tasks
    has_role(auth.uid(), 'manager'::app_role) OR
    -- Directly assigned to user
    assigned_to = auth.uid() OR
    -- Created by user
    assigned_by = auth.uid() OR
    -- Hierarchy-based: can view subordinate tasks
    can_view_subordinate_tasks(auth.uid(), assigned_to) OR
    -- Same team: colleagues with same manager
    is_in_same_team(auth.uid(), assigned_to)
  )
);

-- Create helper function for case visibility
CREATE OR REPLACE FUNCTION can_view_case_by_hierarchy(_user_id uuid, _case_assigned_to uuid, _case_owner_id uuid) 
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User is assigned to the case
    _case_assigned_to = _user_id
    OR
    -- User's manager owns the case
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = _user_id
      AND e.reporting_to = _case_owner_id
    )
    OR
    -- Same team (same manager as case assignee)
    is_in_same_team(_user_id, _case_assigned_to)
    OR
    -- Can view subordinate's cases
    can_view_subordinate_tasks(_user_id, _case_assigned_to)
$$;

-- Update Staff case visibility policy to use hierarchy
DROP POLICY IF EXISTS "Staff can view assigned cases" ON cases;

CREATE POLICY "Staff can view cases with hierarchy access" ON cases
FOR SELECT USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role))
  AND (
    -- Directly assigned
    assigned_to = auth.uid() OR
    -- Owner of the case
    owner_id = auth.uid() OR
    -- Hierarchy-based access
    can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
  )
);