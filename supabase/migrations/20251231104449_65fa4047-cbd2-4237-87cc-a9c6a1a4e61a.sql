-- Fix can_view_case_by_hierarchy to include manager chain visibility (upward visibility)
-- This allows staff with "Team Cases" scope to see their manager's cases

CREATE OR REPLACE FUNCTION public.can_view_case_by_hierarchy(_user_id uuid, _case_assigned_to uuid, _case_owner_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT
    -- User is assigned to the case
    _case_assigned_to = _user_id
    OR
    -- Case assignee IS the user's direct manager (CRITICAL: upward visibility)
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = _user_id
        AND e.reporting_to = _case_assigned_to
    )
    OR
    -- Case owner IS the user's direct manager
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = _user_id
        AND e.reporting_to = _case_owner_id
    )
    OR
    -- Case assignee is user's manager's manager (2 levels up)
    EXISTS (
      SELECT 1 FROM employees e1
      JOIN employees e2 ON e1.reporting_to = e2.id
      WHERE e1.id = _user_id
        AND e2.reporting_to = _case_assigned_to
    )
    OR
    -- Case owner is user's manager's manager (2 levels up)
    EXISTS (
      SELECT 1 FROM employees e1
      JOIN employees e2 ON e1.reporting_to = e2.id
      WHERE e1.id = _user_id
        AND e2.reporting_to = _case_owner_id
    )
    OR
    -- Same team (same manager as case assignee)
    is_in_same_team(_user_id, _case_assigned_to)
    OR
    -- Can view subordinate's cases (downward visibility)
    can_view_subordinate_tasks(_user_id, _case_assigned_to)
$function$;