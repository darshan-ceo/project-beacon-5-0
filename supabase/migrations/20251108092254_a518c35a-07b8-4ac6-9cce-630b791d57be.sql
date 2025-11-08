-- Phase 5: Document Access Control - Role-Based Policies
-- Restricts document access based on roles, case ownership, and assignments

-- Drop the existing broad SELECT policy
DROP POLICY IF EXISTS "Users can view documents in their tenant" ON documents;

-- Policy 1: Admins and Partners can view all documents in their tenant
-- Full visibility for top-level management and oversight
CREATE POLICY "Admins and Partners can view all documents"
ON documents
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role)
  )
);

-- Policy 2: Managers can view all documents
-- Managers need full document access for case oversight and management
CREATE POLICY "Managers can view all documents"
ON documents
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'manager'::app_role)
);

-- Policy 3: CAs and Advocates can view documents for assigned/owned cases
-- Access to documents related to cases they work on
CREATE POLICY "CAs and Advocates can view case documents"
ON documents
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'ca'::app_role) OR
    has_role(auth.uid(), 'advocate'::app_role)
  )
  AND (
    -- Documents linked to cases they're assigned to or own
    case_id IN (
      SELECT id FROM cases 
      WHERE (assigned_to = auth.uid() OR owner_id = auth.uid())
      AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
    -- Or documents linked to clients they manage
    OR client_id IN (
      SELECT client_id FROM cases
      WHERE (assigned_to = auth.uid() OR owner_id = auth.uid())
      AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
    -- Or documents they uploaded
    OR uploaded_by = auth.uid()
  )
);

-- Policy 4: Staff and Users can view documents for their assigned cases
-- Limited to documents directly related to their work
CREATE POLICY "Staff can view assigned case documents"
ON documents
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'user'::app_role)
  )
  AND (
    -- Documents for cases they're assigned to
    case_id IN (
      SELECT id FROM cases 
      WHERE assigned_to = auth.uid()
      AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
    -- Or documents they uploaded themselves
    OR uploaded_by = auth.uid()
  )
);

-- Policy 5: Clerks can only view documents they uploaded
-- Very restricted access - clerks typically handle administrative tasks
CREATE POLICY "Clerks can view own uploaded documents"
ON documents
FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'clerk'::app_role)
  AND uploaded_by = auth.uid()
);

-- Update the INSERT policy to be more explicit about who can upload
DROP POLICY IF EXISTS "Users can upload documents" ON documents;

CREATE POLICY "Authorized users can upload documents"
ON documents
FOR INSERT
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND uploaded_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'ca'::app_role) OR
    has_role(auth.uid(), 'advocate'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'user'::app_role) OR
    has_role(auth.uid(), 'clerk'::app_role)
  )
);

-- Update the UPDATE policy to be more granular
DROP POLICY IF EXISTS "Users can update their own documents or with permission" ON documents;

CREATE POLICY "Authorized users can update documents"
ON documents
FOR UPDATE
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    -- Admins and Partners can update any document
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role) OR
    -- Managers can update any document
    has_role(auth.uid(), 'manager'::app_role) OR
    -- Others can only update their own uploads
    (uploaded_by = auth.uid() AND (
      has_role(auth.uid(), 'ca'::app_role) OR
      has_role(auth.uid(), 'advocate'::app_role) OR
      has_role(auth.uid(), 'staff'::app_role) OR
      has_role(auth.uid(), 'user'::app_role) OR
      has_role(auth.uid(), 'clerk'::app_role)
    ))
  )
);

-- Keep the existing DELETE policy as-is (Admins and Partners only)
-- This is already restrictive and appropriate

-- Add table comment documenting the access control model
COMMENT ON TABLE documents IS 
'Document storage with role-based access control.
- Admins/Partners/Managers: Full access to all documents
- CAs/Advocates: Access to documents for assigned cases and clients
- Staff/Users: Access to documents for assigned cases only
- Clerks: Access to only their own uploaded documents
Access is further restricted by tenant isolation.';

-- Add column comments for security-relevant fields
COMMENT ON COLUMN documents.uploaded_by IS 
'User who uploaded the document. Used for ownership-based access control.';

COMMENT ON COLUMN documents.case_id IS 
'Associated case. Used to determine document access based on case assignments.';

COMMENT ON COLUMN documents.client_id IS 
'Associated client. Used to determine document access for client-related files.';