-- Create escalation_rules table to persist rules
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN ('task_overdue', 'critical_sla', 'client_deadline', 'manual')),
  conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Create escalation_events table to track triggered events
CREATE TABLE IF NOT EXISTS public.escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES escalation_rules(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved', 'escalated')),
  assigned_to UUID REFERENCES profiles(id),
  escalated_to TEXT,
  current_level INTEGER DEFAULT 1,
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for escalation_rules
CREATE POLICY "Users can view escalation rules in their tenant"
  ON public.escalation_rules FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can manage escalation rules"
  ON public.escalation_rules FOR ALL
  USING (
    tenant_id = get_user_tenant_id() 
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'))
  );

-- RLS policies for escalation_events
CREATE POLICY "Users can view escalation events in their tenant"
  ON public.escalation_events FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can create escalation events"
  ON public.escalation_events FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can update escalation events"
  ON public.escalation_events FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR assigned_to = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_escalation_rules_tenant ON public.escalation_rules(tenant_id);
CREATE INDEX idx_escalation_rules_active ON public.escalation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_escalation_events_tenant ON public.escalation_events(tenant_id);
CREATE INDEX idx_escalation_events_task ON public.escalation_events(task_id);
CREATE INDEX idx_escalation_events_status ON public.escalation_events(status) WHERE status = 'pending';

-- Add trigger for updated_at
CREATE TRIGGER update_escalation_rules_updated_at
  BEFORE UPDATE ON public.escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();