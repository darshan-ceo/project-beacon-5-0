-- Phase 1: Master Data Tables Migration from localStorage to Supabase

-- 1.1 Custom Cities Master Table
CREATE TABLE IF NOT EXISTS public.custom_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL,
  state_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, city_name, state_id)
);

ALTER TABLE public.custom_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom cities in their tenant"
  ON public.custom_cities FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can insert custom cities in their tenant"
  ON public.custom_cities FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete custom cities in their tenant"
  ON public.custom_cities FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- 1.2 Authority Levels Master Table
CREATE TABLE IF NOT EXISTS public.authority_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  allows_matter_types BOOLEAN DEFAULT false,
  requires_location BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE public.authority_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view authority levels in their tenant"
  ON public.authority_levels FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage authority levels"
  ON public.authority_levels FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

-- 1.3 Matter Types Master Table
CREATE TABLE IF NOT EXISTS public.matter_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  authority_level_id UUID REFERENCES authority_levels(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_location BOOLEAN DEFAULT false,
  location_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, authority_level_id, code)
);

ALTER TABLE public.matter_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view matter types in their tenant"
  ON public.matter_types FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage matter types"
  ON public.matter_types FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

-- 1.4 Custom Outcome Templates Table
CREATE TABLE IF NOT EXISTS public.custom_outcome_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  tasks JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, outcome_type)
);

ALTER TABLE public.custom_outcome_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outcome templates in their tenant"
  ON public.custom_outcome_templates FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage outcome templates"
  ON public.custom_outcome_templates FOR ALL
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

-- 1.5 Case Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.case_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  google_calendar BOOLEAN DEFAULT false,
  outlook BOOLEAN DEFAULT false,
  reminder_days INTEGER[] DEFAULT '{7,3,1}',
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, case_id)
);

ALTER TABLE public.case_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notification preferences for cases they can access"
  ON public.case_notification_preferences FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can manage notification preferences in their tenant"
  ON public.case_notification_preferences FOR ALL
  USING (tenant_id = public.get_user_tenant_id());

-- Add photo_path column to judges table for Supabase Storage migration
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_cities_tenant ON public.custom_cities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_cities_state ON public.custom_cities(state_id);
CREATE INDEX IF NOT EXISTS idx_authority_levels_tenant ON public.authority_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matter_types_authority ON public.matter_types(authority_level_id);
CREATE INDEX IF NOT EXISTS idx_outcome_templates_tenant ON public.custom_outcome_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_case ON public.case_notification_preferences(case_id);

-- Triggers for updated_at
CREATE TRIGGER update_authority_levels_updated_at
  BEFORE UPDATE ON public.authority_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matter_types_updated_at
  BEFORE UPDATE ON public.matter_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outcome_templates_updated_at
  BEFORE UPDATE ON public.custom_outcome_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON public.case_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();