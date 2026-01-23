-- Fix overly permissive RLS policies

-- Drop and recreate case_notification_preferences policies with proper checks
DROP POLICY IF EXISTS "Users can manage notification preferences in their tenant" ON public.case_notification_preferences;

CREATE POLICY "Users can insert notification preferences in their tenant"
  ON public.case_notification_preferences FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update notification preferences in their tenant"
  ON public.case_notification_preferences FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can delete notification preferences in their tenant"
  ON public.case_notification_preferences FOR DELETE
  USING (tenant_id = public.get_user_tenant_id());

-- Drop and recreate authority_levels policies with specific operations
DROP POLICY IF EXISTS "Admins can manage authority levels" ON public.authority_levels;

CREATE POLICY "Admins can insert authority levels"
  ON public.authority_levels FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins can update authority levels"
  ON public.authority_levels FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins can delete authority levels"
  ON public.authority_levels FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

-- Drop and recreate matter_types policies with specific operations
DROP POLICY IF EXISTS "Admins can manage matter types" ON public.matter_types;

CREATE POLICY "Admins can insert matter types"
  ON public.matter_types FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins can update matter types"
  ON public.matter_types FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins can delete matter types"
  ON public.matter_types FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

-- Drop and recreate custom_outcome_templates policies with specific operations
DROP POLICY IF EXISTS "Admins can manage outcome templates" ON public.custom_outcome_templates;

CREATE POLICY "Admins can insert outcome templates"
  ON public.custom_outcome_templates FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins can update outcome templates"
  ON public.custom_outcome_templates FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

CREATE POLICY "Admins can delete outcome templates"
  ON public.custom_outcome_templates FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));