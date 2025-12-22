-- Fix persistent RLS recursion/permission errors by ensuring SECURITY DEFINER helpers bypass RLS internally
-- Adds `SET row_security = off` to helper functions commonly referenced by RLS policies.

BEGIN;

-- 1) Tenant resolver (often used by RLS policies; must not recurse on profiles RLS)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- 2) Team / hierarchy helpers
CREATE OR REPLACE FUNCTION public.is_in_same_team(_user_id uuid, _other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM employees e1
    JOIN employees e2 ON e1.reporting_to = e2.reporting_to
    WHERE e1.id = _user_id
      AND e2.id = _other_user_id
      AND e1.reporting_to IS NOT NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_subordinate_tasks(_viewer_id uuid, _assignee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    -- Viewer equals assignee (own tasks)
    _viewer_id = _assignee_id
    OR
    -- Viewer is direct manager of assignee
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = _assignee_id
        AND e.reporting_to = _viewer_id
    )
    OR
    -- Viewer is in manager chain (up to 3 levels)
    EXISTS (
      SELECT 1 FROM employees e1
      JOIN employees e2 ON e1.reporting_to = e2.id
      WHERE e1.id = _assignee_id
        AND e2.reporting_to = _viewer_id
    )
    OR
    EXISTS (
      SELECT 1 FROM employees e1
      JOIN employees e2 ON e1.reporting_to = e2.id
      JOIN employees e3 ON e2.reporting_to = e3.id
      WHERE e1.id = _assignee_id
        AND e3.reporting_to = _viewer_id
    )
$$;

CREATE OR REPLACE FUNCTION public.can_view_case_by_hierarchy(_user_id uuid, _case_assigned_to uuid, _case_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    -- User is assigned to the case
    _case_assigned_to = _user_id
    OR
    -- User's manager owns the case
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = _user_id
        AND e.reporting_to = _case_owner_id
    )
    OR
    -- Same team (same manager as case assignee)
    is_in_same_team(_user_id, _case_assigned_to)
    OR
    -- Can view subordinate's cases
    can_view_subordinate_tasks(_user_id, _case_assigned_to)
$$;

-- 3) Data scope resolver
CREATE OR REPLACE FUNCTION public.get_employee_data_scope(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT data_scope FROM employees WHERE id = _user_id LIMIT 1),
    CASE
      WHEN has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN 'All Cases'
      ELSE 'Own Cases'
    END
  )
$$;

-- 4) Entity access evaluators
CREATE OR REPLACE FUNCTION public.can_user_view_case(_user_id uuid, _case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _data_scope TEXT;
  _case_record RECORD;
  _user_tenant UUID;
BEGIN
  IF _case_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id;

  -- Get user's data scope
  _data_scope := get_employee_data_scope(_user_id);

  -- Get case details
  SELECT assigned_to, owner_id, tenant_id INTO _case_record
  FROM cases WHERE id = _case_id AND tenant_id = _user_tenant;

  IF _case_record IS NULL THEN
    RETURN FALSE;
  END IF;

  IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;

  IF _data_scope = 'All Cases' THEN
    RETURN TRUE;
  ELSIF _data_scope = 'Team Cases' THEN
    RETURN (
      _case_record.assigned_to = _user_id
      OR _case_record.owner_id = _user_id
      OR can_view_case_by_hierarchy(_user_id, _case_record.assigned_to, _case_record.owner_id)
    );
  ELSE
    RETURN (
      _case_record.assigned_to = _user_id
      OR _case_record.owner_id = _user_id
    );
  END IF;
END;
$$;

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

  IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;

  IF _client.owner_id = _user_id THEN
    RETURN TRUE;
  END IF;

  IF _client.data_scope = 'ALL' THEN
    RETURN TRUE;
  END IF;

  IF _client.data_scope = 'TEAM'
     AND _client.owner_id IS NOT NULL
     AND is_in_same_team(_user_id, _client.owner_id) THEN
    RETURN TRUE;
  END IF;

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

CREATE OR REPLACE FUNCTION public.can_user_view_contact(_user_id uuid, _contact_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  _contact RECORD;
  _user_tenant UUID;
BEGIN
  IF _contact_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id;

  -- Get contact details
  SELECT owner_user_id, data_scope, client_id, tenant_id INTO _contact
  FROM client_contacts WHERE id = _contact_id AND tenant_id = _user_tenant;

  IF _contact IS NULL THEN
    RETURN FALSE;
  END IF;

  IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;

  IF _contact.owner_user_id = _user_id THEN
    RETURN TRUE;
  END IF;

  IF _contact.data_scope = 'ALL' THEN
    RETURN TRUE;
  END IF;

  IF _contact.data_scope = 'TEAM'
     AND _contact.owner_user_id IS NOT NULL
     AND is_in_same_team(_user_id, _contact.owner_user_id) THEN
    RETURN TRUE;
  END IF;

  IF _contact.client_id IS NOT NULL
     AND can_user_view_client(_user_id, _contact.client_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 5) Ensure these functions are owned by postgres for consistent SECURITY DEFINER behavior
ALTER FUNCTION public.get_user_tenant_id() OWNER TO postgres;
ALTER FUNCTION public.is_in_same_team(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.can_view_subordinate_tasks(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.can_view_case_by_hierarchy(uuid, uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.get_employee_data_scope(uuid) OWNER TO postgres;
ALTER FUNCTION public.can_user_view_case(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.can_user_view_client(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.can_user_view_contact(uuid, uuid) OWNER TO postgres;

COMMIT;
