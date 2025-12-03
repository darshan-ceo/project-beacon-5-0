
-- ============================================
-- STATUTORY DEADLINE AUTOMATION MODULE - PHASE 1
-- ============================================

-- Table: statutory_acts (Act Master - GST, ST, Tribunal, etc.)
CREATE TABLE public.statutory_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, code)
);

-- Table: statutory_event_types (Event Type Master with deadline rules)
CREATE TABLE public.statutory_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  act_id UUID NOT NULL REFERENCES public.statutory_acts(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  base_date_type VARCHAR(30) NOT NULL DEFAULT 'notice_date',
  deadline_type VARCHAR(20) NOT NULL DEFAULT 'days',
  deadline_count INTEGER NOT NULL DEFAULT 30,
  extension_allowed BOOLEAN DEFAULT false,
  max_extension_count INTEGER DEFAULT 0,
  extension_days INTEGER DEFAULT 0,
  legal_reference TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, act_id, code)
);

-- Table: holidays (Holiday Master for working day calculations)
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(30) DEFAULT 'national',
  state VARCHAR(50) DEFAULT 'ALL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, date, state)
);

-- Table: case_statutory_deadlines (Calculated deadlines for cases)
CREATE TABLE public.case_statutory_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES public.statutory_event_types(id) ON DELETE RESTRICT,
  base_date DATE NOT NULL,
  calculated_deadline DATE NOT NULL,
  extension_deadline DATE,
  extension_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  completed_date DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.statutory_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_statutory_deadlines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for statutory_acts
CREATE POLICY "Users can view statutory acts in their tenant"
ON public.statutory_acts FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage statutory acts"
ON public.statutory_acts FOR ALL
USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')))
WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));

-- RLS Policies for statutory_event_types
CREATE POLICY "Users can view statutory event types in their tenant"
ON public.statutory_event_types FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage statutory event types"
ON public.statutory_event_types FOR ALL
USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')))
WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));

-- RLS Policies for holidays
CREATE POLICY "Users can view holidays in their tenant"
ON public.holidays FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage holidays"
ON public.holidays FOR ALL
USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')))
WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));

-- RLS Policies for case_statutory_deadlines
CREATE POLICY "Users can view case deadlines in their tenant"
ON public.case_statutory_deadlines FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can manage case deadlines"
ON public.case_statutory_deadlines FOR ALL
USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')))
WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')));

-- Indexes for performance
CREATE INDEX idx_statutory_acts_tenant ON public.statutory_acts(tenant_id);
CREATE INDEX idx_statutory_event_types_tenant ON public.statutory_event_types(tenant_id);
CREATE INDEX idx_statutory_event_types_act ON public.statutory_event_types(act_id);
CREATE INDEX idx_holidays_tenant_date ON public.holidays(tenant_id, date);
CREATE INDEX idx_case_deadlines_case ON public.case_statutory_deadlines(case_id);
CREATE INDEX idx_case_deadlines_status ON public.case_statutory_deadlines(status);
CREATE INDEX idx_case_deadlines_deadline ON public.case_statutory_deadlines(calculated_deadline);

-- Update triggers
CREATE TRIGGER update_statutory_acts_updated_at
BEFORE UPDATE ON public.statutory_acts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_statutory_event_types_updated_at
BEFORE UPDATE ON public.statutory_event_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_case_statutory_deadlines_updated_at
BEFORE UPDATE ON public.case_statutory_deadlines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
