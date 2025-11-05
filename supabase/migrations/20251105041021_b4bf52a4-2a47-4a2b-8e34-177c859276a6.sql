-- Phase 1: Critical Database Migrations
-- 1. Create client_groups table
-- 2. Add client_group_id to clients table
-- 3. Create system_settings table
-- 4. Fix timeline_compliance_trends view security_invoker

-- 1. Create client_groups table
CREATE TABLE IF NOT EXISTS public.client_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  total_clients INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, code)
);

-- Enable RLS on client_groups
ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_groups
CREATE POLICY "Users can view client groups in their tenant"
  ON public.client_groups
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can create client groups"
  ON public.client_groups
  FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'partner'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "Authorized users can update client groups"
  ON public.client_groups
  FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'partner'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "Admins can delete client groups"
  ON public.client_groups
  FOR DELETE
  USING (
    tenant_id = get_user_tenant_id() 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Create trigger for updated_at on client_groups
CREATE TRIGGER update_client_groups_updated_at
  BEFORE UPDATE ON public.client_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add client_group_id to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_group_id UUID REFERENCES public.client_groups(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_clients_client_group_id ON public.clients(client_group_id);

-- 3. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  category VARCHAR(50),
  is_encrypted BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, setting_key)
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_settings
CREATE POLICY "Users can view system settings in their tenant"
  ON public.system_settings
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (
    tenant_id = get_user_tenant_id() 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Create trigger for updated_at on system_settings
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Fix timeline_compliance_trends view security_invoker
-- Drop existing view
DROP VIEW IF EXISTS public.timeline_compliance_trends;

-- Recreate with security_invoker
CREATE VIEW public.timeline_compliance_trends
WITH (security_invoker = on)
AS
SELECT 
  tenant_id,
  date_trunc('month', hearing_date) as period,
  COUNT(*) as total_hearings,
  COUNT(*) FILTER (WHERE status = 'Completed') as completed_hearings,
  COUNT(*) FILTER (WHERE status = 'Adjourned') as adjourned_hearings,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'Completed')::numeric / 
    NULLIF(COUNT(*)::numeric, 0) * 100, 
    2
  ) as compliance_rate
FROM hearings
GROUP BY tenant_id, date_trunc('month', hearing_date);