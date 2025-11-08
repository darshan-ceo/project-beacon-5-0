-- Phase 2: Employee PII Protection with Role-Based Access Control
-- Restricts access to employee personal information to authorized roles only

-- Drop the existing broad SELECT policy that allows all users to view employee data
DROP POLICY IF EXISTS "Users can view employees in their tenant" ON employees;

-- Policy 1: Admins and Partners can view all employee data in their tenant
-- These roles need full visibility for management and HR functions
CREATE POLICY "Admins and Partners can view all employees"
ON employees
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role)
  )
);

-- Policy 2: Managers can view all employee data in their tenant
-- Managers need access to team information for assignment and oversight
CREATE POLICY "Managers can view all employees"
ON employees
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Policy 3: Employees can view their own complete record
-- Self-access for personal information management
CREATE POLICY "Employees can view own record"
ON employees
FOR SELECT
USING (
  id = auth.uid() 
  AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Note: Other roles (CA, Advocate, Associate, Clerk) cannot access employee PII
-- They can only see basic info through employee selectors in the application
-- which should fetch minimal data (name, role, department) through authorized endpoints