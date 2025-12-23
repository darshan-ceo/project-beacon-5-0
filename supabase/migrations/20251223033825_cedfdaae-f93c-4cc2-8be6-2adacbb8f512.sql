-- Fix clients SELECT policy to allow admin/partner and owner bypass
DROP POLICY IF EXISTS "Users can view accessible clients" ON public.clients;
CREATE POLICY "Users can view accessible clients"
ON public.clients FOR SELECT
TO authenticated
USING (
  (tenant_id = get_user_tenant_id()) AND 
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role) OR
    owner_id = auth.uid() OR
    can_user_view_client(auth.uid(), id)
  )
);

-- Fix client_contacts SELECT policy to allow admin/partner and owner bypass
DROP POLICY IF EXISTS "Users can view accessible contacts" ON public.client_contacts;
CREATE POLICY "Users can view accessible contacts"
ON public.client_contacts FOR SELECT
TO authenticated
USING (
  (tenant_id = get_user_tenant_id()) AND 
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role) OR
    owner_user_id = auth.uid() OR
    can_user_view_contact(auth.uid(), id)
  )
);