
-- Phase 1: Fix can_user_view_case to never return NULL
CREATE OR REPLACE FUNCTION public.can_user_view_case(_user_id uuid, _case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _case_record RECORD;
  _user_data_scope text;
  _user_tenant_id uuid;
BEGIN
  -- Get user's tenant and data scope
  SELECT tenant_id INTO _user_tenant_id FROM profiles WHERE id = _user_id;
  IF _user_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
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
  
  -- Admin/Partner always have access
  IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
    RETURN TRUE;
  END IF;
  
  -- All Cases scope = full tenant access
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

-- Phase 2: Fix cases RLS policies

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "Admin_Partner_Manager can manage all cases" ON public.cases;

-- Drop redundant manager SELECT policy
DROP POLICY IF EXISTS "Managers view cases based on data_scope" ON public.cases;

-- Create Admin/Partner full access policy
CREATE POLICY "Admin_Partner full case access" ON public.cases
FOR ALL USING (
  tenant_id = get_user_tenant_id() 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
)
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
);

-- Create Manager scoped SELECT policy
CREATE POLICY "Manager scoped case select" ON public.cases
FOR SELECT USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR (
      get_employee_data_scope(auth.uid()) = 'Team Cases' 
      AND (
        assigned_to = auth.uid() 
        OR (owner_id IS NOT NULL AND owner_id = auth.uid())
        OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
        OR (client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))
      )
    )
    OR (
      get_employee_data_scope(auth.uid()) = 'Own Cases' 
      AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid()))
    )
  )
);

-- Create Manager scoped INSERT policy
CREATE POLICY "Manager scoped case insert" ON public.cases
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
);

-- Create Manager scoped UPDATE policy
CREATE POLICY "Manager scoped case update" ON public.cases
FOR UPDATE USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR (
      get_employee_data_scope(auth.uid()) = 'Team Cases' 
      AND (
        assigned_to = auth.uid() 
        OR (owner_id IS NOT NULL AND owner_id = auth.uid())
        OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
      )
    )
    OR (
      get_employee_data_scope(auth.uid()) = 'Own Cases' 
      AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid()))
    )
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
);

-- Create Manager scoped DELETE policy
CREATE POLICY "Manager scoped case delete" ON public.cases
FOR DELETE USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
  AND (
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR (
      get_employee_data_scope(auth.uid()) = 'Team Cases' 
      AND (
        assigned_to = auth.uid() 
        OR (owner_id IS NOT NULL AND owner_id = auth.uid())
        OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
      )
    )
    OR (
      get_employee_data_scope(auth.uid()) = 'Own Cases' 
      AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid()))
    )
  )
);

-- Phase 3A: Fix tasks RLS policies for managers
DROP POLICY IF EXISTS "Admins and managers can view all tasks" ON public.tasks;

-- Phase 3B: Fix hearings RLS policies for managers
DROP POLICY IF EXISTS "Admin_Partner_Manager can manage hearings" ON public.hearings;

-- Create Admin/Partner full hearing access
CREATE POLICY "Admin_Partner full hearing access" ON public.hearings
FOR ALL USING (
  tenant_id = get_user_tenant_id() 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
)
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
);

-- Create Manager scoped hearing SELECT policy
CREATE POLICY "Manager scoped hearing select" ON public.hearings
FOR SELECT USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
  AND can_user_view_case(auth.uid(), case_id)
);

-- Create Manager scoped hearing INSERT policy
CREATE POLICY "Manager scoped hearing insert" ON public.hearings
FOR INSERT WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
  AND can_user_view_case(auth.uid(), case_id)
);

-- Create Manager scoped hearing UPDATE policy
CREATE POLICY "Manager scoped hearing update" ON public.hearings
FOR UPDATE USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
  AND can_user_view_case(auth.uid(), case_id)
)
WITH CHECK (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
);

-- Create Manager scoped hearing DELETE policy
CREATE POLICY "Manager scoped hearing delete" ON public.hearings
FOR DELETE USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
  AND can_user_view_case(auth.uid(), case_id)
);
