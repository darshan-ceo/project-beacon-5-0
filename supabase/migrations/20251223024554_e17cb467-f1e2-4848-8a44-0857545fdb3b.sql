-- Fix clients INSERT policy: Convert from RESTRICTIVE to PERMISSIVE
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
   has_role(auth.uid(), 'advocate'::app_role))
);

-- Fix client_contacts INSERT policy: Convert from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Authorized users can create contacts" ON public.client_contacts;
CREATE POLICY "Authorized users can create contacts"
ON public.client_contacts FOR INSERT
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