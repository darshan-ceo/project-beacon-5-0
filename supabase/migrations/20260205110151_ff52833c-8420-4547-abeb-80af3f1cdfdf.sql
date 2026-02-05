-- Migration: Add stage workflow tables for micro-workflow within legal stages

-- 1. Stage Notices - Multiple notices per stage with metadata
CREATE TABLE stage_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stage_instance_id UUID REFERENCES stage_instances(id),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  notice_type VARCHAR(50),
  notice_number VARCHAR(100),
  notice_date DATE,
  due_date DATE,
  amount_demanded NUMERIC,
  section_invoked VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Received',
  is_original BOOLEAN DEFAULT false,
  documents JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Stage Replies - Linked replies to notices
CREATE TABLE stage_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  notice_id UUID NOT NULL REFERENCES stage_notices(id) ON DELETE CASCADE,
  stage_instance_id UUID REFERENCES stage_instances(id),
  reply_date DATE,
  reply_reference VARCHAR(100),
  filing_status VARCHAR(50) DEFAULT 'Draft',
  documents JSONB DEFAULT '[]',
  notes TEXT,
  filed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Stage Workflow Steps - Track micro-workflow progress (4 steps per stage)
CREATE TABLE stage_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stage_instance_id UUID NOT NULL REFERENCES stage_instances(id) ON DELETE CASCADE,
  step_key VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stage_instance_id, step_key)
);

-- 4. Add stage_instance_id to hearings (backward compatible)
ALTER TABLE hearings 
  ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES stage_instances(id);

-- 5. Performance Indexes
CREATE INDEX idx_stage_notices_case ON stage_notices(case_id);
CREATE INDEX idx_stage_notices_instance ON stage_notices(stage_instance_id);
CREATE INDEX idx_stage_notices_tenant ON stage_notices(tenant_id);
CREATE INDEX idx_stage_replies_notice ON stage_replies(notice_id);
CREATE INDEX idx_stage_replies_instance ON stage_replies(stage_instance_id);
CREATE INDEX idx_stage_workflow_instance ON stage_workflow_steps(stage_instance_id);
CREATE INDEX idx_hearings_stage_instance ON hearings(stage_instance_id) WHERE stage_instance_id IS NOT NULL;

-- 6. Enable RLS
ALTER TABLE stage_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_workflow_steps ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for stage_notices
CREATE POLICY "stage_notices_select" ON stage_notices
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND (
      public.is_admin_or_partner(auth.uid())
      OR public.can_user_view_case(auth.uid(), case_id)
    )
  );

CREATE POLICY "stage_notices_insert" ON stage_notices
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.can_user_view_case(auth.uid(), case_id)
  );

CREATE POLICY "stage_notices_update" ON stage_notices
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.can_user_view_case(auth.uid(), case_id)
  );

CREATE POLICY "stage_notices_delete" ON stage_notices
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.is_admin_or_partner(auth.uid())
  );

-- 8. RLS Policies for stage_replies
CREATE POLICY "stage_replies_select" ON stage_replies
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY "stage_replies_insert" ON stage_replies
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY "stage_replies_update" ON stage_replies
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY "stage_replies_delete" ON stage_replies
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.is_admin_or_partner(auth.uid())
  );

-- 9. RLS Policies for stage_workflow_steps
CREATE POLICY "stage_workflow_steps_select" ON stage_workflow_steps
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY "stage_workflow_steps_insert" ON stage_workflow_steps
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY "stage_workflow_steps_update" ON stage_workflow_steps
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
  );

-- 10. Triggers for updated_at
CREATE TRIGGER handle_stage_notices_updated_at
  BEFORE UPDATE ON stage_notices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_stage_replies_updated_at
  BEFORE UPDATE ON stage_replies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_stage_workflow_steps_updated_at
  BEFORE UPDATE ON stage_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();