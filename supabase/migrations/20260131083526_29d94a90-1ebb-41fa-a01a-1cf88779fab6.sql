-- Fix: Add 'staff' role to clients INSERT policy
DROP POLICY IF EXISTS "Authorized users can create clients" ON public.clients;

CREATE POLICY "Authorized users can create clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (
  (tenant_id = get_user_tenant_id()) AND 
  (has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'partner'::app_role) OR 
   has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'ca'::app_role) OR 
   has_role(auth.uid(), 'advocate'::app_role) OR
   has_role(auth.uid(), 'staff'::app_role))
);