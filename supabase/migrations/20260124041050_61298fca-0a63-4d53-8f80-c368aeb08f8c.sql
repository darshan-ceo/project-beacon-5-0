-- Phase 2: Calendar Integrations Table for Settings Migration
-- Stores calendar provider settings per tenant (non-sensitive data only)

CREATE TABLE public.calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'none' CHECK (provider IN ('none', 'google', 'outlook')),
  auto_sync BOOLEAN DEFAULT false,
  reminder_time INTEGER DEFAULT 30,
  sync_interval INTEGER DEFAULT 60,
  default_calendar_id TEXT,
  user_email TEXT,
  connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('disconnected', 'connected', 'error', 'expired')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their tenant's calendar settings
CREATE POLICY "Users can view own tenant calendar settings"
  ON public.calendar_integrations FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Admins/Partners can manage calendar settings
CREATE POLICY "Admins can insert calendar settings"
  ON public.calendar_integrations FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins can update calendar settings"
  ON public.calendar_integrations FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins can delete calendar settings"
  ON public.calendar_integrations FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_calendar_integrations_updated_at
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for tenant lookups
CREATE INDEX idx_calendar_integrations_tenant ON public.calendar_integrations(tenant_id);