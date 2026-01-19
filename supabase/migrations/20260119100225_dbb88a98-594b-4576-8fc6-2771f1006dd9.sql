-- Create employee_audit_history table for future detailed audit trail
-- This table will store field-level changes for employees (not exposed in UI yet)

CREATE TABLE IF NOT EXISTS public.employee_audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add indexes for common queries
  CONSTRAINT employee_audit_history_tenant_id_idx UNIQUE (id, tenant_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_employee_audit_history_employee_id ON public.employee_audit_history(employee_id);
CREATE INDEX idx_employee_audit_history_changed_at ON public.employee_audit_history(changed_at DESC);
CREATE INDEX idx_employee_audit_history_tenant_id ON public.employee_audit_history(tenant_id);

-- Enable RLS
ALTER TABLE public.employee_audit_history ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation (read-only for now)
CREATE POLICY "tenant_isolation_employee_audit_select" ON public.employee_audit_history
FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- Admin/Partner can view all audit history within tenant
CREATE POLICY "admin_partner_view_employee_audit" ON public.employee_audit_history
FOR SELECT TO authenticated
USING (
  public.is_admin_or_partner(auth.uid()) 
  AND tenant_id = public.get_user_tenant_id()
);

-- Insert policy - only system can insert (via triggers/functions)
CREATE POLICY "system_insert_employee_audit" ON public.employee_audit_history
FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Add comment for documentation
COMMENT ON TABLE public.employee_audit_history IS 'Stores field-level audit history for employee records. Prepared for future audit trail feature.';
