-- Create employees table extending profiles
CREATE TABLE public.employees (
  -- Primary key links to profiles.id (which links to auth.users.id)
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Core identification fields
  employee_code VARCHAR UNIQUE NOT NULL,
  email VARCHAR NOT NULL, -- For login (must match auth.users.email)
  
  -- Role and status
  role VARCHAR NOT NULL CHECK (role IN ('Partner', 'CA', 'Advocate', 'Manager', 'Staff', 'RM', 'Finance', 'Admin')),
  status VARCHAR DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  
  -- Contact information
  mobile VARCHAR,
  official_email VARCHAR,
  personal_email VARCHAR,
  alternate_contact VARCHAR,
  
  -- Address details
  current_address TEXT,
  permanent_address TEXT,
  city VARCHAR,
  state VARCHAR,
  pincode VARCHAR(6),
  
  -- Employment details
  department VARCHAR NOT NULL,
  designation VARCHAR,
  branch VARCHAR,
  employment_type VARCHAR DEFAULT 'Permanent' CHECK (employment_type IN ('Permanent', 'Contract', 'Intern', 'Consultant')),
  date_of_joining DATE,
  confirmation_date DATE,
  reporting_to UUID REFERENCES public.employees(id),
  manager_id UUID REFERENCES public.employees(id),
  weekly_off VARCHAR DEFAULT 'Sunday',
  work_shift VARCHAR DEFAULT 'Regular',
  workload_capacity INTEGER DEFAULT 40,
  
  -- Personal details
  profile_photo TEXT,
  gender VARCHAR,
  dob DATE,
  pan VARCHAR(10),
  aadhaar VARCHAR(14),
  blood_group VARCHAR(3),
  
  -- Professional credentials
  bar_council_no VARCHAR,
  icai_no VARCHAR,
  gst_practitioner_id VARCHAR,
  qualification VARCHAR,
  experience_years INTEGER,
  areas_of_practice TEXT[],
  university VARCHAR,
  graduation_year INTEGER,
  specialization TEXT[],
  
  -- Billing configuration
  billing_rate NUMERIC(10, 2) DEFAULT 0,
  billable BOOLEAN DEFAULT true,
  default_task_category VARCHAR,
  incentive_eligible BOOLEAN DEFAULT false,
  
  -- Access configuration
  module_access TEXT[],
  data_scope VARCHAR DEFAULT 'Team Cases' CHECK (data_scope IN ('Own Cases', 'Team Cases', 'All Cases')),
  ai_access BOOLEAN DEFAULT true,
  whatsapp_access BOOLEAN DEFAULT false,
  
  -- Documents (DMS references as JSONB)
  documents JSONB,
  
  -- Notes
  notes TEXT,
  
  -- Tenant association
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_code ON employees(employee_code);

-- Updated timestamp trigger
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Users can view employees in their tenant
CREATE POLICY "Users can view employees in their tenant"
  ON employees FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

-- Admins/Partners/Managers can create employees
CREATE POLICY "Authorized users can create employees"
  ON employees FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'partner'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- Admins/Partners/Managers can update employees
CREATE POLICY "Authorized users can update employees"
  ON employees FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'partner'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- Only admins can delete employees
CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );