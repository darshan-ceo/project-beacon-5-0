-- Create task_bundles table for task automation
CREATE TABLE IF NOT EXISTS task_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  stage_codes TEXT[],
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  last_used_at TIMESTAMPTZ
);

-- Create task_bundle_items table
CREATE TABLE IF NOT EXISTS task_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES task_bundles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  due_days INTEGER DEFAULT 7,
  assigned_role TEXT,
  order_index INTEGER NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create automation_rules table
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Create automation_logs table
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_data JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  actions_executed JSONB DEFAULT '[]',
  error_message TEXT,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE task_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_bundles
CREATE POLICY "Users can view task bundles in their tenant"
ON task_bundles FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can manage task bundles"
ON task_bundles FOR ALL
TO authenticated
USING (
  tenant_id = get_user_tenant_id() AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- RLS Policies for task_bundle_items
CREATE POLICY "Users can view task bundle items in their tenant"
ON task_bundle_items FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can manage task bundle items"
ON task_bundle_items FOR ALL
TO authenticated
USING (
  tenant_id = get_user_tenant_id() AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- RLS Policies for automation_rules
CREATE POLICY "Users can view automation rules in their tenant"
ON automation_rules FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can manage automation rules"
ON automation_rules FOR ALL
TO authenticated
USING (
  tenant_id = get_user_tenant_id() AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- RLS Policies for automation_logs
CREATE POLICY "Users can view automation logs in their tenant"
ON automation_logs FOR SELECT
TO authenticated
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can create automation logs"
ON automation_logs FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_user_tenant_id());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_bundles_tenant ON task_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_bundles_trigger ON task_bundles(trigger_event) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_task_bundle_items_bundle ON task_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_case ON automation_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_tenant ON automation_logs(tenant_id);

-- Create triggers for updated_at
CREATE TRIGGER update_task_bundles_updated_at
BEFORE UPDATE ON task_bundles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON automation_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();