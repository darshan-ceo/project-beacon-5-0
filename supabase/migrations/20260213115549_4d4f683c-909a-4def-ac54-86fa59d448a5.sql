-- Allow all authenticated tenant users to view employees for assignment dropdowns
CREATE POLICY "All tenant users can view employees for assignment"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id());