-- Add missing DELETE policies for hearings (Admin and Partner)
CREATE POLICY "Admins can delete hearings"
ON public.hearings
FOR DELETE
TO authenticated
USING (
  (tenant_id = get_user_tenant_id()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Partners can delete hearings"
ON public.hearings
FOR DELETE
TO authenticated
USING (
  (tenant_id = get_user_tenant_id()) 
  AND has_role(auth.uid(), 'partner'::app_role)
);

-- Add missing DELETE policy for cases (Partner)
CREATE POLICY "Partners can delete cases"
ON public.cases
FOR DELETE
TO authenticated
USING (
  (tenant_id = get_user_tenant_id()) 
  AND has_role(auth.uid(), 'partner'::app_role)
);