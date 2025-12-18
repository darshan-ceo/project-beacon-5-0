-- ============================================================================
-- Case-Inherited Access Control for Documents, Tasks & Hearings
-- ============================================================================
-- This migration enforces the principle that Documents, Tasks, and Hearings
-- visibility is strictly inherited from parent Case visibility scope.
-- ============================================================================

-- 1. Create helper function to check if user can view a specific case
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_user_view_case(_user_id UUID, _case_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _data_scope TEXT;
  _case_record RECORD;
  _user_tenant UUID;
BEGIN
  -- Handle NULL case_id
  IF _case_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's tenant
  SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id;
  
  -- Get user's data scope
  _data_scope := get_employee_data_scope(_user_id);
  
  -- Get case details
  SELECT assigned_to, owner_id, tenant_id INTO _case_record
  FROM cases WHERE id = _case_id AND tenant_id = _user_tenant;
  
  -- Case not found in user's tenant
  IF _case_record IS NULL THEN 
    RETURN FALSE; 
  END IF;
  
  -- Admin/Partner always have access
  IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on data_scope
  IF _data_scope = 'All Cases' THEN
    RETURN TRUE;
  ELSIF _data_scope = 'Team Cases' THEN
    RETURN (
      _case_record.assigned_to = _user_id
      OR _case_record.owner_id = _user_id
      OR can_view_case_by_hierarchy(_user_id, _case_record.assigned_to, _case_record.owner_id)
    );
  ELSE -- 'Own Cases' or default
    RETURN (
      _case_record.assigned_to = _user_id
      OR _case_record.owner_id = _user_id
    );
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_user_view_case(UUID, UUID) TO authenticated;

-- 2. Update Documents RLS Policies - Case-Inherited Access
-- ============================================================================

-- Drop existing policies that allow too broad access
DROP POLICY IF EXISTS "CA and Advocate can view all documents" ON documents;
DROP POLICY IF EXISTS "Managers can view all documents" ON documents;

-- Create new CA/Advocate policy: Documents visible only if case is visible or own uploads
CREATE POLICY "CA and Advocate view case-linked documents" ON documents
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (
    -- Can always see own uploads
    uploaded_by = auth.uid()
    -- Case-linked documents: only if case is visible
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Client-linked (no case): visible if ANY of user's visible cases has that client
    OR (case_id IS NULL AND client_id IS NOT NULL AND client_id IN (
      SELECT client_id FROM cases 
      WHERE tenant_id = get_user_tenant_id() 
      AND can_user_view_case(auth.uid(), id)
    ))
  )
);

-- Create new Manager policy with same pattern
CREATE POLICY "Managers view documents based on data_scope" ON documents
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'manager')
  AND (
    -- Can always see own uploads
    uploaded_by = auth.uid()
    -- Case-linked documents: only if case is visible
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Client-linked (no case): visible if ANY of user's visible cases has that client
    OR (case_id IS NULL AND client_id IS NOT NULL AND client_id IN (
      SELECT client_id FROM cases 
      WHERE tenant_id = get_user_tenant_id() 
      AND can_user_view_case(auth.uid(), id)
    ))
  )
);

-- Update Staff policy to enforce case visibility
DROP POLICY IF EXISTS "Staff can view hierarchy case documents" ON documents;
CREATE POLICY "Staff view hierarchy case documents" ON documents
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user'))
  AND (
    -- Own uploads always visible
    uploaded_by = auth.uid()
    -- Case-linked: only if case is visible
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Client-linked: visible if linked to visible case
    OR (case_id IS NULL AND client_id IS NOT NULL AND client_id IN (
      SELECT client_id FROM cases 
      WHERE tenant_id = get_user_tenant_id() 
      AND can_user_view_case(auth.uid(), id)
    ))
  )
);

-- 3. Update Tasks RLS Policies - Include Case Visibility Check
-- ============================================================================

-- Drop and recreate CA/Advocate task policy with case visibility
DROP POLICY IF EXISTS "CA and Advocate view tasks based on data_scope" ON tasks;
CREATE POLICY "CA and Advocate view tasks based on data_scope" ON tasks
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (
    -- Assigned to user
    assigned_to = auth.uid()
    -- Created by user
    OR assigned_by = auth.uid()
    -- Case-linked task: visible if case is visible
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Non-case tasks only for 'All Cases' scope
    OR (case_id IS NULL AND get_employee_data_scope(auth.uid()) = 'All Cases')
  )
);

-- Drop and recreate Staff task policy with case visibility
DROP POLICY IF EXISTS "Staff can view tasks with hierarchy" ON tasks;
CREATE POLICY "Staff view tasks with hierarchy" ON tasks
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user'))
  AND (
    -- Assigned to user
    assigned_to = auth.uid()
    -- Created by user
    OR assigned_by = auth.uid()
    -- Subordinate/team visibility
    OR can_view_subordinate_tasks(auth.uid(), assigned_to)
    OR is_in_same_team(auth.uid(), assigned_to)
    -- Case-linked task: visible if case is visible
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
  )
);

-- 4. Create Hearings RLS Policies - Case-Inherited Access
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view hearings in their tenant" ON hearings;

-- Admin/Partner: full access within tenant
CREATE POLICY "Admin and Partner view all hearings" ON hearings
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
);

-- CA/Advocate/Manager: hearings visible only if parent case is visible
CREATE POLICY "CA Advocate Manager view case-linked hearings" ON hearings
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate') OR has_role(auth.uid(), 'manager'))
  AND can_user_view_case(auth.uid(), case_id)
);

-- Staff/User: hearings visible only if parent case is visible via hierarchy
CREATE POLICY "Staff view hierarchy case hearings" ON hearings
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user'))
  AND can_user_view_case(auth.uid(), case_id)
);

-- 5. Add comment for documentation
-- ============================================================================
COMMENT ON FUNCTION public.can_user_view_case IS 
'Determines if a user can view a specific case based on their role and data_scope setting.
Used by RLS policies on documents, tasks, and hearings to enforce case-inherited access control.
Returns TRUE if the user has visibility to the case, FALSE otherwise.';