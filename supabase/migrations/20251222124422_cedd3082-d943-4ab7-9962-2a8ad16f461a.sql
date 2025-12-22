-- Fix RLS INSERT policies to allow team assignment while keeping tenant + role security

-- clients: remove strict owner_id = auth.uid() check
DROP POLICY IF EXISTS "Authorized users can create clients" ON public.clients;

CREATE POLICY "Authorized users can create clients"
ON public.clients
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id()
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'partner'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'ca'::public.app_role)
    OR public.has_role(auth.uid(), 'advocate'::public.app_role)
  )
);

-- client_contacts: remove strict owner_user_id = auth.uid() check
DROP POLICY IF EXISTS "Authorized users can create contacts" ON public.client_contacts;

CREATE POLICY "Authorized users can create contacts"
ON public.client_contacts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id()
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'partner'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'ca'::public.app_role)
    OR public.has_role(auth.uid(), 'advocate'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  )
);