-- Migration: Fix RBAC role assignments and update employees RLS policies
-- This migration fixes incorrect role mappings and implements hierarchy-based access control

-- =====================================================
-- STEP 1: Fix existing user_roles entries
-- =====================================================

-- Fix Advocate employees who were incorrectly assigned 'manager' role
-- They should have 'advocate' role based on correct mapping
UPDATE user_roles ur
SET role = 'advocate'::app_role
FROM employees e
WHERE ur.user_id = e.id
AND e.role = 'Advocate'
AND ur.role = 'manager'
AND ur.is_active = true;

-- Fix CA employees who were incorrectly assigned 'admin' role  
-- They should have 'ca' role based on correct mapping
UPDATE user_roles ur
SET role = 'ca'::app_role
FROM employees e
WHERE ur.user_id = e.id
AND e.role = 'CA'
AND ur.role = 'admin'
AND ur.is_active = true;

-- Fix Partner employees who may have been assigned 'admin' instead of 'partner'
UPDATE user_roles ur
SET role = 'partner'::app_role
FROM employees e
WHERE ur.user_id = e.id
AND e.role = 'Partner'
AND ur.role = 'admin'
AND ur.is_active = true;

-- =====================================================
-- STEP 2: Drop overly permissive employees RLS policies
-- =====================================================

DROP POLICY IF EXISTS "All users can view employees in same tenant" ON employees;

-- =====================================================
-- STEP 3: Create hierarchy-based employees RLS policies
-- =====================================================

-- Policy: Users view employees based on role and hierarchy
-- Admin/Partner: See all employees in tenant
-- Manager: See all employees in tenant (for assignment purposes)
-- CA/Advocate: See all employees in tenant (for case assignment)
-- Staff/User: See own record + team members (same manager) + direct reports
CREATE POLICY "Users view employees based on hierarchy" ON employees
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (
    -- Admin/Partner can see all
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner')
    OR
    -- Managers can see all (for assignment purposes)
    has_role(auth.uid(), 'manager')
    OR
    -- CA/Advocate can see all employees (needed for case assignment dropdowns)
    has_role(auth.uid(), 'ca') 
    OR has_role(auth.uid(), 'advocate')
    OR
    -- Staff/User can only see own record, team members, and direct reports
    (
      (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user') OR has_role(auth.uid(), 'clerk'))
      AND (
        -- Own record
        id = auth.uid()
        OR
        -- Team members (same manager)
        is_in_same_team(auth.uid(), id)
        OR
        -- Direct reports
        reporting_to = auth.uid()
      )
    )
  )
);

-- =====================================================
-- STEP 4: Update cases RLS to properly respect data_scope
-- =====================================================

-- Drop existing overly broad case SELECT policies and create proper ones
DROP POLICY IF EXISTS "Users can view cases in their tenant" ON cases;

-- Create proper role-based case visibility policies
-- Admin/Partner: See all cases (data_scope doesn't apply, they always see all)
CREATE POLICY "Admins view all cases" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
);

-- Manager: View cases based on data_scope setting
CREATE POLICY "Managers view cases based on data_scope" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND has_role(auth.uid(), 'manager')
  AND (
    -- All Cases scope
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    -- Team Cases scope
    (
      get_employee_data_scope(auth.uid()) = 'Team Cases'
      AND (
        assigned_to = auth.uid()
        OR owner_id = auth.uid()
        OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
      )
    )
    OR
    -- Own Cases scope
    (
      get_employee_data_scope(auth.uid()) = 'Own Cases'
      AND (assigned_to = auth.uid() OR owner_id = auth.uid())
    )
  )
);

-- Staff/User: Always use hierarchy-based access (data_scope controls visibility within hierarchy)
-- Note: The existing "Staff can view hierarchy cases" policy should handle this