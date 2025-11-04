-- Fix Missing RLS on automation_rules table
-- Ensure RLS is enabled and policies are in place

-- Enable RLS on automation_rules (in case it's not enabled)
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can view automation rules in their tenant" ON automation_rules;
DROP POLICY IF EXISTS "Authorized users can manage automation rules" ON automation_rules;

-- Create policy for viewing automation rules (tenant-scoped)
CREATE POLICY "Users can view automation rules in their tenant"
ON automation_rules FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id());

-- Create policy for managing automation rules (admin/partner only)
CREATE POLICY "Authorized users can manage automation rules"
ON automation_rules FOR ALL TO authenticated
USING (
  tenant_id = get_user_tenant_id() AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  tenant_id = get_user_tenant_id() AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);