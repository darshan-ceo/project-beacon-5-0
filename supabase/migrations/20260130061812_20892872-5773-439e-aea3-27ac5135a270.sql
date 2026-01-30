-- ============================================================
-- Data Scope Enforcement Fix for Partner Role
-- Partners now respect data_scope instead of getting blanket access
-- ============================================================

-- PHASE 1: Drop existing blanket partner access policies on cases
DROP POLICY IF EXISTS "Admin_Partner full case access" ON cases;
DROP POLICY IF EXISTS "Admins view all cases" ON cases;
DROP POLICY IF EXISTS "Admin full case access" ON cases;

-- PHASE 2: Create Admin-only full access policy (replaces combined admin/partner policy)
CREATE POLICY "Admin full case access" ON cases
FOR ALL TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'admin')
);

-- PHASE 3: Create data_scope aware policy for Partners
CREATE POLICY "Partner view cases based on data_scope" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'partner')
  AND (
    -- 'All Cases' scope - full org access
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    -- 'Team Cases' scope: own + hierarchy
    (get_employee_data_scope(auth.uid()) = 'Team Cases' 
     AND (assigned_to = auth.uid() 
          OR owner_id = auth.uid() 
          OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)))
    OR
    -- 'Own Cases' scope: only assigned or owned
    (get_employee_data_scope(auth.uid()) = 'Own Cases' 
     AND (assigned_to = auth.uid() OR owner_id = auth.uid()))
  )
);

-- PHASE 4: Create Partner INSERT/UPDATE/DELETE policies (respecting data_scope)
CREATE POLICY "Partner insert cases" ON cases
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'partner')
);

CREATE POLICY "Partner update cases based on data_scope" ON cases
FOR UPDATE TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'partner')
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR assigned_to = auth.uid()
    OR owner_id = auth.uid()
    OR (get_employee_data_scope(auth.uid()) = 'Team Cases' 
        AND can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'partner')
);

CREATE POLICY "Partner delete cases based on data_scope" ON cases
FOR DELETE TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'partner')
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR assigned_to = auth.uid()
    OR owner_id = auth.uid()
  )
);

-- PHASE 5: Update can_user_view_case() function to respect Partner data_scope
CREATE OR REPLACE FUNCTION public.can_user_view_case(_user_id uuid, _case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _case_record RECORD;
  _user_data_scope text;
  _user_tenant_id uuid;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO _user_tenant_id FROM profiles WHERE id = _user_id;
  IF _user_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's data_scope from employees table
  SELECT COALESCE(data_scope, 'Team Cases') INTO _user_data_scope FROM employees WHERE id = _user_id;
  
  -- Get the case
  SELECT id, tenant_id, assigned_to, owner_id, client_id INTO _case_record 
  FROM cases WHERE id = _case_id;
  
  -- Case not found
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Wrong tenant
  IF _case_record.tenant_id != _user_tenant_id THEN
    RETURN FALSE;
  END IF;
  
  -- CRITICAL FIX: Only Admin gets unconditional full access
  -- Partner now goes through normal data_scope logic
  IF has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- All Cases scope = full tenant access (applies to Partner and any other role)
  IF _user_data_scope = 'All Cases' THEN
    RETURN TRUE;
  END IF;
  
  -- Direct assignment or ownership (handle NULLs explicitly)
  IF (_case_record.assigned_to IS NOT NULL AND _case_record.assigned_to = _user_id) THEN
    RETURN TRUE;
  END IF;
  
  IF (_case_record.owner_id IS NOT NULL AND _case_record.owner_id = _user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Own Cases scope - only own cases allowed (already checked above)
  IF _user_data_scope = 'Own Cases' THEN
    RETURN FALSE;
  END IF;
  
  -- Team Cases scope - check hierarchy
  IF _user_data_scope = 'Team Cases' THEN
    -- Check if user can view via hierarchy (subordinates)
    IF can_view_case_by_hierarchy(_user_id, _case_record.assigned_to, _case_record.owner_id) THEN
      RETURN TRUE;
    END IF;
    
    -- Check if user can view client's cases
    IF _case_record.client_id IS NOT NULL AND can_user_view_client(_user_id, _case_record.client_id) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- PHASE 6: Update can_user_view_client() function to respect Partner data_scope
CREATE OR REPLACE FUNCTION public.can_user_view_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  _client RECORD;
  _user_tenant UUID;
  _user_data_scope TEXT;
BEGIN
  IF _client_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id;

  -- Get user's data_scope
  SELECT COALESCE(data_scope, 'Team Cases') INTO _user_data_scope FROM employees WHERE id = _user_id;

  -- Get client details
  SELECT owner_id, data_scope, tenant_id INTO _client
  FROM clients WHERE id = _client_id AND tenant_id = _user_tenant;

  IF _client IS NULL THEN
    RETURN FALSE;
  END IF;

  -- CRITICAL FIX: Only Admin gets unconditional full access
  -- Partner now goes through normal data_scope logic
  IF has_role(_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;

  -- User with 'All Cases' scope can see all clients in tenant
  IF _user_data_scope = 'All Cases' THEN
    RETURN TRUE;
  END IF;

  -- User owns the client
  IF _client.owner_id = _user_id THEN
    RETURN TRUE;
  END IF;

  -- Client is visible to all
  IF _client.data_scope = 'ALL' THEN
    RETURN TRUE;
  END IF;

  -- Client is visible to team - check if user is in same team as owner
  IF _client.data_scope = 'TEAM'
     AND _client.owner_id IS NOT NULL
     AND is_in_same_team(_user_id, _client.owner_id) THEN
    RETURN TRUE;
  END IF;

  -- Check if user can view subordinate work for client owner (hierarchy check without recursion)
  IF _client.owner_id IS NOT NULL 
     AND can_view_subordinate_tasks(_user_id, _client.owner_id) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has access to any case belonging to this client (Team Cases scope)
  IF _user_data_scope = 'Team Cases' THEN
    IF EXISTS (
      SELECT 1 FROM cases c
      WHERE c.client_id = _client_id
        AND c.tenant_id = _user_tenant
        AND (
          c.assigned_to = _user_id
          OR c.owner_id = _user_id
          OR can_view_case_by_hierarchy(_user_id, c.assigned_to, c.owner_id)
        )
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;