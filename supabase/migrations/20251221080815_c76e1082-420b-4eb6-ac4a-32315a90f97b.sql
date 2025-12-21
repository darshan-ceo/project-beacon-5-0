-- Create client_contacts table for storing contact information
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  emails JSONB DEFAULT '[]'::jsonb,
  phones JSONB DEFAULT '[]'::jsonb,
  roles TEXT[] DEFAULT '{}',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  source VARCHAR(50) DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups by client
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_client_contacts_tenant_id ON public.client_contacts(tenant_id);

-- Enable RLS
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view contacts in their tenant"
  ON public.client_contacts
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can create contacts"
  ON public.client_contacts
  FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id() AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate') OR has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "Authorized users can update contacts"
  ON public.client_contacts
  FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id() AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate') OR has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "Admins can delete contacts"
  ON public.client_contacts
  FOR DELETE
  USING (
    tenant_id = get_user_tenant_id() AND
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'))
  );

-- Trigger to update updated_at
CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();