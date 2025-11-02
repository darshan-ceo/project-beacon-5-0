-- Migration 003: Document Management System

-- Document folders (hierarchical structure)
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

-- Documents table (core document management)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- File metadata
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  storage_url TEXT,
  
  -- Mandatory linkage (at least one required)
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  hearing_id UUID REFERENCES hearings(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  
  -- Document metadata
  category VARCHAR(50) CHECK (category IN (
    'Notice', 'Reply', 'Adjournment', 'Order', 'Submission', 'Miscellaneous'
  )),
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  role VARCHAR(20),
  upload_timestamp TIMESTAMPTZ DEFAULT NOW(),
  remarks TEXT,
  
  -- Version control
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT TRUE,
  parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Review workflow
  document_status VARCHAR(20) DEFAULT 'Pending' CHECK (document_status IN (
    'Pending', 'Approved', 'Rejected'
  )),
  reviewer_id UUID REFERENCES auth.users(id),
  review_date TIMESTAMPTZ,
  review_remarks TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: at least one linkage required
  CONSTRAINT at_least_one_link CHECK (
    case_id IS NOT NULL OR 
    hearing_id IS NOT NULL OR 
    task_id IS NOT NULL OR
    client_id IS NOT NULL
  )
);

-- Document versions (version history)
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

-- Document tags (flexible categorization)
CREATE TABLE document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  tag VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, tag)
);

-- Audit log (comprehensive audit trail)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'upload', 'update', 'delete', 'view', 'download', 
    'approve', 'reject', 'version_create', 'share', 'comment'
  )),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  details JSONB
);

-- Enable RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_folders
CREATE POLICY "Users can view folders in their tenant"
  ON document_folders FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage folders in their tenant"
  ON document_folders FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'partner') OR 
      has_role(auth.uid(), 'manager')
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their tenant"
  ON documents FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own documents or with permission"
  ON documents FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) AND (
      uploaded_by = auth.uid() OR
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'partner')
    )
  );

CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ) AND (
      has_role(auth.uid(), 'admin') OR 
      has_role(auth.uid(), 'partner')
    )
  );

-- RLS Policies for document_versions
CREATE POLICY "Users can view document versions in their tenant"
  ON document_versions FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can create versions"
  ON document_versions FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for document_tags
CREATE POLICY "Users can view document tags in their tenant"
  ON document_tags FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM documents WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage document tags"
  ON document_tags FOR ALL
  USING (
    document_id IN (
      SELECT id FROM documents WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- RLS Policies for audit_log
CREATE POLICY "Users can view audit logs in their tenant"
  ON audit_log FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create indexes
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

-- Create triggers
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();