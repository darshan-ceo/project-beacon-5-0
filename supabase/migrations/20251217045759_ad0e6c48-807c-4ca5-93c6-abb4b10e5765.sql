-- Fix missing cases RLS policies for CA, Advocate, and Staff roles

-- CA/Advocate: View cases based on data_scope setting  
CREATE POLICY "CA_Advocate view cases based on data_scope" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  AND (
    -- All Cases scope
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    -- Team Cases scope
    (
      get_employee_data_scope(auth.uid()) = 'Team Cases'
      AND (
        assigned_to = auth.uid()
        OR owner_id = auth.uid()
        OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
      )
    )
    OR
    -- Own Cases scope
    (
      get_employee_data_scope(auth.uid()) = 'Own Cases'
      AND (assigned_to = auth.uid() OR owner_id = auth.uid())
    )
  )
);

-- Staff/User: View cases based on hierarchy (always hierarchy-based for staff)
CREATE POLICY "Staff view cases based on hierarchy" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user') OR has_role(auth.uid(), 'clerk'))
  AND (
    assigned_to = auth.uid()
    OR owner_id = auth.uid()
    OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
  )
);