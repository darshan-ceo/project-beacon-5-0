-- Phase 3: Replace RLS Policies for Dual Access Model

-- ============================================
-- 3.1 DROP EXISTING CLIENT POLICIES
-- ============================================
DROP POLICY IF EXISTS "Admins and Partners can view all clients" ON clients;
DROP POLICY IF EXISTS "Managers view clients based on data_scope" ON clients;
DROP POLICY IF EXISTS "CA and Advocate view clients based on data_scope" ON clients;
DROP POLICY IF EXISTS "Staff can view hierarchy case clients" ON clients;
DROP POLICY IF EXISTS "Users can manage clients in their tenant" ON clients;
DROP POLICY IF EXISTS "Managers can view all clients" ON clients;
DROP POLICY IF EXISTS "CAs and Advocates can view all clients" ON clients;
DROP POLICY IF EXISTS "Staff can view assigned case clients" ON clients;
DROP POLICY IF EXISTS "Users can view accessible clients" ON clients;
DROP POLICY IF EXISTS "Authorized users can create clients" ON clients;
DROP POLICY IF EXISTS "Authorized users can update clients" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;

-- ============================================
-- 3.2 CREATE NEW CLIENT POLICIES
-- ============================================

-- SELECT: Use can_user_view_client() helper function
CREATE POLICY "Users can view accessible clients"
ON clients FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND can_user_view_client(auth.uid(), id)
);

-- INSERT: Set owner_id to current user, role-based authorization
CREATE POLICY "Authorized users can create clients"
ON clients FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND owner_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner') 
    OR has_role(auth.uid(), 'manager') 
    OR has_role(auth.uid(), 'ca') 
    OR has_role(auth.uid(), 'advocate')
  )
);

-- UPDATE: Owner or Admin/Partner/Manager can update
CREATE POLICY "Authorized users can update clients"
ON clients FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (
    owner_id = auth.uid() 
    OR has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner') 
    OR has_role(auth.uid(), 'manager')
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id()
);

-- DELETE: Admin only
CREATE POLICY "Admins can delete clients"
ON clients FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'admin')
);

-- ============================================
-- 3.3 DROP EXISTING CONTACT POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON client_contacts;
DROP POLICY IF EXISTS "Authorized users can create contacts" ON client_contacts;
DROP POLICY IF EXISTS "Authorized users can update contacts" ON client_contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON client_contacts;
DROP POLICY IF EXISTS "Users can view accessible contacts" ON client_contacts;

-- ============================================
-- 3.4 CREATE NEW CONTACT POLICIES
-- ============================================

-- SELECT: Use can_user_view_contact() helper function
CREATE POLICY "Users can view accessible contacts"
ON client_contacts FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND can_user_view_contact(auth.uid(), id)
);

-- INSERT: Set owner_user_id to current user
CREATE POLICY "Authorized users can create contacts"
ON client_contacts FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
  AND owner_user_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner')
    OR has_role(auth.uid(), 'manager') 
    OR has_role(auth.uid(), 'ca')
    OR has_role(auth.uid(), 'advocate') 
    OR has_role(auth.uid(), 'staff')
  )
);

-- UPDATE: Owner or Admin/Partner/Manager can update
CREATE POLICY "Authorized users can update contacts"
ON client_contacts FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (
    owner_user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'partner') 
    OR has_role(auth.uid(), 'manager')
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id()
);

-- DELETE: Admin/Partner/Manager can delete
CREATE POLICY "Admins can delete contacts"
ON client_contacts FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'partner')
    OR has_role(auth.uid(), 'manager')
  )
);