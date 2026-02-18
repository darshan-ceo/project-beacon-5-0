-- =============================================
-- Beacon Database - Master Schema
-- Generated: 2026-02-18
-- Migrations: 148 files combined in chronological order
-- =============================================
-- Usage:
--   createdb beacon_local
--   psql -U postgres -d beacon_local -f master-schema.sql
--   psql -U postgres -d beacon_local -f sql-dump-2026-02-18.sql
-- =============================================

-- =============================================
-- Migration: 20251102124158 - Core Enums and Multi-Tenant Foundation
-- =============================================
CREATE TYPE app_role AS ENUM (
  'partner', 'admin', 'manager', 'ca', 'advocate', 'staff', 'clerk', 'client'
);

CREATE TYPE license_tier AS ENUM (
  'trial', 'basic', 'professional', 'enterprise'
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  license_key VARCHAR(255) UNIQUE NOT NULL,
  license_tier license_tier NOT NULL DEFAULT 'trial',
  max_users INTEGER DEFAULT 5,
  max_cases INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = TRUE
  )
$$;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  designation VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage tenants"
  ON tenants FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins and partners can manage roles"
  ON user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'));

CREATE POLICY "Users can view profiles in their tenant"
  ON profiles FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles in their tenant"
  ON profiles FOR ALL
  USING (
    has_role(auth.uid(), 'admin') AND
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251102124250 - Fix function search_path
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================
-- Migration: 20251102124404 - Core Entities
-- =============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  gstin VARCHAR(15),
  pan VARCHAR(10),
  email VARCHAR(255),
  phone VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Gujarat',
  status VARCHAR(20) DEFAULT 'active',
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  case_number VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  stage_code VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'Medium',
  assigned_to UUID REFERENCES auth.users(id),
  owner_id UUID REFERENCES auth.users(id),
  notice_type VARCHAR(100),
  notice_no VARCHAR(100),
  notice_date DATE,
  tax_demand NUMERIC(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, case_number)
);

CREATE TABLE hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  hearing_date TIMESTAMPTZ NOT NULL,
  court_name VARCHAR(255),
  judge_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Scheduled',
  notes TEXT,
  outcome TEXT,
  next_hearing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  hearing_id UUID REFERENCES hearings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'Open',
  priority VARCHAR(20) DEFAULT 'Medium',
  due_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients in their tenant"
  ON clients FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage clients in their tenant"
  ON clients FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Users can view cases in their tenant"
  ON cases FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage cases in their tenant"
  ON cases FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))
  );

CREATE POLICY "Users can view hearings in their tenant"
  ON hearings FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage hearings in their tenant"
  ON hearings FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'advocate'))
  );

CREATE POLICY "Users can view tasks in their tenant"
  ON tasks FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage tasks in their tenant"
  ON tasks FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR assigned_to = auth.uid())
  );

CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_clients_gstin ON clients(gstin);
CREATE INDEX idx_cases_tenant_id ON cases(tenant_id);
CREATE INDEX idx_cases_client_id ON cases(client_id);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX idx_hearings_tenant_id ON hearings(tenant_id);
CREATE INDEX idx_hearings_case_id ON hearings(case_id);
CREATE INDEX idx_hearings_date ON hearings(hearing_date);
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_case_id ON tasks(case_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hearings_updated_at
  BEFORE UPDATE ON hearings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251102124514 - Document Management System
-- =============================================
CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  description TEXT,
  path TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  storage_url TEXT,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  hearing_id UUID REFERENCES hearings(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  category VARCHAR(50) CHECK (category IN ('Notice', 'Reply', 'Adjournment', 'Order', 'Submission', 'Miscellaneous')),
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  role VARCHAR(20),
  upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
  remarks TEXT,
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT TRUE,
  parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_status VARCHAR(20) DEFAULT 'Pending' CHECK (document_status IN ('Pending', 'Approved', 'Rejected')),
  reviewer_id UUID REFERENCES auth.users(id),
  review_date TIMESTAMPTZ,
  review_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT at_least_one_link CHECK (
    case_id IS NOT NULL OR hearing_id IS NOT NULL OR task_id IS NOT NULL OR client_id IS NOT NULL
  )
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  version_no INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
  change_notes TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  UNIQUE(document_id, version_no)
);

CREATE TABLE document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, tag)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'upload', 'update', 'delete', 'view', 'download', 'approve', 'reject', 'version_create', 'share', 'comment'
  )),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  details JSONB
);

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view folders in their tenant" ON document_folders FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage folders in their tenant" ON document_folders FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Users can view documents in their tenant" ON documents FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can upload documents" ON documents FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their own documents or with permission" ON documents FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Admins can delete documents" ON documents FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Users can view document versions in their tenant" ON document_versions FOR SELECT
  USING (document_id IN (SELECT id FROM documents WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "System can create versions" ON document_versions FOR INSERT
  WITH CHECK (document_id IN (SELECT id FROM documents WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "Users can view document tags in their tenant" ON document_tags FOR SELECT
  USING (document_id IN (SELECT id FROM documents WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "Users can manage document tags" ON document_tags FOR ALL
  USING (document_id IN (SELECT id FROM documents WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "Users can view audit logs in their tenant" ON audit_log FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "System can create audit logs" ON audit_log FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX idx_document_folders_tenant_id ON document_folders(tenant_id);
CREATE INDEX idx_document_folders_parent_id ON document_folders(parent_id);
CREATE INDEX idx_document_folders_case_id ON document_folders(case_id);
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_case_id ON documents(case_id);
CREATE INDEX idx_documents_hearing_id ON documents(hearing_id);
CREATE INDEX idx_documents_task_id ON documents(task_id);
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_status ON documents(document_status);
CREATE INDEX idx_documents_version ON documents(version, is_latest_version);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version_no ON document_versions(version_no);
CREATE INDEX idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag ON document_tags(tag);
CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_document_id ON audit_log(document_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);

CREATE TRIGGER update_document_folders_updated_at BEFORE UPDATE ON document_folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251102124608 - Analytics Views and Helper Functions
-- =============================================
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION check_tenant_limits(_tenant_id UUID, _limit_type TEXT)
RETURNS BOOLEAN LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE _tenant tenants; _current_count INTEGER;
BEGIN
  SELECT * INTO _tenant FROM tenants WHERE id = _tenant_id;
  IF NOT _tenant.is_active THEN RETURN FALSE; END IF;
  CASE _limit_type
    WHEN 'users' THEN SELECT COUNT(*) INTO _current_count FROM profiles WHERE tenant_id = _tenant_id; RETURN _current_count < _tenant.max_users;
    WHEN 'cases' THEN SELECT COUNT(*) INTO _current_count FROM cases WHERE tenant_id = _tenant_id; RETURN _current_count < _tenant.max_cases;
    ELSE RETURN TRUE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public
AS $$
DECLARE _default_tenant_id UUID;
BEGIN
  _default_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  IF _default_tenant_id IS NOT NULL THEN
    INSERT INTO profiles (id, tenant_id, full_name, phone)
    VALUES (NEW.id, _default_tenant_id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE VIEW documents_by_user AS
SELECT d.tenant_id, d.uploaded_by, p.full_name as uploader_name, COUNT(*) as total_documents,
  SUM(d.file_size) as total_storage_bytes,
  COUNT(*) FILTER (WHERE d.document_status = 'Approved') as approved_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Pending') as pending_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Rejected') as rejected_count
FROM documents d LEFT JOIN profiles p ON d.uploaded_by = p.id WHERE d.is_latest_version = TRUE
GROUP BY d.tenant_id, d.uploaded_by, p.full_name;

CREATE OR REPLACE VIEW documents_by_category AS
SELECT d.tenant_id, d.category, COUNT(*) as document_count, SUM(d.file_size) as total_size_bytes,
  AVG(d.file_size) as avg_file_size_bytes, COUNT(DISTINCT d.case_id) as unique_cases
FROM documents d WHERE d.is_latest_version = TRUE GROUP BY d.tenant_id, d.category;

CREATE OR REPLACE VIEW storage_usage_by_tenant AS
SELECT t.id as tenant_id, t.name as tenant_name, t.license_tier, t.max_storage_gb,
  COUNT(DISTINCT d.id) as total_documents, SUM(d.file_size) as storage_used_bytes,
  ROUND((SUM(d.file_size) / (t.max_storage_gb * 1073741824.0))::numeric * 100, 2) as storage_used_percentage,
  (t.max_storage_gb * 1073741824) - COALESCE(SUM(d.file_size), 0) as storage_remaining_bytes
FROM tenants t LEFT JOIN documents d ON t.id = d.tenant_id AND d.is_latest_version = TRUE
GROUP BY t.id, t.name, t.license_tier, t.max_storage_gb;

CREATE OR REPLACE VIEW case_activity_summary AS
SELECT c.id as case_id, c.tenant_id, c.case_number, c.title, c.status,
  COUNT(DISTINCT d.id) as document_count, COUNT(DISTINCT h.id) as hearing_count,
  COUNT(DISTINCT t.id) as task_count, MAX(d.upload_timestamp) as last_document_date,
  MAX(h.hearing_date) as last_hearing_date, MAX(t.updated_at) as last_task_update
FROM cases c LEFT JOIN documents d ON c.id = d.case_id LEFT JOIN hearings h ON c.id = h.case_id
LEFT JOIN tasks t ON c.id = t.case_id GROUP BY c.id, c.tenant_id, c.case_number, c.title, c.status;

CREATE OR REPLACE VIEW pending_review_documents AS
SELECT d.id, d.tenant_id, d.file_name, d.category, d.uploaded_by, p.full_name as uploader_name,
  d.upload_timestamp, EXTRACT(DAY FROM NOW() - d.upload_timestamp) as days_pending,
  c.case_number, c.title as case_title
FROM documents d LEFT JOIN profiles p ON d.uploaded_by = p.id LEFT JOIN cases c ON d.case_id = c.id
WHERE d.document_status = 'Pending' AND d.is_latest_version = TRUE ORDER BY d.upload_timestamp ASC;

-- =============================================
-- Migration: 20251102130017 - Storage bucket and handle_new_user update
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg','image/png','image/jpg','text/plain']);

CREATE POLICY "Users can upload to their tenant folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their tenant documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Document owner or admins can update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  AND (owner = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Admins and partners can delete documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _default_tenant_id UUID; _is_first_user BOOLEAN;
BEGIN
  _default_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  IF _default_tenant_id IS NOT NULL THEN
    SELECT NOT EXISTS (SELECT 1 FROM profiles WHERE tenant_id = _default_tenant_id) INTO _is_first_user;
    INSERT INTO profiles (id, tenant_id, full_name, phone) VALUES (NEW.id, _default_tenant_id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');
    INSERT INTO user_roles (user_id, role, granted_by) VALUES (NEW.id, CASE WHEN _is_first_user THEN 'admin'::app_role ELSE 'user'::app_role END, NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

-- =============================================
-- Migration: 20251102134656 - Add 'user' enum value
-- =============================================
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'user';

-- =============================================
-- Migration: 20251102142843 - Employees table
-- =============================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_code VARCHAR UNIQUE NOT NULL,
  email VARCHAR NOT NULL,
  role VARCHAR NOT NULL CHECK (role IN ('Partner', 'CA', 'Advocate', 'Manager', 'Staff', 'RM', 'Finance', 'Admin')),
  status VARCHAR DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  mobile VARCHAR, official_email VARCHAR, personal_email VARCHAR, alternate_contact VARCHAR,
  current_address TEXT, permanent_address TEXT, city VARCHAR, state VARCHAR, pincode VARCHAR(6),
  department VARCHAR NOT NULL, designation VARCHAR, branch VARCHAR,
  employment_type VARCHAR DEFAULT 'Permanent' CHECK (employment_type IN ('Permanent', 'Contract', 'Intern', 'Consultant')),
  date_of_joining DATE, confirmation_date DATE,
  reporting_to UUID REFERENCES public.employees(id), manager_id UUID REFERENCES public.employees(id),
  weekly_off VARCHAR DEFAULT 'Sunday', work_shift VARCHAR DEFAULT 'Regular', workload_capacity INTEGER DEFAULT 40,
  profile_photo TEXT, gender VARCHAR, dob DATE, pan VARCHAR(10), aadhaar VARCHAR(14), blood_group VARCHAR(3),
  bar_council_no VARCHAR, icai_no VARCHAR, gst_practitioner_id VARCHAR, qualification VARCHAR,
  experience_years INTEGER, areas_of_practice TEXT[], university VARCHAR, graduation_year INTEGER, specialization TEXT[],
  billing_rate NUMERIC(10, 2) DEFAULT 0, billable BOOLEAN DEFAULT true, default_task_category VARCHAR, incentive_eligible BOOLEAN DEFAULT false,
  module_access TEXT[], data_scope VARCHAR DEFAULT 'Team Cases' CHECK (data_scope IN ('Own Cases', 'Team Cases', 'All Cases')),
  ai_access BOOLEAN DEFAULT true, whatsapp_access BOOLEAN DEFAULT false,
  documents JSONB, notes TEXT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_code ON employees(employee_code);

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees in their tenant" ON employees FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Authorized users can create employees" ON employees FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Authorized users can update employees" ON employees FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can delete employees" ON employees FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Migration: 20251102162822 - Security Hardening (Phase 5)
-- =============================================
DROP VIEW IF EXISTS case_activity_summary;
CREATE VIEW case_activity_summary WITH (security_invoker = on) AS
SELECT 
  c.id AS case_id, c.tenant_id, c.case_number, c.title, c.status,
  COUNT(DISTINCT h.id) AS hearing_count, MAX(h.hearing_date) AS last_hearing_date,
  COUNT(DISTINCT t.id) AS task_count, MAX(t.updated_at) AS last_task_update,
  COUNT(DISTINCT d.id) AS document_count, MAX(d.upload_timestamp) AS last_document_date
FROM cases c
LEFT JOIN hearings h ON h.case_id = c.id
LEFT JOIN tasks t ON t.case_id = c.id
LEFT JOIN documents d ON d.case_id = c.id
GROUP BY c.id, c.tenant_id, c.case_number, c.title, c.status;

DROP VIEW IF EXISTS documents_by_category;
CREATE VIEW documents_by_category WITH (security_invoker = on) AS
SELECT tenant_id, category, COUNT(*) AS document_count, SUM(file_size) AS total_size_bytes, AVG(file_size) AS avg_file_size_bytes, COUNT(DISTINCT case_id) AS unique_cases
FROM documents WHERE category IS NOT NULL GROUP BY tenant_id, category;

DROP VIEW IF EXISTS documents_by_user;
CREATE VIEW documents_by_user WITH (security_invoker = on) AS
SELECT d.tenant_id, d.uploaded_by, p.full_name AS uploader_name, COUNT(*) AS total_documents, SUM(d.file_size) AS total_storage_bytes,
  COUNT(*) FILTER (WHERE d.document_status = 'Approved') AS approved_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Pending') AS pending_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Rejected') AS rejected_count
FROM documents d LEFT JOIN profiles p ON p.id = d.uploaded_by GROUP BY d.tenant_id, d.uploaded_by, p.full_name;

DROP VIEW IF EXISTS pending_review_documents;
CREATE VIEW pending_review_documents WITH (security_invoker = on) AS
SELECT d.id, d.tenant_id, d.file_name, d.category, d.upload_timestamp, d.uploaded_by, p.full_name AS uploader_name, c.case_number, c.title AS case_title,
  EXTRACT(DAY FROM NOW() - d.upload_timestamp) AS days_pending
FROM documents d LEFT JOIN profiles p ON p.id = d.uploaded_by LEFT JOIN cases c ON c.id = d.case_id
WHERE d.document_status = 'Pending' ORDER BY d.upload_timestamp ASC;

DROP VIEW IF EXISTS storage_usage_by_tenant;
CREATE VIEW storage_usage_by_tenant WITH (security_invoker = on) AS
SELECT t.id AS tenant_id, t.name AS tenant_name, t.license_tier, t.max_storage_gb,
  COALESCE(SUM(d.file_size), 0) AS storage_used_bytes, COUNT(d.id) AS total_documents,
  (t.max_storage_gb * 1024 * 1024 * 1024) - COALESCE(SUM(d.file_size), 0) AS storage_remaining_bytes,
  (COALESCE(SUM(d.file_size), 0)::NUMERIC / NULLIF(t.max_storage_gb * 1024 * 1024 * 1024, 0) * 100) AS storage_used_percentage
FROM tenants t LEFT JOIN documents d ON d.tenant_id = t.id GROUP BY t.id, t.name, t.license_tier, t.max_storage_gb;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_active ON user_roles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_email ON employees(tenant_id, email);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'Users can view audit logs in their tenant') THEN
    CREATE POLICY "Users can view audit logs in their tenant" ON audit_log FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'System can create audit logs') THEN
    CREATE POLICY "System can create audit logs" ON audit_log FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- =============================================
-- Migration: 20251102181756 - Analytics Infrastructure (Phase 3A)
-- =============================================
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, snapshot_date, metric_type)
);
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view analytics in their tenant" ON analytics_snapshots FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "System can create analytics snapshots" ON analytics_snapshots FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE INDEX idx_analytics_snapshots_tenant_date ON analytics_snapshots(tenant_id, snapshot_date);
CREATE INDEX idx_analytics_snapshots_metric_type ON analytics_snapshots(metric_type);

CREATE TABLE performance_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  baseline_value NUMERIC,
  target_value NUMERIC,
  period VARCHAR(20) CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly')),
  effective_from DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE performance_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view baselines in their tenant" ON performance_baselines FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can manage baselines" ON performance_baselines FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND has_role(auth.uid(), 'admin'));
CREATE INDEX idx_performance_baselines_tenant ON performance_baselines(tenant_id);

CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_name VARCHAR(200) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL,
  recipients TEXT[] NOT NULL,
  filters JSONB,
  format VARCHAR(10) CHECK (format IN ('excel', 'pdf', 'csv')),
  include_charts BOOLEAN DEFAULT TRUE,
  enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  last_error TEXT
);
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view scheduled reports in tenant" ON scheduled_reports FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Authorized users can create scheduled reports" ON scheduled_reports FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Authorized users can update scheduled reports" ON scheduled_reports FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run) WHERE enabled = TRUE;
CREATE INDEX idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);

CREATE TABLE report_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'partial')),
  row_count INTEGER,
  file_size_bytes BIGINT,
  error_message TEXT,
  execution_time_ms INTEGER
);
ALTER TABLE report_execution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view report logs in their tenant" ON report_execution_log FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE INDEX idx_report_execution_log_tenant ON report_execution_log(tenant_id);
CREATE INDEX idx_report_execution_log_report ON report_execution_log(scheduled_report_id);

CREATE OR REPLACE VIEW case_analytics_summary AS
SELECT c.tenant_id, c.stage_code, COUNT(*) as total_cases,
  COUNT(*) FILTER (WHERE c.status = 'Active') as active_cases,
  COUNT(*) FILTER (WHERE c.status = 'Completed') as completed_cases,
  COUNT(*) FILTER (WHERE c.priority = 'Critical') as critical_cases,
  AVG(EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400)::INTEGER as avg_age_days,
  COUNT(*) FILTER (WHERE c.title LIKE '%Red%' OR EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 60) as breached_cases
FROM cases c GROUP BY c.tenant_id, c.stage_code;

CREATE OR REPLACE VIEW hearing_outcome_trends AS
SELECT h.tenant_id, DATE_TRUNC('month', h.hearing_date) as period, h.status, COUNT(*) as count,
  ROUND(AVG(CASE WHEN h.status = 'Completed' THEN 1.0 ELSE 0.0 END) * 100, 2) as completion_rate
FROM hearings h WHERE h.hearing_date >= NOW() - INTERVAL '12 months' GROUP BY h.tenant_id, DATE_TRUNC('month', h.hearing_date), h.status;

CREATE OR REPLACE VIEW employee_productivity_metrics AS
SELECT e.tenant_id, e.id as employee_id, e.employee_code, COUNT(DISTINCT c.id) as assigned_cases,
  COUNT(DISTINCT t.id) as assigned_tasks, COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed') as completed_tasks,
  ROUND(AVG(CASE WHEN t.status = 'Completed' THEN EXTRACT(EPOCH FROM (t.completed_date - t.created_at)) / 86400 END), 2) as avg_task_completion_days
FROM employees e LEFT JOIN cases c ON c.assigned_to = e.id LEFT JOIN tasks t ON t.assigned_to = e.id
GROUP BY e.tenant_id, e.id, e.employee_code;

CREATE OR REPLACE VIEW timeline_compliance_trends AS
SELECT c.tenant_id, DATE_TRUNC('week', c.created_at) as week, COUNT(*) as total_cases,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 <= 30) as on_time_cases,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 BETWEEN 31 AND 60) as at_risk_cases,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 60) as breached_cases,
  ROUND(COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 <= 30)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as compliance_percentage
FROM cases c WHERE c.created_at >= NOW() - INTERVAL '6 months' GROUP BY c.tenant_id, DATE_TRUNC('week', c.created_at);

CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_status ON cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_stage ON cases(tenant_id, stage_code);
CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);
CREATE INDEX IF NOT EXISTS idx_hearings_tenant_date ON hearings(tenant_id, hearing_date);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

CREATE TRIGGER update_performance_baselines_updated_at BEFORE UPDATE ON performance_baselines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_reports_updated_at BEFORE UPDATE ON scheduled_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251103100845 - Fix Profiles RLS Recursion
-- =============================================
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles in their tenant" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view profiles in their tenant" ON profiles FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage all profiles in their tenant" ON profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hearings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_id ON cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);

CREATE OR REPLACE FUNCTION public.get_user_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT tenant_id FROM profiles WHERE id = auth.uid() $$;

-- =============================================
-- Migration: 20251103121421 - Automation Tables
-- =============================================
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

ALTER TABLE task_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task bundles in their tenant" ON task_bundles FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can manage task bundles" ON task_bundles FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "Users can view task bundle items in their tenant" ON task_bundle_items FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can manage task bundle items" ON task_bundle_items FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "Users can view automation rules in their tenant" ON automation_rules FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can manage automation rules" ON automation_rules FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "Users can view automation logs in their tenant" ON automation_logs FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "System can create automation logs" ON automation_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());

CREATE INDEX IF NOT EXISTS idx_task_bundles_tenant ON task_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_bundles_trigger ON task_bundles(trigger_event) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_task_bundle_items_bundle ON task_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_case ON automation_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_tenant ON automation_logs(tenant_id);

CREATE TRIGGER update_task_bundles_updated_at BEFORE UPDATE ON task_bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251103122211 - Default Folder Flag
-- =============================================
ALTER TABLE document_folders ADD COLUMN is_default BOOLEAN DEFAULT false;
UPDATE document_folders SET is_default = true WHERE name IN ('Litigation Docs', 'Client Uploads', 'Internal Documents');
CREATE INDEX idx_document_folders_is_default ON document_folders(is_default) WHERE is_default = true;
COMMENT ON COLUMN document_folders.is_default IS 'Indicates if this is a system default folder that cannot be deleted';

-- =============================================
-- Migration: 20251103122845 - Fix UUID References
-- =============================================
ALTER TABLE document_folders DROP CONSTRAINT IF EXISTS document_folders_parent_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_folder_id_fkey;
ALTER TABLE document_folders ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE document_folders ALTER COLUMN parent_id TYPE text USING parent_id::text;
ALTER TABLE documents ALTER COLUMN folder_id TYPE text USING folder_id::text;
ALTER TABLE document_folders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE document_folders ADD CONSTRAINT document_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES document_folders(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT documents_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE SET NULL;

-- =============================================
-- Migration: 20251103123922 - Task Notes and Followups
-- =============================================
CREATE TABLE task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('comment', 'status_change', 'time_log', 'follow_up')),
  note text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);
CREATE INDEX idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX idx_task_notes_tenant_id ON task_notes(tenant_id);
CREATE INDEX idx_task_notes_created_at ON task_notes(created_at DESC);
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view task notes in their tenant" ON task_notes FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create task notes" ON task_notes FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR created_by = auth.uid()));
CREATE POLICY "Users can update their own task notes" ON task_notes FOR UPDATE USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete task notes" ON task_notes FOR DELETE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)));

CREATE TABLE task_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  work_date date NOT NULL,
  status text,
  outcome text,
  client_interaction boolean DEFAULT false,
  internal_review boolean DEFAULT false
);
CREATE INDEX idx_task_followups_task_id ON task_followups(task_id);
CREATE INDEX idx_task_followups_tenant_id ON task_followups(tenant_id);
CREATE INDEX idx_task_followups_work_date ON task_followups(work_date DESC);
ALTER TABLE task_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view task followups in their tenant" ON task_followups FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create task followups" ON task_followups FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR created_by = auth.uid()));
CREATE POLICY "Users can update their own task followups" ON task_followups FOR UPDATE USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete task followups" ON task_followups FOR DELETE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)));

-- =============================================
-- Migration: 20251103125806 - Courts and Judges
-- =============================================
CREATE TABLE IF NOT EXISTS public.courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  type text,
  level text,
  city text,
  state text,
  jurisdiction text,
  address text,
  established_year integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_courts_tenant_id ON public.courts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courts_name ON public.courts(name);
CREATE INDEX IF NOT EXISTS idx_courts_code ON public.courts(code);
CREATE INDEX IF NOT EXISTS idx_courts_type ON public.courts(type);
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view courts in their tenant" ON public.courts FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create courts" ON public.courts FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Authorized users can update courts" ON public.courts FOR UPDATE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can delete courts" ON public.courts FOR DELETE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.judges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  court_id uuid REFERENCES public.courts(id) ON DELETE SET NULL,
  designation text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_judges_tenant_id ON public.judges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_judges_court_id ON public.judges(court_id);
CREATE INDEX IF NOT EXISTS idx_judges_name ON public.judges(name);
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view judges in their tenant" ON public.judges FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create judges" ON public.judges FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Authorized users can update judges" ON public.judges FOR UPDATE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can delete judges" ON public.judges FOR DELETE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hearings' AND column_name = 'court_id') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'hearings_court_id_fkey' AND table_name = 'hearings') THEN
      ALTER TABLE public.hearings ADD CONSTRAINT hearings_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.courts(id) ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;

CREATE TRIGGER update_courts_updated_at BEFORE UPDATE ON public.courts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_judges_updated_at BEFORE UPDATE ON public.judges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Migration: 20251103130526 - Add Missing Columns
-- =============================================
ALTER TABLE cases ADD COLUMN forum_id uuid REFERENCES courts(id) ON DELETE RESTRICT, ADD COLUMN authority_id uuid REFERENCES courts(id) ON DELETE RESTRICT, ADD COLUMN next_hearing_date timestamptz;
CREATE INDEX idx_cases_forum_id ON cases(forum_id);
CREATE INDEX idx_cases_authority_id ON cases(authority_id);
CREATE INDEX idx_cases_next_hearing ON cases(next_hearing_date);
ALTER TABLE hearings ADD COLUMN forum_id uuid REFERENCES courts(id) ON DELETE RESTRICT, ADD COLUMN authority_id uuid REFERENCES courts(id) ON DELETE RESTRICT, ADD COLUMN court_id uuid;
ALTER TABLE hearings ADD CONSTRAINT hearings_court_id_fkey FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE RESTRICT;
CREATE INDEX idx_hearings_forum_id ON hearings(forum_id);
CREATE INDEX idx_hearings_authority_id ON hearings(authority_id);
CREATE INDEX idx_hearings_court_id ON hearings(court_id);

-- =============================================
-- Migration: 20251103131235 - Set Replica Identity
-- =============================================
ALTER TABLE public.cases REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.hearings REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.employees REPLICA IDENTITY FULL;
ALTER TABLE public.courts REPLICA IDENTITY FULL;
ALTER TABLE public.judges REPLICA IDENTITY FULL;

-- =============================================
-- Migration: 20251103133422 - Timeline Entries
-- =============================================
CREATE TABLE IF NOT EXISTS public.timeline_entries (
  id TEXT PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('doc_saved', 'ai_draft_generated', 'case_created', 'hearing_scheduled', 'task_completed', 'stage_change', 'comment', 'deadline', 'case_assigned')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_timeline_case ON public.timeline_entries(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_tenant ON public.timeline_entries(tenant_id, created_at DESC);
ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view timeline in their tenant" ON public.timeline_entries FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "System can create timeline entries" ON public.timeline_entries FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update their own timeline entries" ON public.timeline_entries FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete timeline entries" ON public.timeline_entries FOR DELETE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)));
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_entries;

-- =============================================
-- Migration: 20251104083201 - Security Invoker Views
-- =============================================
-- (Recreates all views with security_invoker=on for RLS enforcement)
-- Omitted here as they are replaced/refined in later migrations but concept is same.
-- See Phase 5 security hardening for final view definitions.

-- =============================================
-- Migration: 20251104095612 - Add Full Name
-- =============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS full_name TEXT;
UPDATE employees SET full_name = SPLIT_PART(email, '@', 1) WHERE full_name IS NULL;
ALTER TABLE employees ALTER COLUMN full_name SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON employees(full_name);

-- =============================================
-- Migration: 20251104131856 - Fix Automation RLS
-- =============================================
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view automation rules in their tenant" ON automation_rules;
DROP POLICY IF EXISTS "Authorized users can manage automation rules" ON automation_rules;
CREATE POLICY "Users can view automation rules in their tenant" ON automation_rules FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can manage automation rules" ON automation_rules FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- =============================================
-- Migration: 20251105041021 - Client Groups & System Settings
-- =============================================
CREATE TABLE IF NOT EXISTS public.client_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  total_clients INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, code)
);
ALTER TABLE public.client_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view client groups in their tenant" ON public.client_groups FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create client groups" ON public.client_groups FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Authorized users can update client groups" ON public.client_groups FOR UPDATE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can delete client groups" ON public.client_groups FOR DELETE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_client_groups_updated_at BEFORE UPDATE ON public.client_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_group_id UUID REFERENCES public.client_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_client_group_id ON public.clients(client_group_id);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  category VARCHAR(50),
  is_encrypted BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, setting_key)
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view system settings in their tenant" ON public.system_settings FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP VIEW IF EXISTS public.timeline_compliance_trends;
CREATE VIEW public.timeline_compliance_trends WITH (security_invoker = on) AS
SELECT tenant_id, date_trunc('month', hearing_date) as period, COUNT(*) as total_hearings, COUNT(*) FILTER (WHERE status = 'Completed') as completed_hearings, COUNT(*) FILTER (WHERE status = 'Adjourned') as adjourned_hearings, ROUND(COUNT(*) FILTER (WHERE status = 'Completed')::numeric / NULLIF(COUNT(*)::numeric, 0) * 100, 2) as compliance_rate FROM hearings GROUP BY tenant_id, date_trunc('month', hearing_date);

-- =============================================
-- Migration: 20251105041929 - Seed Default Data
-- =============================================
-- (Seeding logic omitted for brevity in schema file, typically run once)

-- =============================================
-- Migration: 20251105044520 - PgCron Jobs
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
-- (PgCron schedule commands omitted for brevity)

-- =============================================
-- Migration: 20251105093431 - Fix Doc Upload Policy
-- =============================================
DROP POLICY IF EXISTS "Users can upload to their tenant folder" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id IS NOT NULL));

-- =============================================
-- Migration: 20251108084621 - Security Barriers
-- =============================================
ALTER VIEW case_activity_summary SET (security_barrier = true);
ALTER VIEW documents_by_category SET (security_barrier = true);
ALTER VIEW documents_by_user SET (security_barrier = true);
ALTER VIEW pending_review_documents SET (security_barrier = true);
ALTER VIEW storage_usage_by_tenant SET (security_barrier = true);

-- =============================================
-- Migration: 20251108091143 - Employee PII Protection
-- =============================================
DROP POLICY IF EXISTS "Users can view employees in their tenant" ON employees;
CREATE POLICY "Admins and Partners can view all employees" ON employees FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)));
CREATE POLICY "Managers can view all employees" ON employees FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Employees can view own record" ON employees FOR SELECT USING (id = auth.uid() AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- =============================================
-- Migration: 20251108091519 - New Fields
-- =============================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reply_due_date DATE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS interest_amount NUMERIC(15, 2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC(15, 2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS total_demand NUMERIC(15, 2);

CREATE TABLE IF NOT EXISTS issue_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  frequency_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO issue_types (name, category) VALUES ('Input Tax Credit Disallowance', 'ITC'), ('Excess ITC Availed', 'ITC'), ('Mismatch in Returns (GSTR-2A vs 3B)', 'Returns'), ('Late Filing of Returns', 'Compliance'), ('Non-filing of Returns', 'Compliance'), ('Refund Claim Rejection', 'Refund'), ('Wrong Classification of Goods/Services', 'Classification'), ('Tax Rate Mismatch', 'Tax Computation'), ('E-way Bill Violations', 'E-waybill'), ('Place of Supply Dispute', 'Jurisdictional') ON CONFLICT (name) DO NOTHING;
ALTER TABLE issue_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all authenticated users" ON issue_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON issue_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON issue_types FOR UPDATE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_issue_types_name ON issue_types(name);
CREATE INDEX IF NOT EXISTS idx_issue_types_category ON issue_types(category);
CREATE INDEX IF NOT EXISTS idx_cases_reply_due_date ON cases(reply_due_date);
CREATE INDEX IF NOT EXISTS idx_cases_notice_date ON cases(notice_date);

-- =============================================
-- Migration: 20251108091838 - Hearing Storage
-- =============================================
ALTER TABLE hearings ADD COLUMN IF NOT EXISTS order_file_path TEXT, ADD COLUMN IF NOT EXISTS order_file_url TEXT;
COMMENT ON COLUMN hearings.order_file_path IS 'Path to order document in Supabase Storage';
COMMENT ON COLUMN hearings.order_file_url IS 'Public URL for order document';

-- =============================================
-- Migration: 20251108092020 - Task Extensions
-- =============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS stage VARCHAR(100), ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE, ADD COLUMN IF NOT EXISTS case_number VARCHAR(100), ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE, ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata', ADD COLUMN IF NOT EXISTS due_date_validated BOOLEAN DEFAULT TRUE, ADD COLUMN IF NOT EXISTS tags TEXT[];
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_case_number ON tasks(case_number);
CREATE INDEX IF NOT EXISTS idx_tasks_is_auto_generated ON tasks(is_auto_generated);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

DROP POLICY IF EXISTS "Users can view tasks in their tenant" ON tasks;
CREATE POLICY "Users can view tasks in their tenant" ON tasks FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (assigned_to = auth.uid() OR assigned_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
DROP POLICY IF EXISTS "Users can create tasks in their tenant" ON tasks;
CREATE POLICY "Users can create tasks in their tenant" ON tasks FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND assigned_by = auth.uid());
DROP POLICY IF EXISTS "Users can update tasks in their tenant" ON tasks;
CREATE POLICY "Users can update tasks in their tenant" ON tasks FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (assigned_to = auth.uid() OR assigned_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
DROP POLICY IF EXISTS "Users can delete tasks in their tenant" ON tasks;
CREATE POLICY "Users can delete tasks in their tenant" ON tasks FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND (assigned_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- =============================================
-- Migration: 20251108092254 - Permissions & RBAC
-- =============================================
create policy "tenant_can_upload_documents" on storage.objects for insert to authenticated with check (bucket_id = 'documents' and split_part(name, '/', 1) = (get_user_tenant_id())::text);
create policy "tenant_can_read_documents" on storage.objects for select to authenticated using (bucket_id = 'documents' and split_part(name, '/', 1) = (get_user_tenant_id())::text);
create policy "admins_can_delete_documents" on storage.objects for delete to authenticated using (bucket_id = 'documents' and split_part(name, '/', 1) = (get_user_tenant_id())::text and has_role(auth.uid(), 'admin'));

create table if not exists public.permissions (key text primary key, module text not null, action text not null, description text);
create table if not exists public.role_permissions (role app_role not null, permission_key text not null references public.permissions(key) on delete cascade, created_at timestamptz default now(), primary key (role, permission_key));
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
create policy "auth_can_read_permissions" on public.permissions for select to authenticated using (true);
create policy "admin_manage_permissions" on public.permissions for all to authenticated using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));
create policy "auth_can_read_role_permissions" on public.role_permissions for select to authenticated using (true);
create policy "admin_manage_role_permissions" on public.role_permissions for all to authenticated using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

create or replace function public.ensure_user_role(_user_id uuid, _role app_role) returns void language plpgsql security definer set search_path = public as $$ begin insert into user_roles (user_id, role, granted_by, is_active) values (_user_id, _role, _user_id, true) on conflict (user_id, role) do nothing; end; $$;

-- (Permission seeding omitted)

-- =============================================
-- Migration: 20251110030122 - Doc Storage Policies
-- =============================================
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;
drop policy if exists "tenant_can_upload_documents" on storage.objects;
drop policy if exists "tenant_can_read_documents" on storage.objects;
drop policy if exists "admins_can_delete_documents" on storage.objects;
create policy "tenant_can_upload_documents" on storage.objects for insert to authenticated with check (bucket_id = 'documents' and split_part(name, '/', 1) = (select tenant_id::text from public.profiles where id = auth.uid()));
create policy "tenant_can_read_documents" on storage.objects for select to authenticated using (bucket_id = 'documents' and split_part(name, '/', 1) = (select tenant_id::text from public.profiles where id = auth.uid()));
create policy "admins_can_delete_documents" on storage.objects for delete to authenticated using (bucket_id = 'documents' and split_part(name, '/', 1) = (select tenant_id::text from public.profiles where id = auth.uid()) and has_role(auth.uid(), 'admin'));

-- =============================================
-- Migration: 20251110132552 - Flexible Docs
-- =============================================
ALTER TABLE documents DROP CONSTRAINT IF EXISTS at_least_one_link;
ALTER TABLE documents ADD CONSTRAINT at_least_one_link CHECK (case_id IS NOT NULL OR hearing_id IS NOT NULL OR task_id IS NOT NULL OR client_id IS NOT NULL OR folder_id IS NOT NULL);
COMMENT ON CONSTRAINT at_least_one_link ON documents IS 'Documents must be linked to at least one entity: case, hearing, task, client, or folder';

-- =============================================
-- Migration: 20251110163005 - Strict Doc Constraints
-- =============================================
ALTER TABLE public.documents ADD CONSTRAINT documents_at_least_one_link CHECK (case_id IS NOT NULL OR client_id IS NOT NULL OR hearing_id IS NOT NULL OR task_id IS NOT NULL OR folder_id IS NOT NULL);
ALTER TABLE public.documents ALTER COLUMN tenant_id SET NOT NULL;

-- =============================================
-- Migration: 20251111004655 - Task Bundle ID
-- =============================================
ALTER TABLE tasks ADD COLUMN bundle_id uuid REFERENCES task_bundles(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_bundle_id ON tasks(bundle_id);
COMMENT ON COLUMN tasks.bundle_id IS 'References the task bundle that generated this task (if auto-generated from a bundle)';

-- =============================================
-- Migration: 20251111011250 - Timeline Types
-- =============================================
ALTER TABLE public.timeline_entries DROP CONSTRAINT IF EXISTS timeline_entries_type_check;
ALTER TABLE public.timeline_entries ADD CONSTRAINT timeline_entries_type_check CHECK (type IN ('doc_saved', 'ai_draft_generated', 'case_created', 'hearing_scheduled', 'task_created', 'task_completed', 'stage_change', 'comment', 'deadline', 'case_assigned'));

-- =============================================
-- Migration: 20251111052830 - Tags
-- =============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, name)
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tags in their tenant" ON public.tags FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create tags" ON public.tags FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role)));
CREATE POLICY "Authorized users can update tags" ON public.tags FOR UPDATE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can delete tags" ON public.tags FOR DELETE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON public.tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON public.tags(tenant_id, usage_count DESC);

-- =============================================
-- Migration: 20251111121013 - Stage Transitions
-- =============================================
CREATE TABLE IF NOT EXISTS public.stage_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  case_id UUID NOT NULL,
  from_stage VARCHAR(100),
  to_stage VARCHAR(100) NOT NULL,
  transition_type VARCHAR(50) NOT NULL CHECK (transition_type IN ('Forward', 'Send Back', 'Remand')),
  comments TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX idx_stage_transitions_case_id ON public.stage_transitions(case_id);
CREATE INDEX idx_stage_transitions_tenant_id ON public.stage_transitions(tenant_id);
CREATE INDEX idx_stage_transitions_created_at ON public.stage_transitions(created_at DESC);
ALTER TABLE public.stage_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view stage transitions in their tenant" ON public.stage_transitions FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Authorized users can create stage transitions" ON public.stage_transitions FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND created_by = auth.uid() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'advocate') OR has_role(auth.uid(), 'ca')));
COMMENT ON TABLE public.stage_transitions IS 'Tracks all case stage transitions for audit trail and history';
COMMENT ON COLUMN public.stage_transitions.transition_type IS 'Type of transition: Forward, Send Back, or Remand';

-- =============================================
-- Migration: 20251112105131 - Fix Transition FK
-- =============================================
ALTER TABLE stage_transitions ADD CONSTRAINT fk_stage_transitions_created_by FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;


-- =============================================
-- Migration: 20251112173741 - Timeline Entries Type Update
-- =============================================
ALTER TABLE public.timeline_entries
DROP CONSTRAINT IF EXISTS timeline_entries_type_check;
ALTER TABLE public.timeline_entries
ADD CONSTRAINT timeline_entries_type_check
CHECK (type IN (
  'doc_saved', 'ai_draft_generated', 'case_created',
  'hearing_scheduled', 'task_created', 'task_completed',
  'stage_change', 'comment', 'deadline', 'case_assigned'
));

-- =============================================
-- Migration: 20251112182036 - Tags Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tenant_id, name)
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tags in their tenant" ON public.tags FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create tags" ON public.tags FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role)));
CREATE POLICY "Authorized users can update tags" ON public.tags FOR UPDATE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Admins can delete tags" ON public.tags FOR DELETE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON public.tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON public.tags(tenant_id, usage_count DESC);

-- =============================================
-- Migration: 20251114090132 - Clients Schema Updates
-- =============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address JSONB DEFAULT NULL, ADD COLUMN IF NOT EXISTS signatories JSONB DEFAULT NULL, ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT NULL;

-- =============================================
-- Migration: 20251118091018 - State Bench Location
-- =============================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS state_bench_state TEXT, ADD COLUMN IF NOT EXISTS state_bench_city TEXT;
CREATE INDEX IF NOT EXISTS idx_cases_state_bench_location ON cases(state_bench_state, state_bench_city) WHERE state_bench_state IS NOT NULL;

-- =============================================
-- Migration: 20251126031859 - Case Classification Fields
-- =============================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_type VARCHAR, ADD COLUMN IF NOT EXISTS case_year VARCHAR, ADD COLUMN IF NOT EXISTS case_sequence VARCHAR, ADD COLUMN IF NOT EXISTS office_file_no VARCHAR, ADD COLUMN IF NOT EXISTS issue_type TEXT, ADD COLUMN IF NOT EXISTS form_type VARCHAR, ADD COLUMN IF NOT EXISTS section_invoked VARCHAR, ADD COLUMN IF NOT EXISTS financial_year VARCHAR;
CREATE INDEX IF NOT EXISTS idx_cases_case_type ON cases(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_financial_year ON cases(financial_year);
CREATE INDEX IF NOT EXISTS idx_cases_issue_type ON cases(issue_type);

-- =============================================
-- Migration: 20251126034302 - Communication Logs
-- =============================================
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  case_id UUID REFERENCES cases(id),
  client_id UUID REFERENCES clients(id),
  channel VARCHAR NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  direction VARCHAR NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  message TEXT NOT NULL,
  sent_by UUID REFERENCES profiles(id),
  sent_by_name VARCHAR,
  sent_to VARCHAR NOT NULL,
  sent_to_name VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  message_id VARCHAR,
  failure_reason TEXT,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE communication_logs ADD CONSTRAINT communication_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_tenant ON communication_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_case ON communication_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_client ON communication_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_channel ON communication_logs(channel);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created ON communication_logs(created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE communication_logs;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view communication logs in their tenant" ON communication_logs FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create communication logs" ON communication_logs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND sent_by = auth.uid() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));

-- =============================================
-- Migration: 20251126053726 - Task Creation Footprints
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_creation_footprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  case_id UUID NOT NULL,
  template_id UUID NOT NULL,
  task_id UUID NOT NULL,
  stage TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, case_id, template_id, stage)
);
ALTER TABLE public.task_creation_footprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view footprints in their tenant" ON public.task_creation_footprints FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "System can create footprints" ON public.task_creation_footprints FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE INDEX idx_footprints_case_template ON public.task_creation_footprints(case_id, template_id);
CREATE INDEX idx_footprints_tenant ON public.task_creation_footprints(tenant_id);

-- =============================================
-- Migration: 20251126061437 - pg_net Extension Migration
-- =============================================
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- =============================================
-- Migration: 20251126061726 - Courts and Judges Updates
-- =============================================
ALTER TABLE courts ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'Active';
ALTER TABLE courts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS bench_location text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'Active';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS bench text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS jurisdiction text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS appointment_date date;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS retirement_date date;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS years_of_service integer DEFAULT 0;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS specialization text[] DEFAULT '{}';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS chambers text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS assistant jsonb DEFAULT '{}';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS availability jsonb DEFAULT '{}';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE judges ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS photo_url text;

-- =============================================
-- Migration: 20251126113557 - Client Jurisdiction
-- =============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS jurisdiction JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_clients_jurisdiction ON clients USING GIN (jurisdiction);

-- =============================================
-- Migration: 20251127075333 - Cases City Column
-- =============================================
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS city character varying;

-- =============================================
-- Migration: 20251129094043 - Clean Duplicate Task Bundles
-- =============================================
WITH ranked AS (
  SELECT id, tenant_id, name, trigger_event,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, name, trigger_event ORDER BY created_at NULLS LAST, id) AS rn
  FROM task_bundles
),
duplicates AS (SELECT id FROM ranked WHERE rn > 1)
DELETE FROM task_bundles tb USING duplicates d WHERE tb.id = d.id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_bundles_unique_tenant_name_trigger ON task_bundles (tenant_id, name, trigger_event);

-- =============================================
-- Migration: 20251202112014 - GST Credentials & Return Status
-- =============================================
CREATE TABLE public.gst_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gstin VARCHAR(15) NOT NULL,
  consent_id VARCHAR(100), consent_status VARCHAR(20) DEFAULT 'pending',
  consent_granted_at TIMESTAMPTZ, consent_valid_till TIMESTAMPTZ, consent_revoked_at TIMESTAMPTZ,
  access_token TEXT, refresh_token TEXT, token_expiry TIMESTAMPTZ,
  registered_email VARCHAR(255), registered_mobile VARCHAR(20), filing_frequency VARCHAR(20),
  aato_band VARCHAR(10), e_invoice_enabled BOOLEAN DEFAULT false, e_waybill_enabled BOOLEAN DEFAULT false,
  authorized_signatories JSONB DEFAULT '[]'::jsonb,
  last_sync TIMESTAMPTZ, sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), created_by UUID,
  UNIQUE (tenant_id, client_id, gstin)
);
CREATE INDEX idx_gst_credentials_tenant_id ON gst_credentials(tenant_id);
CREATE INDEX idx_gst_credentials_client_id ON gst_credentials(client_id);
CREATE INDEX idx_gst_credentials_gstin ON gst_credentials(gstin);
CREATE INDEX idx_gst_credentials_consent_status ON gst_credentials(consent_status);
ALTER TABLE gst_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view GST credentials in their tenant" ON gst_credentials FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can manage GST credentials" ON gst_credentials FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca')));

CREATE TABLE public.gst_return_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gstin VARCHAR(15) NOT NULL,
  return_type VARCHAR(20) NOT NULL, return_period VARCHAR(10) NOT NULL, financial_year VARCHAR(10),
  filing_status VARCHAR(30) DEFAULT 'pending', filing_date TIMESTAMPTZ, due_date DATE, is_overdue BOOLEAN DEFAULT false,
  tax_liability NUMERIC(15,2), tax_paid NUMERIC(15,2), late_fee NUMERIC(10,2), interest NUMERIC(10,2),
  arn VARCHAR(50), reference_id VARCHAR(100),
  last_synced_at TIMESTAMPTZ, sync_source VARCHAR(20) DEFAULT 'manual', sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, gstin, return_type, return_period)
);
CREATE INDEX idx_gst_return_status_tenant_id ON gst_return_status(tenant_id);
CREATE INDEX idx_gst_return_status_client_id ON gst_return_status(client_id);
CREATE INDEX idx_gst_return_status_gstin ON gst_return_status(gstin);
CREATE INDEX idx_gst_return_status_return_type ON gst_return_status(return_type);
CREATE INDEX idx_gst_return_status_filing_status ON gst_return_status(filing_status);
CREATE INDEX idx_gst_return_status_due_date ON gst_return_status(due_date);
CREATE INDEX idx_gst_return_status_is_overdue ON gst_return_status(is_overdue) WHERE is_overdue = true;
ALTER TABLE gst_return_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view return status in their tenant" ON gst_return_status FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "System can create return status records" ON gst_return_status FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can update return status" ON gst_return_status FOR UPDATE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca')));
CREATE TRIGGER update_gst_credentials_updated_at BEFORE UPDATE ON gst_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gst_return_status_updated_at BEFORE UPDATE ON gst_return_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251203040552 - Statutory Deadline Automation
-- =============================================
CREATE TABLE public.statutory_acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL, name VARCHAR(150) NOT NULL, description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, code)
);
CREATE TABLE public.statutory_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  act_id UUID NOT NULL REFERENCES public.statutory_acts(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, name VARCHAR(200) NOT NULL,
  base_date_type VARCHAR(30) NOT NULL DEFAULT 'notice_date',
  deadline_type VARCHAR(20) NOT NULL DEFAULT 'days', deadline_count INTEGER NOT NULL DEFAULT 30,
  extension_allowed BOOLEAN DEFAULT false, max_extension_count INTEGER DEFAULT 0, extension_days INTEGER DEFAULT 0,
  legal_reference TEXT, description TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, act_id, code)
);
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL, name VARCHAR(150) NOT NULL,
  type VARCHAR(30) DEFAULT 'national', state VARCHAR(50) DEFAULT 'ALL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, date, state)
);
CREATE TABLE public.case_statutory_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES public.statutory_event_types(id) ON DELETE RESTRICT,
  base_date DATE NOT NULL, calculated_deadline DATE NOT NULL,
  extension_deadline DATE, extension_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  completed_date DATE, remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.statutory_acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_statutory_deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view statutory acts in their tenant" ON public.statutory_acts FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage statutory acts" ON public.statutory_acts FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Users can view statutory event types in their tenant" ON public.statutory_event_types FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage statutory event types" ON public.statutory_event_types FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Users can view holidays in their tenant" ON public.holidays FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage holidays" ON public.holidays FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Users can view case deadlines in their tenant" ON public.case_statutory_deadlines FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can manage case deadlines" ON public.case_statutory_deadlines FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')));
CREATE INDEX idx_statutory_acts_tenant ON public.statutory_acts(tenant_id);
CREATE INDEX idx_statutory_event_types_tenant ON public.statutory_event_types(tenant_id);
CREATE INDEX idx_statutory_event_types_act ON public.statutory_event_types(act_id);
CREATE INDEX idx_holidays_tenant_date ON public.holidays(tenant_id, date);
CREATE INDEX idx_case_deadlines_case ON public.case_statutory_deadlines(case_id);
CREATE INDEX idx_case_deadlines_status ON public.case_statutory_deadlines(status);
CREATE INDEX idx_case_deadlines_deadline ON public.case_statutory_deadlines(calculated_deadline);
CREATE TRIGGER update_statutory_acts_updated_at BEFORE UPDATE ON public.statutory_acts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_statutory_event_types_updated_at BEFORE UPDATE ON public.statutory_event_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_case_statutory_deadlines_updated_at BEFORE UPDATE ON public.case_statutory_deadlines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Migration: 20251203102050 - Seed Permissions
-- =============================================
INSERT INTO permissions (key, module, action, description) VALUES
  ('gst.read', 'gst', 'read', 'View GST compliance data'),
  ('gst.create', 'gst', 'create', 'Create GST compliance records'),
  ('gst.update', 'gst', 'update', 'Update GST compliance records'),
  ('gst.delete', 'gst', 'delete', 'Delete GST compliance records'),
  ('compliance.read', 'compliance', 'read', 'View compliance dashboard'),
  ('compliance.manage', 'compliance', 'manage', 'Manage compliance settings'),
  ('settings.read', 'settings', 'read', 'View system settings'),
  ('settings.update', 'settings', 'update', 'Update system settings'),
  ('statutory.read', 'statutory', 'read', 'View statutory deadlines'),
  ('statutory.create', 'statutory', 'create', 'Create statutory deadlines'),
  ('statutory.update', 'statutory', 'update', 'Update statutory deadlines'),
  ('statutory.delete', 'statutory', 'delete', 'Delete statutory deadlines'),
  ('client_groups.read', 'client_groups', 'read', 'View client groups'),
  ('client_groups.create', 'client_groups', 'create', 'Create client groups'),
  ('client_groups.update', 'client_groups', 'update', 'Update client groups'),
  ('client_groups.delete', 'client_groups', 'delete', 'Delete client groups'),
  ('reports.read', 'reports', 'read', 'View reports'),
  ('reports.export', 'reports', 'export', 'Export reports'),
  ('dashboard.read', 'dashboard', 'read', 'View dashboard'),
  ('dashboard.customize', 'dashboard', 'customize', 'Customize dashboard layout'),
  ('notifications.read', 'notifications', 'read', 'View notifications'),
  ('notifications.manage', 'notifications', 'manage', 'Manage notification settings')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- Migration: 20251204133704 - SMS Templates & Config
-- =============================================
CREATE TABLE public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, template_text TEXT NOT NULL,
  dlt_template_id VARCHAR(50), category VARCHAR(50) NOT NULL DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb, is_active BOOLEAN DEFAULT true,
  character_count INTEGER GENERATED ALWAYS AS (length(template_text)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);
CREATE TABLE public.sms_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'sms24', sender_id VARCHAR(10) NOT NULL,
  dlt_entity_id VARCHAR(50), is_active BOOLEAN DEFAULT true,
  daily_limit INTEGER DEFAULT 1000, monthly_limit INTEGER DEFAULT 30000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE TABLE public.sms_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.sms_templates(id) ON DELETE SET NULL,
  recipient_phone VARCHAR(15) NOT NULL, message_text TEXT NOT NULL,
  dlt_template_id VARCHAR(50), status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR(100), delivery_timestamp TIMESTAMP WITH TIME ZONE,
  error_message TEXT, credits_used INTEGER DEFAULT 1,
  related_entity_type VARCHAR(50), related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view SMS templates in their tenant" ON public.sms_templates FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage SMS templates" ON public.sms_templates FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Users can view SMS config in their tenant" ON public.sms_config FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage SMS config" ON public.sms_config FOR ALL USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view SMS delivery logs in their tenant" ON public.sms_delivery_logs FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "System can create SMS delivery logs" ON public.sms_delivery_logs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE INDEX idx_sms_templates_tenant ON public.sms_templates(tenant_id);
CREATE INDEX idx_sms_templates_category ON public.sms_templates(category);
CREATE INDEX idx_sms_delivery_logs_tenant ON public.sms_delivery_logs(tenant_id);
CREATE INDEX idx_sms_delivery_logs_status ON public.sms_delivery_logs(status);
CREATE INDEX idx_sms_delivery_logs_created ON public.sms_delivery_logs(created_at DESC);
CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON public.sms_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sms_config_updated_at BEFORE UPDATE ON public.sms_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Migration: 20251205064855 - Custom Roles
-- =============================================
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, display_name VARCHAR(100) NOT NULL,
  description TEXT, is_system BOOLEAN DEFAULT false, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (tenant_id, name)
);
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view custom roles in their tenant" ON public.custom_roles FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can manage custom roles" ON public.custom_roles FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE INDEX idx_custom_roles_tenant_id ON public.custom_roles(tenant_id);
CREATE INDEX idx_custom_roles_name ON public.custom_roles(name);
CREATE TRIGGER update_custom_roles_updated_at BEFORE UPDATE ON public.custom_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Migration: 20251205112315 - Employees Default ID
-- =============================================
ALTER TABLE employees ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- =============================================
-- Migration: 20251205140412 - Employees View Policy
-- =============================================
CREATE POLICY "All users can view employees in same tenant" ON public.employees FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- =============================================
-- Migration: 20251206030935 - Task Messages
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  message TEXT NOT NULL, attachments JSONB DEFAULT '[]',
  status_update VARCHAR(50), is_system_message BOOLEAN DEFAULT false,
  created_by UUID, created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_messages_task_id ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_created_at ON task_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_task_messages_tenant_id ON task_messages(tenant_id);
ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their tenant" ON task_messages FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create messages" ON task_messages FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update their own messages" ON task_messages FOR UPDATE USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete messages" ON task_messages FOR DELETE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER PUBLICATION supabase_realtime ADD TABLE task_messages;
CREATE TRIGGER update_task_messages_updated_at BEFORE UPDATE ON task_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251209095850 - Escalation Rules & Events
-- =============================================
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN ('task_overdue', 'critical_sla', 'client_deadline', 'manual')),
  conditions JSONB DEFAULT '{}', actions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
CREATE TABLE IF NOT EXISTS public.escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES escalation_rules(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved', 'escalated')),
  assigned_to UUID REFERENCES profiles(id), escalated_to TEXT,
  current_level INTEGER DEFAULT 1, notes TEXT,
  resolved_at TIMESTAMPTZ, resolved_by UUID REFERENCES profiles(id)
);
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view escalation rules in their tenant" ON public.escalation_rules FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can manage escalation rules" ON public.escalation_rules FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "Users can view escalation events in their tenant" ON public.escalation_events FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "System can create escalation events" ON public.escalation_events FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can update escalation events" ON public.escalation_events FOR UPDATE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR assigned_to = auth.uid()));
CREATE INDEX idx_escalation_rules_tenant ON public.escalation_rules(tenant_id);
CREATE INDEX idx_escalation_rules_active ON public.escalation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_escalation_events_tenant ON public.escalation_events(tenant_id);
CREATE INDEX idx_escalation_events_task ON public.escalation_events(task_id);
CREATE INDEX idx_escalation_events_status ON public.escalation_events(status) WHERE status = 'pending';
CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON public.escalation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Migration: 20251209182721 - Hierarchy Functions & Task RLS
-- =============================================
CREATE OR REPLACE FUNCTION is_in_same_team(_user_id uuid, _other_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM employees e1 JOIN employees e2 ON e1.reporting_to = e2.reporting_to WHERE e1.id = _user_id AND e2.id = _other_user_id AND e1.reporting_to IS NOT NULL) $$;
CREATE OR REPLACE FUNCTION can_view_subordinate_tasks(_viewer_id uuid, _assignee_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT _viewer_id = _assignee_id OR EXISTS (SELECT 1 FROM employees e WHERE e.id = _assignee_id AND e.reporting_to = _viewer_id) OR EXISTS (SELECT 1 FROM employees e1 JOIN employees e2 ON e1.reporting_to = e2.id WHERE e1.id = _assignee_id AND e2.reporting_to = _viewer_id) OR EXISTS (SELECT 1 FROM employees e1 JOIN employees e2 ON e1.reporting_to = e2.id JOIN employees e3 ON e2.reporting_to = e3.id WHERE e1.id = _assignee_id AND e3.reporting_to = _viewer_id) $$;
DROP POLICY IF EXISTS "Users can view tasks in their tenant" ON tasks;
CREATE POLICY "Users can view tasks with hierarchy access" ON tasks FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR assigned_to = auth.uid() OR assigned_by = auth.uid() OR can_view_subordinate_tasks(auth.uid(), assigned_to) OR is_in_same_team(auth.uid(), assigned_to)));
CREATE OR REPLACE FUNCTION can_view_case_by_hierarchy(_user_id uuid, _case_assigned_to uuid, _case_owner_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT _case_assigned_to = _user_id OR EXISTS (SELECT 1 FROM employees e WHERE e.id = _user_id AND e.reporting_to = _case_owner_id) OR is_in_same_team(_user_id, _case_assigned_to) OR can_view_subordinate_tasks(_user_id, _case_assigned_to) $$;
DROP POLICY IF EXISTS "Staff can view assigned cases" ON cases;
CREATE POLICY "Staff can view cases with hierarchy access" ON cases FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role)) AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)));

-- =============================================
-- Migration: 20251214170835 - Courts Tax Jurisdiction
-- =============================================
ALTER TABLE courts ADD COLUMN IF NOT EXISTS tax_jurisdiction text, ADD COLUMN IF NOT EXISTS officer_designation text;
CREATE INDEX IF NOT EXISTS idx_courts_tax_jurisdiction ON courts(tax_jurisdiction);
CREATE INDEX IF NOT EXISTS idx_courts_officer_designation ON courts(officer_designation);

-- =============================================
-- Migration: 20251215174546 - Fix Tasks RLS Policies
-- =============================================
DROP POLICY IF EXISTS "Users can view tasks with hierarchy access" ON tasks;
CREATE POLICY "Admins and managers can view all tasks" ON tasks FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "CA and Advocate can view own tasks" ON tasks FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role)) AND (assigned_to = auth.uid() OR assigned_by = auth.uid()));
CREATE POLICY "Staff can view tasks with hierarchy" ON tasks FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role)) AND (assigned_to = auth.uid() OR assigned_by = auth.uid() OR can_view_subordinate_tasks(auth.uid(), assigned_to) OR is_in_same_team(auth.uid(), assigned_to)));
DROP POLICY IF EXISTS "Users can view cases in their tenant" ON cases;
CREATE POLICY "CA and Advocate can view all cases" ON cases FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role)));
DROP POLICY IF EXISTS "Staff can view assigned case clients" ON clients;
CREATE POLICY "Staff can view hierarchy case clients" ON clients FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role)) AND id IN (SELECT client_id FROM cases WHERE tenant_id = get_user_tenant_id() AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))));
DROP POLICY IF EXISTS "CAs and Advocates can view case documents" ON documents;
DROP POLICY IF EXISTS "Staff can view assigned case documents" ON documents;
CREATE POLICY "CA and Advocate can view all documents" ON documents FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role)));
CREATE POLICY "Staff can view hierarchy case documents" ON documents FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'user'::app_role)) AND (uploaded_by = auth.uid() OR case_id IN (SELECT id FROM cases WHERE tenant_id = get_user_tenant_id() AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR client_id IN (SELECT client_id FROM cases WHERE tenant_id = get_user_tenant_id() AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)))));

-- =============================================
-- Migration: 20251217041552 - Data Scope Functions
-- =============================================
CREATE OR REPLACE FUNCTION public.get_employee_data_scope(_user_id UUID) RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT COALESCE((SELECT data_scope FROM employees WHERE id = _user_id LIMIT 1), CASE WHEN has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN 'All Cases' ELSE 'Own Cases' END) $$;
DROP POLICY IF EXISTS "CA and Advocate can view all cases" ON cases;
DROP POLICY IF EXISTS "Staff can view cases with hierarchy access" ON cases;
CREATE POLICY "CA and Advocate view cases based on data_scope" ON cases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid()))));
CREATE POLICY "Staff view cases based on data_scope" ON cases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user')) AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid()))));
DROP POLICY IF EXISTS "CA and Advocate can view own tasks" ON tasks;
CREATE POLICY "CA and Advocate view tasks based on data_scope" ON tasks FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR assigned_by = auth.uid() OR can_view_subordinate_tasks(auth.uid(), assigned_to) OR is_in_same_team(auth.uid(), assigned_to))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR assigned_by = auth.uid()))));
DROP POLICY IF EXISTS "CAs and Advocates can view all clients" ON clients;
CREATE POLICY "CA and Advocate view clients based on data_scope" ON clients FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR id IN (SELECT client_id FROM cases WHERE tenant_id = get_user_tenant_id() AND ((get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid()))))));
DROP POLICY IF EXISTS "Managers can view all clients" ON clients;
CREATE POLICY "Managers view clients based on data_scope" ON clients FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR id IN (SELECT client_id FROM cases WHERE tenant_id = get_user_tenant_id() AND ((get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid()))))));

-- =============================================
-- Migration: 20251217045158 - Fix RBAC Role Assignments
-- =============================================
UPDATE user_roles ur SET role = 'advocate'::app_role FROM employees e WHERE ur.user_id = e.id AND e.role = 'Advocate' AND ur.role = 'manager' AND ur.is_active = true;
UPDATE user_roles ur SET role = 'ca'::app_role FROM employees e WHERE ur.user_id = e.id AND e.role = 'CA' AND ur.role = 'admin' AND ur.is_active = true;
UPDATE user_roles ur SET role = 'partner'::app_role FROM employees e WHERE ur.user_id = e.id AND e.role = 'Partner' AND ur.role = 'admin' AND ur.is_active = true;
DROP POLICY IF EXISTS "All users can view employees in same tenant" ON employees;
CREATE POLICY "Users view employees based on hierarchy" ON employees FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate') OR ((has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user') OR has_role(auth.uid(), 'clerk')) AND (id = auth.uid() OR is_in_same_team(auth.uid(), id) OR reporting_to = auth.uid()))));
DROP POLICY IF EXISTS "Users can view cases in their tenant" ON cases;
CREATE POLICY "Admins view all cases" ON cases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Managers view cases based on data_scope" ON cases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid()))));

-- =============================================
-- Migration: 20251217045759 - Fix Missing Cases RLS
-- =============================================
CREATE POLICY "CA_Advocate view cases based on data_scope" ON cases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid()))));
CREATE POLICY "Staff view cases based on hierarchy" ON cases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user') OR has_role(auth.uid(), 'clerk')) AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)));

-- =============================================
-- Migration: 20251217060548 - Module Permission Function & RBAC
-- =============================================
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id UUID, _module TEXT, _action TEXT) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ DECLARE _has_permission BOOLEAN; BEGIN SELECT EXISTS (SELECT 1 FROM role_permissions rp JOIN user_roles ur ON CAST(rp.role AS TEXT) = CAST(ur.role AS TEXT) JOIN permissions p ON rp.permission_key = p.key WHERE ur.user_id = _user_id AND ur.is_active = true AND p.module = _module AND p.action = _action) INTO _has_permission; RETURN COALESCE(_has_permission, false); END; $$;
DROP POLICY IF EXISTS "Users can manage cases in their tenant" ON cases;
CREATE POLICY "Admin_Partner_Manager can manage all cases" ON cases FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager')));
CREATE POLICY "CA_Advocate can create cases" ON cases FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND has_module_permission(auth.uid(), 'cases', 'create'));
CREATE POLICY "CA_Advocate can update assigned cases" ON cases FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (assigned_to = auth.uid() OR owner_id = auth.uid()) AND has_module_permission(auth.uid(), 'cases', 'update'));
DROP POLICY IF EXISTS "Users view employees based on hierarchy" ON employees;
CREATE POLICY "Admin_Partner_Manager view all employees" ON employees FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager')) AND has_module_permission(auth.uid(), 'employees', 'read'));
CREATE POLICY "CA_Advocate view employees with permission" ON employees FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND has_module_permission(auth.uid(), 'employees', 'read'));
CREATE POLICY "Staff view employees based on hierarchy" ON employees FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user') OR has_role(auth.uid(), 'clerk')) AND (id = auth.uid() OR is_in_same_team(auth.uid(), id) OR reporting_to = auth.uid()));
CREATE POLICY "Users can always view own employee record" ON employees FOR SELECT TO authenticated USING (id = auth.uid() AND tenant_id = get_user_tenant_id());

-- =============================================
-- Migration: 20251217114936 - Fix has_module_permission Cast
-- =============================================
CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id uuid, _module text, _action text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$ DECLARE _has_permission BOOLEAN; BEGIN SELECT EXISTS (SELECT 1 FROM role_permissions rp JOIN user_roles ur ON CAST(rp.role AS TEXT) = CAST(ur.role AS TEXT) JOIN permissions p ON rp.permission_key = p.key WHERE ur.user_id = _user_id AND ur.is_active = true AND p.module = _module AND p.action = _action) INTO _has_permission; RETURN COALESCE(_has_permission, false); END; $function$;

-- =============================================
-- Migration: 20251218022540 - Case-Inherited Access Control
-- =============================================
CREATE OR REPLACE FUNCTION public.can_user_view_case(_user_id UUID, _case_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ DECLARE _data_scope TEXT; _case_record RECORD; _user_tenant UUID; BEGIN IF _case_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; _data_scope := get_employee_data_scope(_user_id); SELECT assigned_to, owner_id, tenant_id INTO _case_record FROM cases WHERE id = _case_id AND tenant_id = _user_tenant; IF _case_record IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _data_scope = 'All Cases' THEN RETURN TRUE; ELSIF _data_scope = 'Team Cases' THEN RETURN (_case_record.assigned_to = _user_id OR _case_record.owner_id = _user_id OR can_view_case_by_hierarchy(_user_id, _case_record.assigned_to, _case_record.owner_id)); ELSE RETURN (_case_record.assigned_to = _user_id OR _case_record.owner_id = _user_id); END IF; END; $$;
GRANT EXECUTE ON FUNCTION public.can_user_view_case(UUID, UUID) TO authenticated;
DROP POLICY IF EXISTS "CA and Advocate can view all documents" ON documents;
DROP POLICY IF EXISTS "Managers can view all documents" ON documents;
CREATE POLICY "CA and Advocate view case-linked documents" ON documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (uploaded_by = auth.uid() OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND client_id IS NOT NULL AND client_id IN (SELECT client_id FROM cases WHERE tenant_id = get_user_tenant_id() AND can_user_view_case(auth.uid(), id)))));
CREATE POLICY "Managers view documents based on data_scope" ON documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND (uploaded_by = auth.uid() OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND client_id IS NOT NULL AND client_id IN (SELECT client_id FROM cases WHERE tenant_id = get_user_tenant_id() AND can_user_view_case(auth.uid(), id)))));
DROP POLICY IF EXISTS "Staff can view hierarchy case documents" ON documents;
CREATE POLICY "Staff view hierarchy case documents" ON documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user')) AND (uploaded_by = auth.uid() OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND client_id IS NOT NULL AND client_id IN (SELECT client_id FROM cases WHERE tenant_id = get_user_tenant_id() AND can_user_view_case(auth.uid(), id)))));
DROP POLICY IF EXISTS "CA and Advocate view tasks based on data_scope" ON tasks;
CREATE POLICY "CA and Advocate view tasks based on data_scope" ON tasks FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (assigned_to = auth.uid() OR assigned_by = auth.uid() OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND get_employee_data_scope(auth.uid()) = 'All Cases')));
DROP POLICY IF EXISTS "Staff can view tasks with hierarchy" ON tasks;
CREATE POLICY "Staff view tasks with hierarchy" ON tasks FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user')) AND (assigned_to = auth.uid() OR assigned_by = auth.uid() OR can_view_subordinate_tasks(auth.uid(), assigned_to) OR is_in_same_team(auth.uid(), assigned_to) OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id))));
DROP POLICY IF EXISTS "Users can view hearings in their tenant" ON hearings;
CREATE POLICY "Admin and Partner view all hearings" ON hearings FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "CA Advocate Manager view case-linked hearings" ON hearings FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate') OR has_role(auth.uid(), 'manager')) AND can_user_view_case(auth.uid(), case_id));
CREATE POLICY "Staff view hierarchy case hearings" ON hearings FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user')) AND can_user_view_case(auth.uid(), case_id));

-- =============================================
-- Migration: 20251219122629 - Fix RBAC Phase 2
-- =============================================
UPDATE public.user_roles SET role = 'advocate' WHERE user_id IN (SELECT e.id FROM public.employees e WHERE e.role = 'Advocate' AND LOWER(e.status) = 'active') AND role = 'manager';
UPDATE public.user_roles SET role = 'partner' WHERE user_id IN (SELECT e.id FROM public.employees e WHERE e.role = 'Partner' AND LOWER(e.status) = 'active') AND role = 'admin';
UPDATE public.user_roles SET role = 'ca' WHERE user_id IN (SELECT e.id FROM public.employees e WHERE e.role = 'CA' AND LOWER(e.status) = 'active') AND role = 'admin';
INSERT INTO public.user_roles (user_id, role, granted_by, is_active) SELECT e.id, 'partner'::app_role, e.id, true FROM public.employees e WHERE e.role = 'Partner' AND LOWER(e.status) = 'active' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'partner') ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO public.user_roles (user_id, role, granted_by, is_active) SELECT e.id, 'ca'::app_role, e.id, true FROM public.employees e WHERE e.role = 'CA' AND LOWER(e.status) = 'active' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'ca') ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO public.user_roles (user_id, role, granted_by, is_active) SELECT e.id, 'advocate'::app_role, e.id, true FROM public.employees e WHERE e.role = 'Advocate' AND LOWER(e.status) = 'active' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'advocate') ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO public.user_roles (user_id, role, granted_by, is_active) SELECT e.id, 'manager'::app_role, e.id, true FROM public.employees e WHERE e.role = 'Manager' AND LOWER(e.status) = 'active' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'manager') ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO public.user_roles (user_id, role, granted_by, is_active) SELECT e.id, 'staff'::app_role, e.id, true FROM public.employees e WHERE e.role = 'Staff' AND LOWER(e.status) = 'active' AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = e.id AND ur.role = 'staff') ON CONFLICT (user_id, role) DO NOTHING;

-- =============================================
-- Migration: 20251220120116 - Client Portal Users & Notifications
-- =============================================
CREATE TABLE public.client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  email text NOT NULL, is_active boolean DEFAULT true,
  last_login_at timestamptz, portal_role varchar(50) DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), created_by uuid,
  UNIQUE(user_id, client_id)
);
CREATE INDEX idx_client_portal_users_user ON client_portal_users(user_id);
CREATE INDEX idx_client_portal_users_client ON client_portal_users(client_id);
CREATE INDEX idx_client_portal_users_tenant ON client_portal_users(tenant_id);
ALTER TABLE client_portal_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own portal access" ON client_portal_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staff manage portal users" ON client_portal_users FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));

CREATE TABLE public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  type varchar(50) NOT NULL, title text NOT NULL, message text NOT NULL,
  read boolean DEFAULT false, urgent boolean DEFAULT false, action_required boolean DEFAULT false,
  related_entity_type varchar(50), related_entity_id uuid,
  created_at timestamptz DEFAULT now(), read_at timestamptz, metadata jsonb DEFAULT '{}'
);
CREATE INDEX idx_client_notifications_client ON client_notifications(client_id);
CREATE INDEX idx_client_notifications_tenant ON client_notifications(tenant_id);
CREATE INDEX idx_client_notifications_unread ON client_notifications(client_id, read) WHERE read = false;
CREATE INDEX idx_client_notifications_created ON client_notifications(created_at DESC);
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients view own notifications" ON client_notifications FOR SELECT USING (client_id IN (SELECT cpu.client_id FROM client_portal_users cpu WHERE cpu.user_id = auth.uid() AND cpu.is_active = true));
CREATE POLICY "Clients update own notifications" ON client_notifications FOR UPDATE USING (client_id IN (SELECT cpu.client_id FROM client_portal_users cpu WHERE cpu.user_id = auth.uid() AND cpu.is_active = true));
CREATE POLICY "Staff create notifications" ON client_notifications FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Staff view tenant notifications" ON client_notifications FOR SELECT USING (tenant_id = get_user_tenant_id());
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_notifications;

CREATE OR REPLACE FUNCTION create_client_notification(p_client_id uuid, p_type varchar, p_title text, p_message text, p_urgent boolean DEFAULT false, p_action_required boolean DEFAULT false, p_related_type varchar DEFAULT NULL, p_related_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE v_tenant_id uuid; v_notification_id uuid; BEGIN SELECT tenant_id INTO v_tenant_id FROM clients WHERE id = p_client_id; IF v_tenant_id IS NULL THEN RETURN NULL; END IF; INSERT INTO client_notifications (client_id, tenant_id, type, title, message, urgent, action_required, related_entity_type, related_entity_id) VALUES (p_client_id, v_tenant_id, p_type, p_title, p_message, p_urgent, p_action_required, p_related_type, p_related_id) RETURNING id INTO v_notification_id; RETURN v_notification_id; END; $$;

CREATE OR REPLACE FUNCTION notify_client_on_hearing() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE v_client_id uuid; v_case_number varchar; BEGIN SELECT client_id, case_number INTO v_client_id, v_case_number FROM cases WHERE id = NEW.case_id; IF v_client_id IS NOT NULL AND NEW.status = 'Scheduled' THEN PERFORM create_client_notification(v_client_id, 'hearing_reminder', 'Hearing Scheduled', format('A hearing for case %s has been scheduled on %s', v_case_number, to_char(NEW.hearing_date, 'DD Mon YYYY')), false, true, 'hearing', NEW.id); END IF; RETURN NEW; END; $$;
CREATE TRIGGER trigger_notify_client_hearing AFTER INSERT OR UPDATE OF status, hearing_date ON hearings FOR EACH ROW EXECUTE FUNCTION notify_client_on_hearing();
CREATE TRIGGER update_client_portal_users_updated_at BEFORE UPDATE ON client_portal_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251220171455 - Portal Document Policies
-- =============================================
CREATE POLICY "Clients view own documents via portal" ON public.documents FOR SELECT USING (client_id IN (SELECT cpu.client_id FROM client_portal_users cpu WHERE cpu.user_id = auth.uid() AND cpu.is_active = true));
CREATE POLICY "Clients can upload documents via portal" ON public.documents FOR INSERT WITH CHECK ((tenant_id IN (SELECT cpu.tenant_id FROM client_portal_users cpu WHERE cpu.user_id = auth.uid() AND cpu.is_active = true)) AND (uploaded_by = auth.uid()) AND (client_id IN (SELECT cpu.client_id FROM client_portal_users cpu WHERE cpu.user_id = auth.uid() AND cpu.is_active = true)));
CREATE POLICY "Clients can upload to documents bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IN (SELECT cpu.user_id FROM client_portal_users cpu WHERE cpu.is_active = true) AND (storage.foldername(name))[1] = 'client-uploads');
CREATE POLICY "Clients can view own uploads in documents bucket" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IN (SELECT cpu.user_id FROM client_portal_users cpu WHERE cpu.is_active = true));

-- =============================================
-- Migration: 20251220200111 - Avatars Storage
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1));
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1));
CREATE POLICY "Avatars are publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1));

-- =============================================
-- Migration: 20251220200717 - Fix Avatar Policies
-- =============================================
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = split_part(name, '/', 1));
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (auth.uid())::text = split_part(name, '/', 1)) WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = split_part(name, '/', 1));

-- =============================================
-- Migration: 20251220202800 - Expand Audit Log Actions
-- =============================================
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_type_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_type_check CHECK (action_type::text = ANY (ARRAY['upload','update','delete','view','download','approve','reject','version_create','share','comment','login','logout','signup','create_employee','update_employee','delete_employee','assign_role','revoke_role','create_case','update_case','delete_case']));

-- =============================================
-- Migration: 20251220204151 - Audit Log Hearing/Task Actions
-- =============================================
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_type_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_type_check CHECK (action_type::text = ANY (ARRAY['upload','update','delete','view','download','approve','reject','version_create','share','comment','login','logout','signup','create_employee','update_employee','delete_employee','assign_role','revoke_role','create_case','update_case','delete_case','create_hearing','update_hearing','delete_hearing','create_task','update_task','delete_task']));

-- =============================================
-- Migration: 20251221070214 - WhatsApp Config & Delivery Logs
-- =============================================
CREATE TABLE public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR NOT NULL DEFAULT 'enotify', instance_id VARCHAR,
  is_active BOOLEAN DEFAULT false, daily_limit INTEGER DEFAULT 1000, monthly_limit INTEGER DEFAULT 30000,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);
CREATE TABLE public.whatsapp_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  recipient_phone VARCHAR NOT NULL, message_text TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending', provider_message_id VARCHAR,
  delivery_timestamp TIMESTAMPTZ, error_message TEXT,
  related_entity_type VARCHAR, related_entity_id UUID,
  credits_used INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage WhatsApp config" ON public.whatsapp_config FOR ALL USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view WhatsApp config in their tenant" ON public.whatsapp_config FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "System can create WhatsApp delivery logs" ON public.whatsapp_delivery_logs FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can view WhatsApp delivery logs in their tenant" ON public.whatsapp_delivery_logs FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE INDEX idx_whatsapp_delivery_logs_tenant ON public.whatsapp_delivery_logs(tenant_id);
CREATE INDEX idx_whatsapp_delivery_logs_status ON public.whatsapp_delivery_logs(status);
CREATE INDEX idx_whatsapp_delivery_logs_created_at ON public.whatsapp_delivery_logs(created_at DESC);
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Migration: 20251221080815 - Client Contacts Table
-- =============================================
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL, designation TEXT,
  emails JSONB DEFAULT '[]'::jsonb, phones JSONB DEFAULT '[]'::jsonb,
  roles TEXT[] DEFAULT '{}', is_primary BOOLEAN DEFAULT false, is_active BOOLEAN DEFAULT true,
  source VARCHAR(50) DEFAULT 'manual', notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_client_contacts_tenant_id ON public.client_contacts(tenant_id);
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view contacts in their tenant" ON public.client_contacts FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Authorized users can create contacts" ON public.client_contacts FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate') OR has_role(auth.uid(), 'staff')));
CREATE POLICY "Authorized users can update contacts" ON public.client_contacts FOR UPDATE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate') OR has_role(auth.uid(), 'staff')));
CREATE POLICY "Admins can delete contacts" ON public.client_contacts FOR DELETE USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager')));
CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Migration: 20251222035903 - Dual Access Model Phase 1
-- =============================================
DO $$ BEGIN CREATE TYPE entity_data_scope AS ENUM ('OWN', 'TEAM', 'ALL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_scope entity_data_scope DEFAULT 'TEAM';
ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id);
ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS data_scope entity_data_scope DEFAULT 'TEAM';
ALTER TABLE client_contacts ALTER COLUMN client_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION can_user_view_client(_user_id uuid, _client_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$ DECLARE _client RECORD; _user_tenant UUID; BEGIN IF _client_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; SELECT owner_id, data_scope, tenant_id INTO _client FROM clients WHERE id = _client_id AND tenant_id = _user_tenant; IF _client IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _client.owner_id = _user_id THEN RETURN TRUE; END IF; IF _client.data_scope = 'ALL' THEN RETURN TRUE; END IF; IF _client.data_scope = 'TEAM' AND _client.owner_id IS NOT NULL AND is_in_same_team(_user_id, _client.owner_id) THEN RETURN TRUE; END IF; IF EXISTS (SELECT 1 FROM cases c WHERE c.client_id = _client_id AND c.tenant_id = _user_tenant AND can_user_view_case(_user_id, c.id)) THEN RETURN TRUE; END IF; RETURN FALSE; END; $$;

CREATE OR REPLACE FUNCTION can_user_view_contact(_user_id uuid, _contact_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$ DECLARE _contact RECORD; _user_tenant UUID; BEGIN IF _contact_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; SELECT owner_user_id, data_scope, client_id, tenant_id INTO _contact FROM client_contacts WHERE id = _contact_id AND tenant_id = _user_tenant; IF _contact IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _contact.owner_user_id = _user_id THEN RETURN TRUE; END IF; IF _contact.data_scope = 'ALL' THEN RETURN TRUE; END IF; IF _contact.data_scope = 'TEAM' AND _contact.owner_user_id IS NOT NULL AND is_in_same_team(_user_id, _contact.owner_user_id) THEN RETURN TRUE; END IF; IF _contact.client_id IS NOT NULL AND can_user_view_client(_user_id, _contact.client_id) THEN RETURN TRUE; END IF; RETURN FALSE; END; $$;

-- =============================================
-- Migration: 20251222042946 - Replace Client RLS Policies
-- =============================================
DROP POLICY IF EXISTS "Admins and Partners can view all clients" ON clients;
DROP POLICY IF EXISTS "Managers view clients based on data_scope" ON clients;
DROP POLICY IF EXISTS "CA and Advocate view clients based on data_scope" ON clients;
DROP POLICY IF EXISTS "Staff can view hierarchy case clients" ON clients;
DROP POLICY IF EXISTS "Users can manage clients in their tenant" ON clients;
CREATE POLICY "Users can view accessible clients" ON clients FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND can_user_view_client(auth.uid(), id));
CREATE POLICY "Authorized users can create clients" ON clients FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id() AND owner_id = auth.uid() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')));
CREATE POLICY "Authorized users can update clients" ON clients FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id() AND (owner_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'))) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete clients" ON clients FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON client_contacts;
DROP POLICY IF EXISTS "Authorized users can create contacts" ON client_contacts;
DROP POLICY IF EXISTS "Authorized users can update contacts" ON client_contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON client_contacts;
CREATE POLICY "Users can view accessible contacts" ON client_contacts FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND can_user_view_contact(auth.uid(), id));
CREATE POLICY "Authorized users can create contacts" ON client_contacts FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id() AND owner_user_id = auth.uid() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate') OR has_role(auth.uid(), 'staff')));
CREATE POLICY "Authorized users can update contacts" ON client_contacts FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id() AND (owner_user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager'))) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Admins can delete contacts" ON client_contacts FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner') OR has_role(auth.uid(), 'manager')));

-- =============================================
-- Migration: 20251222044231 - Fix Document & Task Access
-- =============================================
DROP POLICY IF EXISTS "CA and Advocate view case-linked documents" ON documents;
DROP POLICY IF EXISTS "Managers view documents based on data_scope" ON documents;
DROP POLICY IF EXISTS "Staff view hierarchy case documents" ON documents;
CREATE POLICY "CA and Advocate view case-linked documents" ON documents FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (uploaded_by = auth.uid() OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))));
CREATE POLICY "Managers view documents based on data_scope" ON documents FOR SELECT USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND (uploaded_by = auth.uid() OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))));
CREATE POLICY "Staff view hierarchy case documents" ON documents FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user')) AND (uploaded_by = auth.uid() OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))));
DROP POLICY IF EXISTS "CA and Advocate view tasks based on data_scope" ON tasks;
DROP POLICY IF EXISTS "Staff view tasks with hierarchy" ON tasks;
CREATE POLICY "CA and Advocate view tasks based on data_scope" ON tasks FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'ca') OR has_role(auth.uid(), 'advocate')) AND (assigned_to = auth.uid() OR assigned_by = auth.uid() OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id)) OR (case_id IS NULL AND client_id IS NULL AND get_employee_data_scope(auth.uid()) = 'All Cases')));
CREATE POLICY "Staff view tasks with hierarchy" ON tasks FOR SELECT USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'user')) AND (assigned_to = auth.uid() OR assigned_by = auth.uid() OR can_view_subordinate_tasks(auth.uid(), assigned_to) OR is_in_same_team(auth.uid(), assigned_to) OR (case_id IS NOT NULL AND can_user_view_case(auth.uid(), case_id)) OR (case_id IS NULL AND client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id))));

-- =============================================
-- Migration: 20251222122204 - Fix RLS Recursion (user_roles)
-- =============================================
BEGIN;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND is_active = TRUE); $$;
CREATE OR REPLACE FUNCTION public.is_admin_or_partner(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin'::public.app_role, 'partner'::public.app_role) AND is_active = TRUE); $$;
ALTER FUNCTION public.has_role(uuid, public.app_role) OWNER TO postgres;
ALTER FUNCTION public.is_admin_or_partner(uuid) OWNER TO postgres;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and partners can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and partners can view all roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins and partners can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins and partners can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins and partners can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin_or_partner(auth.uid())) WITH CHECK (public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins and partners can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin_or_partner(auth.uid()));
COMMIT;

-- =============================================
-- Migration: 20251222123340 - Fix RLS Helper Functions
-- =============================================
BEGIN;
CREATE OR REPLACE FUNCTION public.get_user_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ SELECT tenant_id FROM profiles WHERE id = auth.uid() $$;
CREATE OR REPLACE FUNCTION public.is_in_same_team(_user_id uuid, _other_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ SELECT EXISTS (SELECT 1 FROM employees e1 JOIN employees e2 ON e1.reporting_to = e2.reporting_to WHERE e1.id = _user_id AND e2.id = _other_user_id AND e1.reporting_to IS NOT NULL) $$;
CREATE OR REPLACE FUNCTION public.can_view_subordinate_tasks(_viewer_id uuid, _assignee_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ SELECT _viewer_id = _assignee_id OR EXISTS (SELECT 1 FROM employees e WHERE e.id = _assignee_id AND e.reporting_to = _viewer_id) OR EXISTS (SELECT 1 FROM employees e1 JOIN employees e2 ON e1.reporting_to = e2.id WHERE e1.id = _assignee_id AND e2.reporting_to = _viewer_id) OR EXISTS (SELECT 1 FROM employees e1 JOIN employees e2 ON e1.reporting_to = e2.id JOIN employees e3 ON e2.reporting_to = e3.id WHERE e1.id = _assignee_id AND e3.reporting_to = _viewer_id) $$;
CREATE OR REPLACE FUNCTION public.can_view_case_by_hierarchy(_user_id uuid, _case_assigned_to uuid, _case_owner_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ SELECT _case_assigned_to = _user_id OR EXISTS (SELECT 1 FROM employees e WHERE e.id = _user_id AND e.reporting_to = _case_owner_id) OR is_in_same_team(_user_id, _case_assigned_to) OR can_view_subordinate_tasks(_user_id, _case_assigned_to) $$;
CREATE OR REPLACE FUNCTION public.get_employee_data_scope(_user_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ SELECT COALESCE((SELECT data_scope FROM employees WHERE id = _user_id LIMIT 1), CASE WHEN has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN 'All Cases' ELSE 'Own Cases' END) $$;
CREATE OR REPLACE FUNCTION public.can_user_view_case(_user_id uuid, _case_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ DECLARE _data_scope TEXT; _case_record RECORD; _user_tenant UUID; BEGIN IF _case_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; _data_scope := get_employee_data_scope(_user_id); SELECT assigned_to, owner_id, tenant_id INTO _case_record FROM cases WHERE id = _case_id AND tenant_id = _user_tenant; IF _case_record IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _data_scope = 'All Cases' THEN RETURN TRUE; ELSIF _data_scope = 'Team Cases' THEN RETURN (_case_record.assigned_to = _user_id OR _case_record.owner_id = _user_id OR can_view_case_by_hierarchy(_user_id, _case_record.assigned_to, _case_record.owner_id)); ELSE RETURN (_case_record.assigned_to = _user_id OR _case_record.owner_id = _user_id); END IF; END; $$;
CREATE OR REPLACE FUNCTION public.can_user_view_client(_user_id uuid, _client_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ DECLARE _client RECORD; _user_tenant UUID; BEGIN IF _client_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; SELECT owner_id, data_scope, tenant_id INTO _client FROM clients WHERE id = _client_id AND tenant_id = _user_tenant; IF _client IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _client.owner_id = _user_id THEN RETURN TRUE; END IF; IF _client.data_scope = 'ALL' THEN RETURN TRUE; END IF; IF _client.data_scope = 'TEAM' AND _client.owner_id IS NOT NULL AND is_in_same_team(_user_id, _client.owner_id) THEN RETURN TRUE; END IF; IF EXISTS (SELECT 1 FROM cases c WHERE c.client_id = _client_id AND c.tenant_id = _user_tenant AND can_user_view_case(_user_id, c.id)) THEN RETURN TRUE; END IF; RETURN FALSE; END; $$;
CREATE OR REPLACE FUNCTION public.can_user_view_contact(_user_id uuid, _contact_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ DECLARE _contact RECORD; _user_tenant UUID; BEGIN IF _contact_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; SELECT owner_user_id, data_scope, client_id, tenant_id INTO _contact FROM client_contacts WHERE id = _contact_id AND tenant_id = _user_tenant; IF _contact IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _contact.owner_user_id = _user_id THEN RETURN TRUE; END IF; IF _contact.data_scope = 'ALL' THEN RETURN TRUE; END IF; IF _contact.data_scope = 'TEAM' AND _contact.owner_user_id IS NOT NULL AND is_in_same_team(_user_id, _contact.owner_user_id) THEN RETURN TRUE; END IF; IF _contact.client_id IS NOT NULL AND can_user_view_client(_user_id, _contact.client_id) THEN RETURN TRUE; END IF; RETURN FALSE; END; $$;
ALTER FUNCTION public.get_user_tenant_id() OWNER TO postgres;
ALTER FUNCTION public.is_in_same_team(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.can_view_subordinate_tasks(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.can_view_case_by_hierarchy(uuid, uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.get_employee_data_scope(uuid) OWNER TO postgres;
ALTER FUNCTION public.can_user_view_case(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.can_user_view_client(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.can_user_view_contact(uuid, uuid) OWNER TO postgres;
COMMIT;

-- =============================================
-- Migration: 20251222124422 - Fix INSERT Policies
-- =============================================
DROP POLICY IF EXISTS "Authorized users can create clients" ON public.clients;
CREATE POLICY "Authorized users can create clients" ON public.clients AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'partner'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'ca'::public.app_role) OR public.has_role(auth.uid(), 'advocate'::public.app_role)));
DROP POLICY IF EXISTS "Authorized users can create contacts" ON public.client_contacts;
CREATE POLICY "Authorized users can create contacts" ON public.client_contacts AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'partner'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'ca'::public.app_role) OR public.has_role(auth.uid(), 'advocate'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));

-- =============================================
-- Migration: 20251222143304 - Client Groups Head & Tenant Trigger
-- =============================================
ALTER TABLE public.client_groups ADD COLUMN IF NOT EXISTS head_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_client_groups_head_client_id ON public.client_groups(head_client_id);
CREATE OR REPLACE FUNCTION public.set_tenant_on_insert() RETURNS TRIGGER AS $$ BEGIN IF NEW.tenant_id IS NULL THEN NEW.tenant_id := public.get_user_tenant_id(); END IF; RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trigger_set_tenant_clients ON public.clients;
CREATE TRIGGER trigger_set_tenant_clients BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_tenant_on_insert();

-- =============================================
-- Migration: 20251223024554 - Fix Permissive INSERT Policies
-- =============================================
DROP POLICY IF EXISTS "Authorized users can create clients" ON public.clients;
CREATE POLICY "Authorized users can create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role)));
DROP POLICY IF EXISTS "Authorized users can create contacts" ON public.client_contacts;
CREATE POLICY "Authorized users can create contacts" ON public.client_contacts FOR INSERT TO authenticated WITH CHECK ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));

-- =============================================
-- Migration: 20251223032317 - Auto-Set Owner Triggers
-- =============================================
CREATE OR REPLACE FUNCTION public.set_client_owner() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NEW.owner_id IS NULL THEN NEW.owner_id := auth.uid(); END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS set_client_owner_trigger ON public.clients;
CREATE TRIGGER set_client_owner_trigger BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_client_owner();
CREATE OR REPLACE FUNCTION public.set_contact_owner() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN IF NEW.owner_user_id IS NULL THEN NEW.owner_user_id := auth.uid(); END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS set_contact_owner_trigger ON public.client_contacts;
CREATE TRIGGER set_contact_owner_trigger BEFORE INSERT ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION public.set_contact_owner();

-- =============================================
-- Migration: 20251223033825 - Fix Clients SELECT Policy
-- =============================================
DROP POLICY IF EXISTS "Users can view accessible clients" ON public.clients;
CREATE POLICY "Users can view accessible clients" ON public.clients FOR SELECT TO authenticated USING ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR owner_id = auth.uid() OR can_user_view_client(auth.uid(), id)));
DROP POLICY IF EXISTS "Users can view accessible contacts" ON public.client_contacts;
CREATE POLICY "Users can view accessible contacts" ON public.client_contacts FOR SELECT TO authenticated USING ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR owner_user_id = auth.uid() OR can_user_view_contact(auth.uid(), id)));

-- =============================================
-- Migration: 20251223100131 - Client Portal Access
-- =============================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_access JSONB DEFAULT NULL;

-- =============================================
-- Migration: 20251223134033 - Portal User View Client
-- =============================================
CREATE POLICY "Portal users can view their client" ON public.clients FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM client_portal_users cpu WHERE cpu.client_id = clients.id AND cpu.user_id = auth.uid() AND cpu.is_active = true));

-- =============================================
-- Migration: 20251223134114 - Portal User Self-Update
-- =============================================
CREATE POLICY "Portal users can update own record" ON public.client_portal_users FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================
-- Migration: 20251223141603 - Fix Portal View Policy
-- =============================================
DROP POLICY IF EXISTS "Users view own portal access" ON public.client_portal_users;
CREATE POLICY "Users view own portal access" ON public.client_portal_users FOR SELECT TO authenticated USING (user_id = auth.uid());

-- =============================================
-- Migration: 20251226094034 - Task Followup Fields
-- =============================================
ALTER TABLE public.task_followups ADD COLUMN IF NOT EXISTS remarks text, ADD COLUMN IF NOT EXISTS hours_logged numeric, ADD COLUMN IF NOT EXISTS next_follow_up_date date, ADD COLUMN IF NOT EXISTS next_actions text, ADD COLUMN IF NOT EXISTS blockers text, ADD COLUMN IF NOT EXISTS support_needed boolean DEFAULT false, ADD COLUMN IF NOT EXISTS escalation_requested boolean DEFAULT false, ADD COLUMN IF NOT EXISTS attachments jsonb;

-- =============================================
-- Migration: 20251226111327 - Escalation Events FK Fix
-- =============================================
UPDATE escalation_events SET escalated_to = NULL WHERE escalated_to IS NOT NULL AND escalated_to !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE escalation_events ALTER COLUMN escalated_to TYPE uuid USING escalated_to::uuid;
ALTER TABLE escalation_events ADD CONSTRAINT escalation_events_escalated_to_employees_fkey FOREIGN KEY (escalated_to) REFERENCES employees(id) ON DELETE SET NULL;

-- =============================================
-- Migration: 20251227055307 - Enhanced Portal Document Policy
-- =============================================
DROP POLICY IF EXISTS "Clients view own documents via portal" ON public.documents;
CREATE POLICY "Portal users view client and case documents" ON public.documents FOR SELECT USING (EXISTS (SELECT 1 FROM client_portal_users cpu WHERE cpu.user_id = auth.uid() AND cpu.is_active = true AND (documents.client_id = cpu.client_id OR (documents.case_id IS NOT NULL AND documents.case_id IN (SELECT c.id FROM cases c WHERE c.client_id = cpu.client_id)))));

-- =============================================
-- Migration: 20251229133836 - Portal Case & Hearing Policies
-- =============================================
CREATE POLICY "Portal users can view their client cases" ON public.cases FOR SELECT TO authenticated USING (client_id IN (SELECT cpu.client_id FROM client_portal_users cpu WHERE cpu.user_id = auth.uid() AND cpu.is_active = true));
CREATE POLICY "Portal users can view their client hearings" ON public.hearings FOR SELECT TO authenticated USING (case_id IN (SELECT c.id FROM cases c JOIN client_portal_users cpu ON c.client_id = cpu.client_id WHERE cpu.user_id = auth.uid() AND cpu.is_active = true));

-- =============================================
-- Migration: 20251231100618 - Role Sync Trigger
-- =============================================
DELETE FROM user_roles WHERE user_id = 'dfb45acf-abd6-4c49-b9e6-942b0363c951' AND role = 'advocate';
CREATE OR REPLACE FUNCTION sync_employee_role_to_user_roles() RETURNS TRIGGER AS $$ DECLARE target_role app_role; BEGIN target_role := CASE LOWER(NEW.role) WHEN 'partner' THEN 'partner'::app_role WHEN 'ca' THEN 'ca'::app_role WHEN 'advocate' THEN 'advocate'::app_role WHEN 'manager' THEN 'manager'::app_role WHEN 'staff' THEN 'staff'::app_role WHEN 'rm' THEN 'manager'::app_role WHEN 'finance' THEN 'manager'::app_role WHEN 'admin' THEN 'admin'::app_role WHEN 'clerk' THEN 'clerk'::app_role ELSE 'staff'::app_role END; IF OLD.role IS DISTINCT FROM NEW.role THEN DELETE FROM user_roles WHERE user_id = NEW.id AND role != 'user'::app_role; INSERT INTO user_roles (user_id, role, granted_by, is_active) VALUES (NEW.id, target_role, NEW.id, true) ON CONFLICT (user_id, role) DO UPDATE SET is_active = true; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS employee_role_sync_trigger ON employees;
CREATE TRIGGER employee_role_sync_trigger AFTER UPDATE OF role ON employees FOR EACH ROW EXECUTE FUNCTION sync_employee_role_to_user_roles();

-- =============================================
-- Migration: 20251231104449 - Fix Hierarchy Upward Visibility
-- =============================================
CREATE OR REPLACE FUNCTION public.can_view_case_by_hierarchy(_user_id uuid, _case_assigned_to uuid, _case_owner_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' SET row_security TO 'off' AS $function$ SELECT _case_assigned_to = _user_id OR EXISTS (SELECT 1 FROM employees e WHERE e.id = _user_id AND e.reporting_to = _case_assigned_to) OR EXISTS (SELECT 1 FROM employees e WHERE e.id = _user_id AND e.reporting_to = _case_owner_id) OR EXISTS (SELECT 1 FROM employees e1 JOIN employees e2 ON e1.reporting_to = e2.id WHERE e1.id = _user_id AND e2.reporting_to = _case_assigned_to) OR EXISTS (SELECT 1 FROM employees e1 JOIN employees e2 ON e1.reporting_to = e2.id WHERE e1.id = _user_id AND e2.reporting_to = _case_owner_id) OR is_in_same_team(_user_id, _case_assigned_to) OR can_view_subordinate_tasks(_user_id, _case_assigned_to) $function$;

-- =============================================
-- Migration: 20251231124606 - Fix can_user_view_case & Cases RLS
-- =============================================
CREATE OR REPLACE FUNCTION public.can_user_view_case(_user_id uuid, _case_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ DECLARE _case_record RECORD; _user_data_scope text; _user_tenant_id uuid; BEGIN SELECT tenant_id INTO _user_tenant_id FROM profiles WHERE id = _user_id; IF _user_tenant_id IS NULL THEN RETURN FALSE; END IF; SELECT COALESCE(data_scope, 'Team Cases') INTO _user_data_scope FROM employees WHERE id = _user_id; SELECT id, tenant_id, assigned_to, owner_id, client_id INTO _case_record FROM cases WHERE id = _case_id; IF NOT FOUND THEN RETURN FALSE; END IF; IF _case_record.tenant_id != _user_tenant_id THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _user_data_scope = 'All Cases' THEN RETURN TRUE; END IF; IF (_case_record.assigned_to IS NOT NULL AND _case_record.assigned_to = _user_id) THEN RETURN TRUE; END IF; IF (_case_record.owner_id IS NOT NULL AND _case_record.owner_id = _user_id) THEN RETURN TRUE; END IF; IF _user_data_scope = 'Own Cases' THEN RETURN FALSE; END IF; IF _user_data_scope = 'Team Cases' THEN IF can_view_case_by_hierarchy(_user_id, _case_record.assigned_to, _case_record.owner_id) THEN RETURN TRUE; END IF; IF _case_record.client_id IS NOT NULL AND can_user_view_client(_user_id, _case_record.client_id) THEN RETURN TRUE; END IF; END IF; RETURN FALSE; END; $$;
DROP POLICY IF EXISTS "Admin_Partner_Manager can manage all cases" ON public.cases;
DROP POLICY IF EXISTS "Managers view cases based on data_scope" ON public.cases;
CREATE POLICY "Admin_Partner full case access" ON public.cases FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Manager scoped case select" ON public.cases FOR SELECT USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid()) OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id) OR (client_id IS NOT NULL AND can_user_view_client(auth.uid(), client_id)))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid())))));
CREATE POLICY "Manager scoped case insert" ON public.cases FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager scoped case update" ON public.cases FOR UPDATE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid()) OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid()))))) WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager scoped case delete" ON public.cases FOR DELETE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid()) OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR (owner_id IS NOT NULL AND owner_id = auth.uid())))));
DROP POLICY IF EXISTS "Admins and managers can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin_Partner_Manager can manage hearings" ON public.hearings;
CREATE POLICY "Admin_Partner full hearing access" ON public.hearings FOR ALL USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))) WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));
CREATE POLICY "Manager scoped hearing select" ON public.hearings FOR SELECT USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND can_user_view_case(auth.uid(), case_id));
CREATE POLICY "Manager scoped hearing insert" ON public.hearings FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND can_user_view_case(auth.uid(), case_id));
CREATE POLICY "Manager scoped hearing update" ON public.hearings FOR UPDATE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND can_user_view_case(auth.uid(), case_id)) WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager'));
CREATE POLICY "Manager scoped hearing delete" ON public.hearings FOR DELETE USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'manager') AND can_user_view_case(auth.uid(), case_id));

-- =============================================
-- Migration: 20251231125113 - Fix Circular Recursion
-- =============================================
CREATE OR REPLACE FUNCTION public.can_user_view_client(_user_id uuid, _client_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ DECLARE _client RECORD; _user_tenant UUID; BEGIN IF _client_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; SELECT owner_id, data_scope, tenant_id INTO _client FROM clients WHERE id = _client_id AND tenant_id = _user_tenant; IF _client IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _client.owner_id = _user_id THEN RETURN TRUE; END IF; IF _client.data_scope = 'ALL' THEN RETURN TRUE; END IF; IF _client.data_scope = 'TEAM' AND _client.owner_id IS NOT NULL AND is_in_same_team(_user_id, _client.owner_id) THEN RETURN TRUE; END IF; IF _client.owner_id IS NOT NULL AND can_view_subordinate_tasks(_user_id, _client.owner_id) THEN RETURN TRUE; END IF; RETURN FALSE; END; $$;

-- =============================================
-- Migration: 20251231125856 - Case-Based Client Visibility
-- =============================================
CREATE OR REPLACE FUNCTION public.can_user_view_client(_user_id uuid, _client_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET row_security = off AS $$ DECLARE _client RECORD; _user_tenant UUID; BEGIN IF _client_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; SELECT owner_id, data_scope, tenant_id INTO _client FROM clients WHERE id = _client_id AND tenant_id = _user_tenant; IF _client IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN RETURN TRUE; END IF; IF _client.owner_id = _user_id THEN RETURN TRUE; END IF; IF _client.data_scope = 'ALL' THEN RETURN TRUE; END IF; IF _client.data_scope = 'TEAM' AND _client.owner_id IS NOT NULL AND is_in_same_team(_user_id, _client.owner_id) THEN RETURN TRUE; END IF; IF _client.owner_id IS NOT NULL AND can_view_subordinate_tasks(_user_id, _client.owner_id) THEN RETURN TRUE; END IF; IF EXISTS (SELECT 1 FROM cases c WHERE c.client_id = _client_id AND c.tenant_id = _user_tenant AND (c.assigned_to = _user_id OR c.owner_id = _user_id OR can_view_case_by_hierarchy(_user_id, c.assigned_to, c.owner_id))) THEN RETURN TRUE; END IF; RETURN FALSE; END; $$;

-- =============================================
-- Migration: 20260101105414 - Delete Policies for Hearings & Cases
-- =============================================
CREATE POLICY "Admins can delete hearings" ON public.hearings FOR DELETE TO authenticated USING ((tenant_id = get_user_tenant_id()) AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partners can delete hearings" ON public.hearings FOR DELETE TO authenticated USING ((tenant_id = get_user_tenant_id()) AND has_role(auth.uid(), 'partner'::app_role));
CREATE POLICY "Partners can delete cases" ON public.cases FOR DELETE TO authenticated USING ((tenant_id = get_user_tenant_id()) AND has_role(auth.uid(), 'partner'::app_role));

-- =============================================
-- Migration: 20260108020257 - Case Completion Fields
-- =============================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completed_by UUID;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completion_reason VARCHAR(100);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_completed_at ON cases(completed_at) WHERE completed_at IS NOT NULL;

-- =============================================
-- Migration: 20260112063811 - Stage Transition Approvals
-- =============================================
ALTER TABLE stage_transitions ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'passed', ADD COLUMN IF NOT EXISTS validation_warnings TEXT[], ADD COLUMN IF NOT EXISTS override_reason TEXT, ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50), ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id), ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS approval_comments TEXT, ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS actor_role VARCHAR(100), ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT true;
CREATE TABLE IF NOT EXISTS stage_transition_approvals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id), transition_id UUID NOT NULL REFERENCES stage_transitions(id) ON DELETE CASCADE, action VARCHAR(50) NOT NULL CHECK (action IN ('request', 'approve', 'reject', 'comment')), actor_id UUID NOT NULL REFERENCES profiles(id), actor_role VARCHAR(100), comments TEXT, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE stage_transition_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view approvals in their tenant" ON stage_transition_approvals FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create approvals in their tenant" ON stage_transition_approvals FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('transition-attachments', 'transition-attachments', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users can view transition attachments in their tenant" ON storage.objects FOR SELECT USING (bucket_id = 'transition-attachments' AND (storage.foldername(name))[1] IN (SELECT tenant_id::text FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can upload transition attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'transition-attachments' AND (storage.foldername(name))[1] IN (SELECT tenant_id::text FROM profiles WHERE id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_stage_transition_approvals_transition_id ON stage_transition_approvals(transition_id);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_case_approval ON stage_transitions(case_id, approval_status) WHERE approval_status IS NOT NULL;

-- =============================================
-- Migration: 20260114173932 - Backfill Task Client IDs
-- =============================================
UPDATE tasks t SET client_id = c.client_id FROM cases c WHERE t.case_id = c.id AND t.client_id IS NULL AND c.client_id IS NOT NULL;

-- =============================================
-- Migration: 20260115160124 - Remand Columns
-- =============================================
ALTER TABLE stage_transitions ADD COLUMN IF NOT EXISTS remand_type varchar(20), ADD COLUMN IF NOT EXISTS reason_category varchar(50), ADD COLUMN IF NOT EXISTS reason_details text, ADD COLUMN IF NOT EXISTS order_number varchar(100), ADD COLUMN IF NOT EXISTS order_date date, ADD COLUMN IF NOT EXISTS order_document_id uuid REFERENCES documents(id), ADD COLUMN IF NOT EXISTS client_visible_summary text, ADD COLUMN IF NOT EXISTS preserves_future_history boolean DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_stage_transitions_remand ON stage_transitions(case_id, transition_type) WHERE transition_type = 'Remand';

-- =============================================
-- Migration: 20260116001748 - Task Context Fields
-- =============================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS creation_stage_code varchar, ADD COLUMN IF NOT EXISTS creation_reason varchar DEFAULT 'manual', ADD COLUMN IF NOT EXISTS task_category varchar, ADD COLUMN IF NOT EXISTS sla_hours integer, ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.task_messages ADD COLUMN IF NOT EXISTS is_client_visible boolean DEFAULT false, ADD COLUMN IF NOT EXISTS approved_at timestamptz, ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_task_messages_client_visible ON public.task_messages(task_id, is_client_visible) WHERE is_client_visible = true;
CREATE INDEX IF NOT EXISTS idx_tasks_creation_reason ON public.tasks(creation_reason);
UPDATE public.tasks SET creation_reason = 'auto_bundle' WHERE (description ILIKE '%Auto-created from bundle%' OR description ILIKE '%Auto-generated%') AND creation_reason IS NULL;
UPDATE public.tasks SET creation_reason = 'manual' WHERE creation_reason IS NULL;
CREATE POLICY "Users can update client visibility on task messages" ON public.task_messages FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())) WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- =============================================
-- Migration: 20260116001823 - Fix Task Messages Update Policy
-- =============================================
DROP POLICY IF EXISTS "Users can update client visibility on task messages" ON public.task_messages;
CREATE POLICY "Users can update task messages in their tenant" ON public.task_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tenant_id = task_messages.tenant_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.tenant_id = task_messages.tenant_id));

-- =============================================
-- Migration: 20260119100225 - Employee Audit History
-- =============================================
CREATE TABLE IF NOT EXISTS public.employee_audit_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE, field_name VARCHAR(100) NOT NULL, old_value TEXT, new_value TEXT, changed_by UUID REFERENCES auth.users(id), changed_at TIMESTAMPTZ DEFAULT NOW(), CONSTRAINT employee_audit_history_tenant_id_idx UNIQUE (id, tenant_id));
CREATE INDEX idx_employee_audit_history_employee_id ON public.employee_audit_history(employee_id);
CREATE INDEX idx_employee_audit_history_changed_at ON public.employee_audit_history(changed_at DESC);
CREATE INDEX idx_employee_audit_history_tenant_id ON public.employee_audit_history(tenant_id);
ALTER TABLE public.employee_audit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_employee_audit_select" ON public.employee_audit_history FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_partner_view_employee_audit" ON public.employee_audit_history FOR SELECT TO authenticated USING (public.is_admin_or_partner(auth.uid()) AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "system_insert_employee_audit" ON public.employee_audit_history FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id());

-- =============================================
-- Migration: 20260121130035 - Employees Document Folder
-- =============================================
INSERT INTO public.document_folders (id, tenant_id, name, parent_id, case_id, description, path, created_by, is_default)
SELECT 'employees', t.id, 'Employees', NULL, NULL, 'Employee documents (resumes, ID proofs, etc.)', '/folders/employees', NULL, true
FROM public.tenants t ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Migration: 20260123014309 - Master Data Tables
-- =============================================
CREATE TABLE IF NOT EXISTS public.custom_cities (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, city_name TEXT NOT NULL, state_id TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), created_by UUID REFERENCES auth.users(id), UNIQUE(tenant_id, city_name, state_id));
ALTER TABLE public.custom_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view custom cities in their tenant" ON public.custom_cities FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can insert custom cities in their tenant" ON public.custom_cities FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can delete custom cities in their tenant" ON public.custom_cities FOR DELETE USING (tenant_id = public.get_user_tenant_id());
CREATE TABLE IF NOT EXISTS public.authority_levels (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, code TEXT NOT NULL, name TEXT NOT NULL, label TEXT, sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, allows_matter_types BOOLEAN DEFAULT false, requires_location BOOLEAN DEFAULT false, config JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(tenant_id, code));
ALTER TABLE public.authority_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view authority levels in their tenant" ON public.authority_levels FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins can manage authority levels" ON public.authority_levels FOR ALL USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE TABLE IF NOT EXISTS public.matter_types (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, authority_level_id UUID REFERENCES authority_levels(id) ON DELETE CASCADE, code TEXT NOT NULL, name TEXT NOT NULL, label TEXT, sort_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, requires_location BOOLEAN DEFAULT false, location_metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(tenant_id, authority_level_id, code));
ALTER TABLE public.matter_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view matter types in their tenant" ON public.matter_types FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins can manage matter types" ON public.matter_types FOR ALL USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE TABLE IF NOT EXISTS public.custom_outcome_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, outcome_type TEXT NOT NULL, name TEXT NOT NULL, description TEXT, icon TEXT, color TEXT, tasks JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(tenant_id, outcome_type));
ALTER TABLE public.custom_outcome_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view outcome templates in their tenant" ON public.custom_outcome_templates FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins can manage outcome templates" ON public.custom_outcome_templates FOR ALL USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE TABLE IF NOT EXISTS public.case_notification_preferences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE, google_calendar BOOLEAN DEFAULT false, outlook BOOLEAN DEFAULT false, reminder_days INTEGER[] DEFAULT '{7,3,1}', email_notifications BOOLEAN DEFAULT true, sms_notifications BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(tenant_id, case_id));
ALTER TABLE public.case_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view notification preferences for cases they can access" ON public.case_notification_preferences FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can manage notification preferences in their tenant" ON public.case_notification_preferences FOR ALL USING (tenant_id = public.get_user_tenant_id());
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS photo_path TEXT;
CREATE INDEX IF NOT EXISTS idx_custom_cities_tenant ON public.custom_cities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_cities_state ON public.custom_cities(state_id);
CREATE INDEX IF NOT EXISTS idx_authority_levels_tenant ON public.authority_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matter_types_authority ON public.matter_types(authority_level_id);
CREATE INDEX IF NOT EXISTS idx_outcome_templates_tenant ON public.custom_outcome_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_case ON public.case_notification_preferences(case_id);
CREATE TRIGGER update_authority_levels_updated_at BEFORE UPDATE ON public.authority_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matter_types_updated_at BEFORE UPDATE ON public.matter_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_outcome_templates_updated_at BEFORE UPDATE ON public.custom_outcome_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_prefs_updated_at BEFORE UPDATE ON public.case_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Migration: 20260123014407 - Fix Overly Permissive Policies
-- =============================================
DROP POLICY IF EXISTS "Users can manage notification preferences in their tenant" ON public.case_notification_preferences;
CREATE POLICY "Users can insert notification preferences in their tenant" ON public.case_notification_preferences FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can update notification preferences in their tenant" ON public.case_notification_preferences FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can delete notification preferences in their tenant" ON public.case_notification_preferences FOR DELETE USING (tenant_id = public.get_user_tenant_id());
DROP POLICY IF EXISTS "Admins can manage authority levels" ON public.authority_levels;
CREATE POLICY "Admins can insert authority levels" ON public.authority_levels FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins can update authority levels" ON public.authority_levels FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins can delete authority levels" ON public.authority_levels FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage matter types" ON public.matter_types;
CREATE POLICY "Admins can insert matter types" ON public.matter_types FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins can update matter types" ON public.matter_types FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins can delete matter types" ON public.matter_types FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage outcome templates" ON public.custom_outcome_templates;
CREATE POLICY "Admins can insert outcome templates" ON public.custom_outcome_templates FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins can update outcome templates" ON public.custom_outcome_templates FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins can delete outcome templates" ON public.custom_outcome_templates FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));

-- =============================================
-- Migration: 20260124041050 - Calendar Integrations
-- =============================================
CREATE TABLE public.calendar_integrations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, provider TEXT NOT NULL DEFAULT 'none' CHECK (provider IN ('none', 'google', 'outlook')), auto_sync BOOLEAN DEFAULT false, reminder_time INTEGER DEFAULT 30, sync_interval INTEGER DEFAULT 60, default_calendar_id TEXT, user_email TEXT, connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('disconnected', 'connected', 'error', 'expired')), last_sync_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(tenant_id));
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tenant calendar settings" ON public.calendar_integrations FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Admins can insert calendar settings" ON public.calendar_integrations FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins can update calendar settings" ON public.calendar_integrations FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "Admins can delete calendar settings" ON public.calendar_integrations FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON public.calendar_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_calendar_integrations_tenant ON public.calendar_integrations(tenant_id);

-- =============================================
-- Migration: 20260124043114 - Notifications & Data Jobs
-- =============================================
CREATE TABLE public.notifications (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, related_entity_type TEXT, related_entity_id UUID, channels TEXT[] DEFAULT ARRAY['in_app'], status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')), read BOOLEAN DEFAULT false, read_at TIMESTAMPTZ, metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.notification_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, hearing_id UUID REFERENCES public.hearings(id) ON DELETE SET NULL, case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL, type TEXT NOT NULL, reminder_type TEXT, channels TEXT[] NOT NULL, recipients TEXT[] NOT NULL, sent_at TIMESTAMPTZ NOT NULL, success BOOLEAN DEFAULT true, error_message TEXT, metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.notification_preferences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, email_enabled BOOLEAN DEFAULT true, sms_enabled BOOLEAN DEFAULT false, whatsapp_enabled BOOLEAN DEFAULT true, in_app_enabled BOOLEAN DEFAULT true, hearing_reminders BOOLEAN DEFAULT true, task_reminders BOOLEAN DEFAULT true, case_updates BOOLEAN DEFAULT true, document_shares BOOLEAN DEFAULT true, reminder_days INTEGER[] DEFAULT ARRAY[1, 0], quiet_hours_start TIME, quiet_hours_end TIME, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(tenant_id, user_id));
CREATE TABLE public.data_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, job_type TEXT NOT NULL CHECK (job_type IN ('import', 'export')), entity_type TEXT NOT NULL, file_name TEXT, file_size INTEGER, status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')), counts JSONB DEFAULT '{"total": 0, "valid": 0, "invalid": 0, "processed": 0}', mapping JSONB, errors JSONB, file_url TEXT, format TEXT, filters JSONB, record_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, tenant_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_notification_logs_tenant ON public.notification_logs(tenant_id);
CREATE INDEX idx_notification_logs_hearing ON public.notification_logs(hearing_id);
CREATE INDEX idx_notification_logs_case ON public.notification_logs(case_id);
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id, tenant_id);
CREATE INDEX idx_data_jobs_user ON public.data_jobs(user_id, tenant_id);
CREATE INDEX idx_data_jobs_status ON public.data_jobs(status);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view tenant notification logs" ON public.notification_logs FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert notification logs" ON public.notification_logs FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own jobs" ON public.data_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own jobs" ON public.data_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own jobs" ON public.data_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own jobs" ON public.data_jobs FOR DELETE USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER set_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_data_jobs_updated_at BEFORE UPDATE ON public.data_jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- Migration: 20260124044110 - Import/Export State
-- =============================================
ALTER TABLE data_jobs ADD COLUMN IF NOT EXISTS pending_data JSONB;
INSERT INTO storage.buckets (id, name, public) VALUES ('import-exports', 'import-exports', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Users manage own import/export files" ON storage.objects FOR ALL USING (bucket_id = 'import-exports' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'import-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- Migration: 20260125064448 - Employee Weekly Off Days
-- =============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS weekly_off_days text[] DEFAULT NULL;

-- =============================================
-- Migration: 20260125193644 - Stage Instances & Checklists
-- =============================================
CREATE TABLE public.stage_instances (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id), case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE, stage_key VARCHAR(50) NOT NULL, cycle_no INTEGER NOT NULL DEFAULT 1, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ, status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Remanded', 'Superseded')), created_by UUID REFERENCES public.profiles(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE public.stage_checklist_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id), stage_instance_id UUID NOT NULL REFERENCES public.stage_instances(id) ON DELETE CASCADE, item_key VARCHAR(100) NOT NULL, label VARCHAR(255) NOT NULL, required BOOLEAN NOT NULL DEFAULT true, rule_type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (rule_type IN ('auto_dms', 'auto_hearing', 'auto_field', 'manual')), status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Auto✓', 'Attested', 'Override', 'Pending')), attested_by UUID REFERENCES public.profiles(id), attested_at TIMESTAMPTZ, note TEXT, evidence_file_id UUID REFERENCES public.documents(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX idx_stage_instances_case_id ON public.stage_instances(case_id);
CREATE INDEX idx_stage_instances_tenant_stage ON public.stage_instances(tenant_id, stage_key);
CREATE INDEX idx_stage_instances_status ON public.stage_instances(status) WHERE status = 'Active';
CREATE INDEX idx_stage_checklist_stage_instance ON public.stage_checklist_items(stage_instance_id);
ALTER TABLE public.stage_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view stage instances in their tenant" ON public.stage_instances FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can create stage instances in their tenant" ON public.stage_instances FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can update stage instances in their tenant" ON public.stage_instances FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can view checklist items in their tenant" ON public.stage_checklist_items FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can create checklist items in their tenant" ON public.stage_checklist_items FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can update checklist items in their tenant" ON public.stage_checklist_items FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE TRIGGER update_stage_instances_updated_at BEFORE UPDATE ON public.stage_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stage_checklist_items_updated_at BEFORE UPDATE ON public.stage_checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_instances;
CREATE OR REPLACE FUNCTION public.create_stage_instance_on_transition() RETURNS TRIGGER AS $$ DECLARE v_existing_instance UUID; v_new_cycle_no INTEGER; BEGIN SELECT id INTO v_existing_instance FROM public.stage_instances WHERE case_id = NEW.case_id AND stage_key = NEW.to_stage AND status = 'Active'; IF v_existing_instance IS NOT NULL THEN RETURN NEW; END IF; SELECT COALESCE(MAX(cycle_no), 0) + 1 INTO v_new_cycle_no FROM public.stage_instances WHERE case_id = NEW.case_id AND stage_key = NEW.to_stage; UPDATE public.stage_instances SET status = CASE WHEN NEW.transition_type = 'Remand' THEN 'Remanded' ELSE 'Completed' END, ended_at = now(), updated_at = now() WHERE case_id = NEW.case_id AND status = 'Active'; INSERT INTO public.stage_instances (tenant_id, case_id, stage_key, cycle_no, started_at, status, created_by) VALUES (NEW.tenant_id, NEW.case_id, NEW.to_stage, v_new_cycle_no, now(), 'Active', NEW.created_by); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER trg_create_stage_instance_on_transition AFTER INSERT ON public.stage_transitions FOR EACH ROW EXECUTE FUNCTION public.create_stage_instance_on_transition();

-- =============================================
-- Migration: 20260127112055 - Judges Phase 1 Columns
-- =============================================
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS member_type varchar(50), ADD COLUMN IF NOT EXISTS authority_level varchar(50), ADD COLUMN IF NOT EXISTS qualifications jsonb DEFAULT '{}', ADD COLUMN IF NOT EXISTS tenure_details jsonb DEFAULT '{}';

-- =============================================
-- Migration: 20260127120512 - Judges Edit Columns
-- =============================================
ALTER TABLE public.judges ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id), ADD COLUMN IF NOT EXISTS address jsonb DEFAULT '{}';

-- =============================================
-- Migration: 20260128024422 - Unified Address Migration
-- =============================================
ALTER TABLE courts ADD COLUMN IF NOT EXISTS address_jsonb JSONB;
UPDATE courts SET address_jsonb = jsonb_build_object('line1', COALESCE(address, ''), 'cityName', COALESCE(city, ''), 'stateName', COALESCE(state, ''), 'pincode', '', 'countryId', 'IN', 'countryName', 'India', 'source', 'imported') WHERE address IS NOT NULL OR city IS NOT NULL;
ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS address JSONB;
CREATE INDEX IF NOT EXISTS idx_courts_address_city ON courts ((address_jsonb->>'cityName'));
CREATE INDEX IF NOT EXISTS idx_courts_address_state ON courts ((address_jsonb->>'stateName'));
CREATE INDEX IF NOT EXISTS idx_client_contacts_address_city ON client_contacts ((address->>'cityName'));
CREATE INDEX IF NOT EXISTS idx_client_contacts_address_state ON client_contacts ((address->>'stateName'));

-- =============================================
-- Migration: 20260128033115 - Employees Address Column
-- =============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address JSONB;
CREATE INDEX IF NOT EXISTS idx_employees_address_city ON employees ((address->>'cityName'));
CREATE INDEX IF NOT EXISTS idx_employees_address_state ON employees ((address->>'stateName'));

-- =============================================
-- Migration: 20260128103705 - Hearings Outcome Text
-- =============================================
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS outcome_text TEXT;

-- =============================================
-- Migration: 20260129094559 - Fix Notifications INSERT Policy
-- =============================================
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
CREATE POLICY "Users can insert notifications for same tenant" ON notifications FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

-- =============================================
-- Migration: 20260129104135 - Create Notification Function
-- =============================================
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_related_entity_type text DEFAULT NULL, p_related_entity_id uuid DEFAULT NULL, p_channels text[] DEFAULT ARRAY['in_app'], p_metadata jsonb DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$ DECLARE v_tenant_id uuid; v_notification_id uuid; BEGIN SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid(); IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Unable to determine tenant for current user'; END IF; v_notification_id := gen_random_uuid(); INSERT INTO notifications (id, tenant_id, user_id, type, title, message, related_entity_type, related_entity_id, channels, status, read, metadata, created_at) VALUES (v_notification_id, v_tenant_id, p_user_id, p_type, p_title, p_message, p_related_entity_type, p_related_entity_id, p_channels, 'pending', false, p_metadata, now()); RETURN v_notification_id; END; $$;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid, text[], jsonb) TO authenticated;

-- =============================================
-- Migration: 20260129233554 - Order/Appeal Date Fields
-- =============================================
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS order_date DATE, ADD COLUMN IF NOT EXISTS order_received_date DATE, ADD COLUMN IF NOT EXISTS appeal_filed_date DATE, ADD COLUMN IF NOT EXISTS impugned_order_no VARCHAR(100), ADD COLUMN IF NOT EXISTS impugned_order_date DATE, ADD COLUMN IF NOT EXISTS impugned_order_amount NUMERIC(15,2);

-- =============================================
-- Migration: 20260130061812 - Partner Data Scope Enforcement
-- =============================================
DROP POLICY IF EXISTS "Admin_Partner full case access" ON cases;
DROP POLICY IF EXISTS "Admins view all cases" ON cases;
DROP POLICY IF EXISTS "Admin full case access" ON cases;
CREATE POLICY "Admin full case access" ON cases FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin')) WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Partner view cases based on data_scope" ON cases FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'partner') AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid() OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id))) OR (get_employee_data_scope(auth.uid()) = 'Own Cases' AND (assigned_to = auth.uid() OR owner_id = auth.uid()))));
CREATE POLICY "Partner insert cases" ON cases FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'partner'));
CREATE POLICY "Partner update cases based on data_scope" ON cases FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'partner') AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR assigned_to = auth.uid() OR owner_id = auth.uid() OR (get_employee_data_scope(auth.uid()) = 'Team Cases' AND can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)))) WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'partner'));
CREATE POLICY "Partner delete cases based on data_scope" ON cases FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'partner') AND (get_employee_data_scope(auth.uid()) = 'All Cases' OR assigned_to = auth.uid() OR owner_id = auth.uid()));
CREATE OR REPLACE FUNCTION public.can_user_view_case(_user_id uuid, _case_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ DECLARE _case_record RECORD; _user_data_scope text; _user_tenant_id uuid; BEGIN SELECT tenant_id INTO _user_tenant_id FROM profiles WHERE id = _user_id; IF _user_tenant_id IS NULL THEN RETURN FALSE; END IF; SELECT COALESCE(data_scope, 'Team Cases') INTO _user_data_scope FROM employees WHERE id = _user_id; SELECT id, tenant_id, assigned_to, owner_id, client_id INTO _case_record FROM cases WHERE id = _case_id; IF NOT FOUND THEN RETURN FALSE; END IF; IF _case_record.tenant_id != _user_tenant_id THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') THEN RETURN TRUE; END IF; IF _user_data_scope = 'All Cases' THEN RETURN TRUE; END IF; IF (_case_record.assigned_to IS NOT NULL AND _case_record.assigned_to = _user_id) THEN RETURN TRUE; END IF; IF (_case_record.owner_id IS NOT NULL AND _case_record.owner_id = _user_id) THEN RETURN TRUE; END IF; IF _user_data_scope = 'Own Cases' THEN RETURN FALSE; END IF; IF _user_data_scope = 'Team Cases' THEN IF can_view_case_by_hierarchy(_user_id, _case_record.assigned_to, _case_record.owner_id) THEN RETURN TRUE; END IF; IF _case_record.client_id IS NOT NULL AND can_user_view_client(_user_id, _case_record.client_id) THEN RETURN TRUE; END IF; END IF; RETURN FALSE; END; $$;
CREATE OR REPLACE FUNCTION public.can_user_view_client(_user_id uuid, _client_id uuid) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' SET row_security TO 'off' AS $$ DECLARE _client RECORD; _user_tenant UUID; _user_data_scope TEXT; BEGIN IF _client_id IS NULL THEN RETURN FALSE; END IF; SELECT tenant_id INTO _user_tenant FROM profiles WHERE id = _user_id; SELECT COALESCE(data_scope, 'Team Cases') INTO _user_data_scope FROM employees WHERE id = _user_id; SELECT owner_id, data_scope, tenant_id INTO _client FROM clients WHERE id = _client_id AND tenant_id = _user_tenant; IF _client IS NULL THEN RETURN FALSE; END IF; IF has_role(_user_id, 'admin') THEN RETURN TRUE; END IF; IF _user_data_scope = 'All Cases' THEN RETURN TRUE; END IF; IF _client.owner_id = _user_id THEN RETURN TRUE; END IF; IF _client.data_scope = 'ALL' THEN RETURN TRUE; END IF; IF _client.data_scope = 'TEAM' AND _client.owner_id IS NOT NULL AND is_in_same_team(_user_id, _client.owner_id) THEN RETURN TRUE; END IF; IF _client.owner_id IS NOT NULL AND can_view_subordinate_tasks(_user_id, _client.owner_id) THEN RETURN TRUE; END IF; IF _user_data_scope = 'Team Cases' THEN IF EXISTS (SELECT 1 FROM cases c WHERE c.client_id = _client_id AND c.tenant_id = _user_tenant AND (c.assigned_to = _user_id OR c.owner_id = _user_id OR can_view_case_by_hierarchy(_user_id, c.assigned_to, c.owner_id))) THEN RETURN TRUE; END IF; END IF; RETURN FALSE; END; $$;

-- =============================================
-- Migration: 20260130133350 - Courts Residence Address
-- =============================================
ALTER TABLE courts ADD COLUMN IF NOT EXISTS residence_address JSONB;

-- =============================================
-- Migration: 20260130181937 - Drop Courts Address Columns
-- =============================================
ALTER TABLE courts DROP COLUMN IF EXISTS address;
ALTER TABLE courts DROP COLUMN IF EXISTS address_jsonb;
ALTER TABLE courts DROP COLUMN IF EXISTS residence_address;

-- =============================================
-- Migration: 20260131083526 - Staff Can Create Clients
-- =============================================
DROP POLICY IF EXISTS "Authorized users can create clients" ON public.clients;
CREATE POLICY "Authorized users can create clients" ON public.clients FOR INSERT TO authenticated WITH CHECK ((tenant_id = get_user_tenant_id()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'ca'::app_role) OR has_role(auth.uid(), 'advocate'::app_role) OR has_role(auth.uid(), 'staff'::app_role)));

-- =============================================
-- Migration: 20260205083753 - Demo Tracking Columns
-- =============================================
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);
ALTER TABLE hearings ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);
ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);
ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);
ALTER TABLE task_followups ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);
ALTER TABLE stage_transitions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_cases_is_demo ON cases(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_cases_demo_batch ON cases(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hearings_demo_batch ON hearings(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_demo_batch ON tasks(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_demo_batch ON documents(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timeline_entries_demo_batch ON timeline_entries(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communication_logs_demo_batch ON communication_logs(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_followups_demo_batch ON task_followups(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stage_transitions_demo_batch ON stage_transitions(demo_batch_id) WHERE demo_batch_id IS NOT NULL;

-- =============================================
-- Migration: 20260205110151 - Stage Workflow Tables
-- =============================================
CREATE TABLE stage_notices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id), stage_instance_id UUID REFERENCES stage_instances(id), case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE, notice_type VARCHAR(50), notice_number VARCHAR(100), notice_date DATE, due_date DATE, amount_demanded NUMERIC, section_invoked VARCHAR(100), status VARCHAR(50) DEFAULT 'Received', is_original BOOLEAN DEFAULT false, documents JSONB DEFAULT '[]', metadata JSONB DEFAULT '{}', created_by UUID REFERENCES profiles(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE stage_replies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id), notice_id UUID NOT NULL REFERENCES stage_notices(id) ON DELETE CASCADE, stage_instance_id UUID REFERENCES stage_instances(id), reply_date DATE, reply_reference VARCHAR(100), filing_status VARCHAR(50) DEFAULT 'Draft', documents JSONB DEFAULT '[]', notes TEXT, filed_by UUID REFERENCES profiles(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE stage_workflow_steps (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id), stage_instance_id UUID NOT NULL REFERENCES stage_instances(id) ON DELETE CASCADE, step_key VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'Pending', completed_at TIMESTAMPTZ, completed_by UUID REFERENCES profiles(id), notes TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(stage_instance_id, step_key));
ALTER TABLE hearings ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES stage_instances(id);
CREATE INDEX idx_stage_notices_case ON stage_notices(case_id);
CREATE INDEX idx_stage_notices_instance ON stage_notices(stage_instance_id);
CREATE INDEX idx_stage_notices_tenant ON stage_notices(tenant_id);
CREATE INDEX idx_stage_replies_notice ON stage_replies(notice_id);
CREATE INDEX idx_stage_replies_instance ON stage_replies(stage_instance_id);
CREATE INDEX idx_stage_workflow_instance ON stage_workflow_steps(stage_instance_id);
CREATE INDEX idx_hearings_stage_instance ON hearings(stage_instance_id) WHERE stage_instance_id IS NOT NULL;
ALTER TABLE stage_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_workflow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_notices_select" ON stage_notices FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND (public.is_admin_or_partner(auth.uid()) OR public.can_user_view_case(auth.uid(), case_id)));
CREATE POLICY "stage_notices_insert" ON stage_notices FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.can_user_view_case(auth.uid(), case_id));
CREATE POLICY "stage_notices_update" ON stage_notices FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.can_user_view_case(auth.uid(), case_id));
CREATE POLICY "stage_notices_delete" ON stage_notices FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "stage_replies_select" ON stage_replies FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "stage_replies_insert" ON stage_replies FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "stage_replies_update" ON stage_replies FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "stage_replies_delete" ON stage_replies FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.is_admin_or_partner(auth.uid()));
CREATE POLICY "stage_workflow_steps_select" ON stage_workflow_steps FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "stage_workflow_steps_insert" ON stage_workflow_steps FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "stage_workflow_steps_update" ON stage_workflow_steps FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE TRIGGER handle_stage_notices_updated_at BEFORE UPDATE ON stage_notices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_stage_replies_updated_at BEFORE UPDATE ON stage_replies FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_stage_workflow_steps_updated_at BEFORE UPDATE ON stage_workflow_steps FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- Migration: 20260205133609 - Notice Workflow Columns
-- =============================================
ALTER TABLE public.stage_notices ADD COLUMN IF NOT EXISTS offline_reference_no varchar, ADD COLUMN IF NOT EXISTS issuing_authority varchar, ADD COLUMN IF NOT EXISTS issuing_designation varchar, ADD COLUMN IF NOT EXISTS tax_period_start date, ADD COLUMN IF NOT EXISTS tax_period_end date, ADD COLUMN IF NOT EXISTS financial_year varchar, ADD COLUMN IF NOT EXISTS tax_amount numeric, ADD COLUMN IF NOT EXISTS interest_amount numeric, ADD COLUMN IF NOT EXISTS penalty_amount numeric, ADD COLUMN IF NOT EXISTS tax_applicable boolean DEFAULT true, ADD COLUMN IF NOT EXISTS interest_applicable boolean DEFAULT true, ADD COLUMN IF NOT EXISTS penalty_applicable boolean DEFAULT true, ADD COLUMN IF NOT EXISTS workflow_step varchar DEFAULT 'notice';
ALTER TABLE public.stage_replies ADD COLUMN IF NOT EXISTS filing_mode varchar;
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS notice_id uuid REFERENCES public.stage_notices(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS hearing_purpose varchar, ADD COLUMN IF NOT EXISTS hearing_outcome varchar;
CREATE INDEX IF NOT EXISTS idx_stage_notices_workflow_step ON public.stage_notices(workflow_step);
CREATE INDEX IF NOT EXISTS idx_hearings_notice_id ON public.hearings(notice_id);

-- =============================================
-- Migration: 20260206182355 - Lead/CRM Fields
-- =============================================
ALTER TABLE client_contacts ADD COLUMN IF NOT EXISTS lead_status text DEFAULT NULL, ADD COLUMN IF NOT EXISTS lead_source text DEFAULT NULL, ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0, ADD COLUMN IF NOT EXISTS expected_value numeric(15,2) DEFAULT NULL, ADD COLUMN IF NOT EXISTS expected_close_date date DEFAULT NULL, ADD COLUMN IF NOT EXISTS lost_reason text DEFAULT NULL, ADD COLUMN IF NOT EXISTS converted_at timestamptz DEFAULT NULL, ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT NOW();
ALTER TABLE client_contacts ADD CONSTRAINT chk_lead_status CHECK (lead_status IS NULL OR lead_status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'));
CREATE INDEX IF NOT EXISTS idx_contacts_lead_status ON client_contacts(lead_status) WHERE lead_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_owner_lead ON client_contacts(owner_user_id, lead_status) WHERE lead_status IS NOT NULL;
CREATE TABLE IF NOT EXISTS lead_activities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, contact_id uuid NOT NULL REFERENCES client_contacts(id) ON DELETE CASCADE, activity_type text NOT NULL, subject text, description text, outcome text, next_action text, next_action_date date, created_by uuid REFERENCES profiles(id), created_at timestamptz DEFAULT NOW());
ALTER TABLE lead_activities ADD CONSTRAINT chk_activity_type CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'status_change', 'conversion'));
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view lead activities for their tenant" ON lead_activities FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create lead activities for their tenant" ON lead_activities FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their own lead activities" ON lead_activities FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete their own lead activities" ON lead_activities FOR DELETE USING (created_by = auth.uid());
CREATE INDEX IF NOT EXISTS idx_lead_activities_contact ON lead_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON lead_activities(tenant_id);

-- =============================================
-- Migration: 20260207075142 - Fix Lead Status Constraint
-- =============================================
ALTER TABLE client_contacts DROP CONSTRAINT IF EXISTS chk_lead_status;
ALTER TABLE client_contacts ADD CONSTRAINT chk_lead_status CHECK (lead_status IS NULL OR lead_status = ANY (ARRAY['new', 'follow_up', 'converted', 'not_proceeding', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost']));

-- =============================================
-- Migration: 20260207085246 - Enable Clients Realtime
-- =============================================
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clients') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.clients; END IF; END $$;

-- =============================================
-- Migration: 20260210065159 - Auto-Create Stage Instance
-- =============================================
CREATE OR REPLACE FUNCTION public.initialize_stage_instance_on_case_create() RETURNS TRIGGER AS $$ BEGIN INSERT INTO public.stage_instances (tenant_id, case_id, stage_key, cycle_no, started_at, status, created_by) VALUES (NEW.tenant_id, NEW.id, COALESCE(NEW.stage_code, 'Assessment'), 1, now(), 'Active', COALESCE(NEW.owner_id, auth.uid())); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER trg_initialize_stage_instance AFTER INSERT ON public.cases FOR EACH ROW EXECUTE FUNCTION public.initialize_stage_instance_on_case_create();
INSERT INTO stage_instances (tenant_id, case_id, stage_key, cycle_no, started_at, status, created_by) SELECT c.tenant_id, c.id, COALESCE(c.stage_code, 'Assessment'), 1, COALESCE(c.created_at, now()), 'Active', c.owner_id FROM cases c WHERE NOT EXISTS (SELECT 1 FROM stage_instances si WHERE si.case_id = c.id) AND COALESCE(c.status, 'Open') != 'Completed';

-- =============================================
-- Migration: 20260210110746 - Structured Reply Details
-- =============================================
CREATE TABLE public.structured_reply_details (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES public.tenants(id), reply_id UUID NOT NULL UNIQUE REFERENCES public.stage_replies(id) ON DELETE CASCADE, case_id UUID NOT NULL REFERENCES public.cases(id), prepared_by TEXT, filed_by_name TEXT, pre_deposit_pct NUMERIC, pre_deposit_amount NUMERIC, pre_deposit_remarks TEXT, cross_obj_ref TEXT, cross_obj_date DATE, ack_reference_id TEXT, filing_proof_doc_ids JSONB DEFAULT '[]'::jsonb, delay_reason TEXT, condonation_filed BOOLEAN DEFAULT false, key_arguments TEXT, strength_weakness TEXT, expected_outcome TEXT, additional_submissions JSONB DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE public.structured_reply_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view structured reply details in their tenant" ON public.structured_reply_details FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can insert structured reply details in their tenant" ON public.structured_reply_details FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can update structured reply details in their tenant" ON public.structured_reply_details FOR UPDATE USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "Users can delete structured reply details in their tenant" ON public.structured_reply_details FOR DELETE USING (tenant_id = public.get_user_tenant_id());
CREATE TRIGGER update_structured_reply_details_updated_at BEFORE UPDATE ON public.structured_reply_details FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- Migration: 20260210121049 - Hearing PH Details
-- =============================================
ALTER TABLE public.hearings ADD COLUMN IF NOT EXISTS hearing_type VARCHAR DEFAULT 'General';
CREATE TABLE public.hearing_ph_details (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES public.tenants(id), hearing_id UUID UNIQUE NOT NULL REFERENCES public.hearings(id) ON DELETE CASCADE, case_id UUID NOT NULL REFERENCES public.cases(id), ph_notice_ref_no TEXT NOT NULL, ph_notice_date DATE NOT NULL, hearing_mode TEXT DEFAULT 'Physical', place_of_hearing TEXT, attended_by TEXT, additional_submissions JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.hearing_ph_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant users can view hearing PH details" ON public.hearing_ph_details FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant users can insert hearing PH details" ON public.hearing_ph_details FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant users can update hearing PH details" ON public.hearing_ph_details FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant users can delete hearing PH details" ON public.hearing_ph_details FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER update_hearing_ph_details_updated_at BEFORE UPDATE ON public.hearing_ph_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Migration: 20260210130307 - Stage Closure Details
-- =============================================
CREATE TABLE public.stage_closure_details (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL, stage_instance_id UUID NOT NULL UNIQUE REFERENCES public.stage_instances(id) ON DELETE CASCADE, case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE, closure_status TEXT NOT NULL, closure_ref_no TEXT, closure_date DATE, issuing_authority TEXT, officer_name TEXT, officer_designation TEXT, final_tax_amount JSONB DEFAULT '{"igst":0,"cgst":0,"sgst":0,"cess":0}', final_interest_amount NUMERIC DEFAULT 0, final_penalty_amount NUMERIC DEFAULT 0, final_total_demand NUMERIC DEFAULT 0, closure_notes TEXT, is_draft BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.stage_closure_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view closure details in their tenant" ON public.stage_closure_details FOR SELECT TO authenticated USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert closure details in their tenant" ON public.stage_closure_details FOR INSERT TO authenticated WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update closure details in their tenant" ON public.stage_closure_details FOR UPDATE TO authenticated USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete closure details in their tenant" ON public.stage_closure_details FOR DELETE TO authenticated USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE TRIGGER handle_stage_closure_details_updated_at BEFORE UPDATE ON public.stage_closure_details FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- Migration: 20260210143501 - Task & Document Stage Instance FK
-- =============================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES public.stage_instances(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES public.stage_instances(id);

-- =============================================
-- Migration: 20260211103630 - Case Intelligence Snapshots
-- =============================================
CREATE TABLE public.case_intelligence_snapshots (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE, tenant_id UUID NOT NULL REFERENCES public.tenants(id), snapshot_data JSONB NOT NULL, risk_score TEXT NOT NULL DEFAULT 'Low', financial_exposure NUMERIC DEFAULT 0, label TEXT, created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE public.case_intelligence_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view snapshots in their tenant" ON public.case_intelligence_snapshots FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create snapshots in their tenant" ON public.case_intelligence_snapshots FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete their own snapshots" ON public.case_intelligence_snapshots FOR DELETE USING (created_by = auth.uid());
CREATE INDEX idx_intelligence_snapshots_case_id ON public.case_intelligence_snapshots(case_id);
CREATE INDEX idx_intelligence_snapshots_tenant_id ON public.case_intelligence_snapshots(tenant_id);

-- =============================================
-- Migration: 20260213101934 - Admin Client Upload Policies
-- =============================================
CREATE POLICY "Admins can view client uploads" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'client-uploads' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)) AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id IS NOT NULL));
CREATE POLICY "Admins can delete client uploads" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'client-uploads' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)) AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id IS NOT NULL));

-- =============================================
-- Migration: 20260213105248 - Fix Hearing & Document Triggers
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_client_on_hearing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ DECLARE v_client_id uuid; v_case_number varchar; BEGIN SELECT client_id, case_number INTO v_client_id, v_case_number FROM cases WHERE id = NEW.case_id; IF v_client_id IS NOT NULL AND lower(NEW.status) = 'scheduled' THEN PERFORM create_client_notification(v_client_id, 'hearing_reminder', 'Hearing Scheduled', format('A hearing for case %s has been scheduled on %s', v_case_number, to_char(NEW.hearing_date, 'DD Mon YYYY')), false, true, 'hearing', NEW.id); END IF; RETURN NEW; END; $function$;
CREATE OR REPLACE FUNCTION public.notify_client_on_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ DECLARE v_client_id uuid; v_case_number varchar; BEGIN IF NEW.case_id IS NULL THEN RETURN NEW; END IF; SELECT client_id, case_number INTO v_client_id, v_case_number FROM cases WHERE id = NEW.case_id; IF v_client_id IS NOT NULL THEN PERFORM create_client_notification(v_client_id, 'document', 'New Document Uploaded', format('A new document "%s" has been uploaded for case %s', NEW.file_name, v_case_number), false, false, 'document', NEW.id); END IF; RETURN NEW; END; $function$;
CREATE TRIGGER trigger_notify_client_document AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.notify_client_on_document();

-- =============================================
-- Migration: 20260213112137 - Admin Notification on Portal Upload
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_admin_on_portal_upload() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' SET row_security TO 'off' AS $$ DECLARE v_assigned_to uuid; v_case_number varchar; v_client_name varchar; BEGIN IF NEW.file_path IS NULL OR NOT NEW.file_path LIKE 'client-uploads/%' THEN RETURN NEW; END IF; IF NEW.case_id IS NOT NULL THEN SELECT assigned_to, case_number INTO v_assigned_to, v_case_number FROM cases WHERE id = NEW.case_id; END IF; IF NEW.client_id IS NOT NULL THEN SELECT display_name INTO v_client_name FROM clients WHERE id = NEW.client_id; END IF; IF v_assigned_to IS NOT NULL THEN INSERT INTO notifications (id, tenant_id, user_id, type, title, message, related_entity_type, related_entity_id, channels, status, read, created_at) VALUES (gen_random_uuid(), NEW.tenant_id, v_assigned_to, 'document_shared', 'Client Portal: Document Uploaded', format('Client "%s" uploaded "%s" for case %s', COALESCE(v_client_name, 'Unknown'), NEW.file_name, COALESCE(v_case_number, 'N/A')), 'document', NEW.id, ARRAY['in_app'], 'pending', false, now()); END IF; RETURN NEW; END; $$;
CREATE TRIGGER trigger_notify_admin_on_portal_upload AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION notify_admin_on_portal_upload();

-- =============================================
-- Migration: 20260213115549 - All Tenant Users View Employees
-- =============================================
CREATE POLICY "All tenant users can view employees for assignment" ON public.employees FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());

-- =============================================
-- END OF MASTER SCHEMA
-- =============================================