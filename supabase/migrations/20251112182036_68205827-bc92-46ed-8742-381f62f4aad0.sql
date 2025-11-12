-- Create tags table for document tag definitions
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Users can view tags in their tenant
CREATE POLICY "Users can view tags in their tenant"
ON public.tags
FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Authorized users can create tags
CREATE POLICY "Authorized users can create tags"
ON public.tags
FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id() AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'ca'::app_role) OR
    has_role(auth.uid(), 'advocate'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'user'::app_role)
  )
);

-- Authorized users can update tags
CREATE POLICY "Authorized users can update tags"
ON public.tags
FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'partner'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Admins can delete tags
CREATE POLICY "Admins can delete tags"
ON public.tags
FOR DELETE
USING (
  tenant_id = get_user_tenant_id() AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON public.tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON public.tags(tenant_id, usage_count DESC);