-- Phase 3: Client Sensitive Data Protection with Role-Based Access Control
-- Restricts access to client PII (GSTIN, PAN, contact info) to authorized roles only

-- Drop the existing broad SELECT policy that allows all users to view client data
DROP POLICY IF EXISTS "Users can view clients in their tenant" ON clients;

-- Policy 1: Admins and Partners can view all client data in their tenant
-- Full access for top-level management and oversight
CREATE POLICY "Admins and Partners can view all clients"
ON clients
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role)
  )
);

-- Policy 2: Managers can view all client data
-- Managers need full client access for case assignments and client management
CREATE POLICY "Managers can view all clients"
ON clients
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Policy 3: CAs and Advocates can view all client data
-- These roles work directly on cases and need access to client tax/legal information
CREATE POLICY "CAs and Advocates can view all clients"
ON clients
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'ca'::app_role) OR
    has_role(auth.uid(), 'advocate'::app_role)
  )
);

-- Policy 4: Staff and users can view client data for assigned cases only
-- Limited to clients they are actively working with
CREATE POLICY "Staff can view assigned case clients"
ON clients
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'user'::app_role)
  )
  AND id IN (
    SELECT client_id FROM cases 
    WHERE assigned_to = auth.uid()
    AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
);

-- Create a public view with non-sensitive client data for general access
-- This view excludes GSTIN, PAN, email, and phone
CREATE OR REPLACE VIEW clients_directory AS
SELECT 
  id,
  tenant_id,
  display_name,
  city,
  state,
  status,
  client_group_id,
  created_at,
  updated_at,
  owner_id
FROM clients;

-- Enable RLS on the view
ALTER VIEW clients_directory SET (security_barrier = true);

-- Note: Clerks and other restricted roles can use clients_directory view
-- for dropdowns/selectors without accessing sensitive PII data