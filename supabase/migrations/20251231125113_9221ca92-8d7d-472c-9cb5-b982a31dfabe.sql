-- Fix circular recursion: can_user_view_client() was calling can_user_view_case() which calls can_user_view_client()
-- Remove the recursive call and replace with direct hierarchy check

CREATE OR REPLACE FUNCTION public.can_user_view_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _client RECORD;
  _user_tenant UUID;
BEGIN
  IF _client_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id;

  -- Get client details
  SELECT owner_id, data_scope, tenant_id INTO _client
  FROM clients WHERE id = _client_id AND tenant_id = _user_tenant;

  IF _client IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Admin/Partner always have access
  IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
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

  RETURN FALSE;
END;
$$;