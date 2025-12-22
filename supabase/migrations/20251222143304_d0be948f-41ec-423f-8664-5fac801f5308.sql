-- Add missing head_client_id column to client_groups table
ALTER TABLE public.client_groups 
ADD COLUMN IF NOT EXISTS head_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for better JOIN performance
CREATE INDEX IF NOT EXISTS idx_client_groups_head_client_id ON public.client_groups(head_client_id);

-- Add trigger to auto-set tenant_id on clients insert if not provided
CREATE OR REPLACE FUNCTION public.set_tenant_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger to clients table
DROP TRIGGER IF EXISTS trigger_set_tenant_clients ON public.clients;
CREATE TRIGGER trigger_set_tenant_clients
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_on_insert();