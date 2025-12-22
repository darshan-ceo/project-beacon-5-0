-- Phase 5: Fix Document & Task Access Inheritance
-- Update RLS policies to use can_user_view_client() for proper client access

-- =====================================================
-- 5.1 UPDATE DOCUMENT RLS POLICIES
-- =====================================================

-- Drop existing policies that need updating
DROP POLICY IF EXISTS "CA and Advocate view case-linked documents" ON documents;
DROP POLICY IF EXISTS "Managers view documents based on data_scope" ON documents;
DROP POLICY IF EXISTS "Staff view hierarchy case documents" ON documents;

-- Recreate with proper client access inheritance
CREATE POLICY "CA and Advocate view case-linked documents" ON documents
FOR SELECT USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (
    -- Own uploads
    uploaded_by = auth.uid()
    -- Case-linked documents via case access
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Client-linked documents via client access (NEW: direct client check)
    OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))
  )
);

CREATE POLICY "Managers view documents based on data_scope" ON documents
FOR SELECT USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'manager')
  AND (
    -- Own uploads
    uploaded_by = auth.uid()
    -- Case-linked documents via case access
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Client-linked documents via client access (NEW: direct client check)
    OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))
  )
);

CREATE POLICY "Staff view hierarchy case documents" ON documents
FOR SELECT USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user'))
  AND (
    -- Own uploads
    uploaded_by = auth.uid()
    -- Case-linked documents via case access
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Client-linked documents via client access (NEW: direct client check)
    OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))
  )
);

-- =====================================================
-- 5.2 UPDATE TASK RLS POLICIES
-- =====================================================

-- Drop existing policies that need updating
DROP POLICY IF EXISTS "CA and Advocate view tasks based on data_scope" ON tasks;
DROP POLICY IF EXISTS "Staff view tasks with hierarchy" ON tasks;

-- Recreate with proper client access inheritance
CREATE POLICY "CA and Advocate view tasks based on data_scope" ON tasks
FOR SELECT USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (
    -- Own tasks (assigned to or assigned by)
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    -- Case-linked tasks via case access
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Client-linked tasks via client access (NEW: direct client check)
    OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))
    -- All tasks for users with 'All Cases' data scope
    OR (case_id IS NULL AND client_id IS NULL AND get_employee_data_scope(auth.uid()) = 'All Cases')
  )
);

CREATE POLICY "Staff view tasks with hierarchy" ON tasks
FOR SELECT USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user'))
  AND (
    -- Own tasks (assigned to or assigned by)
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    -- Subordinate tasks
    OR can_view_subordinate_tasks(auth.uid(), assigned_to)
    -- Same team tasks
    OR is_in_same_team(auth.uid(), assigned_to)
    -- Case-linked tasks via case access
    OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))
    -- Client-linked tasks via client access (NEW: direct client check)
    OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))
  )
);