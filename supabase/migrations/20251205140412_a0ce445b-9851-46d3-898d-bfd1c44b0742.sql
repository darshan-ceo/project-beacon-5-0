-- Allow all authenticated users in the same tenant to view employees
-- This enables task assignment dropdowns, team views, etc.
CREATE POLICY "All users can view employees in same tenant"
ON public.employees
FOR SELECT
USING (
  tenant_id IN (
    SELECT profiles.tenant_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  )
);