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

-- == CONTINUED_IN_NEXT_CHUNK ==