-- Phase 1: Database Schema Changes for Dual Access Model

-- 1.1 Create Entity Data Scope Enum
DO $$ BEGIN
  CREATE TYPE entity_data_scope AS ENUM ('OWN', 'TEAM', 'ALL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1.2 Alter Clients Table - Add data_scope column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS data_scope entity_data_scope DEFAULT 'TEAM';

-- 1.3 Alter Client_Contacts Table
-- Add owner_user_id column
ALTER TABLE client_contacts
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);

-- Add data_scope column  
ALTER TABLE client_contacts
ADD COLUMN IF NOT EXISTS data_scope entity_data_scope DEFAULT 'TEAM';

-- Make client_id nullable (allow standalone contacts)
ALTER TABLE client_contacts
ALTER COLUMN client_id DROP NOT NULL;

-- 1.4 Update Existing Records

-- Set owner_user_id for existing contacts based on client owner
UPDATE client_contacts cc 
SET owner_user_id = (
  SELECT c.owner_id FROM clients c WHERE c.id = cc.client_id
)
WHERE cc.owner_user_id IS NULL AND cc.client_id IS NOT NULL;

-- For any remaining contacts without owner, set to first admin in tenant
UPDATE client_contacts cc
SET owner_user_id = (
  SELECT ur.user_id FROM user_roles ur
  JOIN profiles p ON p.id = ur.user_id
  WHERE p.tenant_id = cc.tenant_id AND ur.role = 'admin'
  LIMIT 1
)
WHERE cc.owner_user_id IS NULL;

-- Set default data_scope for existing records
UPDATE clients SET data_scope = 'TEAM' WHERE data_scope IS NULL;
UPDATE client_contacts SET data_scope = 'TEAM' WHERE data_scope IS NULL;

-- Phase 2: Create Helper Functions

-- 2.1 Client Access Evaluation Function
CREATE OR REPLACE FUNCTION can_user_view_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _client RECORD;
  _user_tenant UUID;
BEGIN
  -- Handle NULL client_id
  IF _client_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's tenant
  SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id;
  
  -- Get client details
  SELECT owner_id, data_scope, tenant_id INTO _client 
  FROM clients WHERE id = _client_id AND tenant_id = _user_tenant;
  
  -- Client not found in user's tenant
  IF _client IS NULL THEN 
    RETURN FALSE; 
  END IF;
  
  -- Admin/Partner always have access
  IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;
  
  -- Entity-level access rules:
  -- 1. User is owner
  IF _client.owner_id = _user_id THEN 
    RETURN TRUE; 
  END IF;
  
  -- 2. Client data_scope = 'ALL'
  IF _client.data_scope = 'ALL' THEN 
    RETURN TRUE; 
  END IF;
  
  -- 3. Client data_scope = 'TEAM' AND user is in owner's team
  IF _client.data_scope = 'TEAM' AND _client.owner_id IS NOT NULL AND is_in_same_team(_user_id, _client.owner_id) THEN
    RETURN TRUE;
  END IF;
  
  -- 4. Case-extended access: user has access to at least one linked case
  IF EXISTS (
    SELECT 1 FROM cases c 
    WHERE c.client_id = _client_id 
    AND c.tenant_id = _user_tenant
    AND can_user_view_case(_user_id, c.id)
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 2.2 Contact Access Evaluation Function
CREATE OR REPLACE FUNCTION can_user_view_contact(_user_id uuid, _contact_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _contact RECORD;
  _user_tenant UUID;
BEGIN
  -- Handle NULL contact_id
  IF _contact_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's tenant
  SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id;
  
  -- Get contact details
  SELECT owner_user_id, data_scope, client_id, tenant_id INTO _contact 
  FROM client_contacts WHERE id = _contact_id AND tenant_id = _user_tenant;
  
  -- Contact not found in user's tenant
  IF _contact IS NULL THEN 
    RETURN FALSE; 
  END IF;
  
  -- Admin/Partner always have access
  IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;
  
  -- Entity-level access rules:
  -- 1. User is owner
  IF _contact.owner_user_id = _user_id THEN 
    RETURN TRUE; 
  END IF;
  
  -- 2. Contact data_scope = 'ALL'
  IF _contact.data_scope = 'ALL' THEN 
    RETURN TRUE; 
  END IF;
  
  -- 3. Contact data_scope = 'TEAM' AND user is in owner's team
  IF _contact.data_scope = 'TEAM' AND _contact.owner_user_id IS NOT NULL AND is_in_same_team(_user_id, _contact.owner_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- 4. Contact linked to accessible client
  IF _contact.client_id IS NOT NULL AND can_user_view_client(_user_id, _contact.client_id) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION can_user_view_client IS 'Evaluates if user can view a client based on ownership, data_scope, team membership, or case-extended access';
COMMENT ON FUNCTION can_user_view_contact IS 'Evaluates if user can view a contact based on ownership, data_scope, team membership, or client-extended access';