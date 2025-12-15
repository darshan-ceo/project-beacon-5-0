
-- =============================================
-- PHASE 1: FIX TASKS RLS POLICIES
-- =============================================

-- Drop existing overlapping task SELECT policies
DROP POLICY IF EXISTS "Users can view tasks with hierarchy access" ON tasks;

-- Admin/Partner/Manager: All tasks in tenant
CREATE POLICY "Admins and managers can view all tasks"
ON tasks FOR SELECT
USING (
  tenant_id = get_user_tenant_id() 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'partner'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- CA/Advocate: Only assigned or created tasks
CREATE POLICY "CA and Advocate can view own tasks"
ON tasks FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role))
  AND (assigned_to = auth.uid() OR assigned_by = auth.uid())
);

-- Staff: Assigned + Created + Team + Subordinates
CREATE POLICY "Staff can view tasks with hierarchy"
ON tasks FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role))
  AND (
    assigned_to = auth.uid() 
    OR assigned_by = auth.uid() 
    OR can_view_subordinate_tasks(auth.uid(), assigned_to) 
    OR is_in_same_team(auth.uid(), assigned_to)
  )
);

-- =============================================
-- PHASE 2: FIX CASES RLS POLICIES
-- =============================================

-- Drop overly permissive cases policy
DROP POLICY IF EXISTS "Users can view cases in their tenant" ON cases;

-- Ensure CA/Advocate can view all cases
CREATE POLICY "CA and Advocate can view all cases"
ON cases FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role))
);

-- =============================================
-- PHASE 3: FIX CLIENTS RLS POLICIES
-- =============================================

-- Drop existing Staff client policy
DROP POLICY IF EXISTS "Staff can view assigned case clients" ON clients;

-- Staff can view clients linked to hierarchy-visible cases
CREATE POLICY "Staff can view hierarchy case clients"
ON clients FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role))
  AND id IN (
    SELECT client_id FROM cases
    WHERE tenant_id = get_user_tenant_id()
    AND (
      assigned_to = auth.uid()
      OR owner_id = auth.uid()
      OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
    )
  )
);

-- =============================================
-- PHASE 4: FIX DOCUMENTS RLS POLICIES
-- =============================================

-- Drop existing CA/Advocate and Staff document policies
DROP POLICY IF EXISTS "CAs and Advocates can view case documents" ON documents;
DROP POLICY IF EXISTS "Staff can view assigned case documents" ON documents;

-- CA/Advocate: All documents in tenant (since they can see all cases)
CREATE POLICY "CA and Advocate can view all documents"
ON documents FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role))
);

-- Staff: Documents linked to visible cases via hierarchy
CREATE POLICY "Staff can view hierarchy case documents"
ON documents FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role))
  AND (
    uploaded_by = auth.uid()
    OR case_id IN (
      SELECT id FROM cases
      WHERE tenant_id = get_user_tenant_id()
      AND (
        assigned_to = auth.uid()
        OR owner_id = auth.uid()
        OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
      )
    )
    OR client_id IN (
      SELECT client_id FROM cases
      WHERE tenant_id = get_user_tenant_id()
      AND (
        assigned_to = auth.uid()
        OR owner_id = auth.uid()
        OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
      )
    )
  )
);
