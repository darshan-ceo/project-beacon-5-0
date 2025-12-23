-- Add trigger to auto-set owner_id on clients if NULL
CREATE OR REPLACE FUNCTION public.set_client_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_client_owner_trigger ON public.clients;
CREATE TRIGGER set_client_owner_trigger
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_client_owner();

-- Add trigger to auto-set owner_user_id on client_contacts if NULL
CREATE OR REPLACE FUNCTION public.set_contact_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_user_id IS NULL THEN
    NEW.owner_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_contact_owner_trigger ON public.client_contacts;
CREATE TRIGGER set_contact_owner_trigger
  BEFORE INSERT ON public.client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_owner();