-- Migration 004: Analytics Views and Helper Functions

-- Helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- Helper function to validate license limits
CREATE OR REPLACE FUNCTION check_tenant_limits(
  _tenant_id UUID,
  _limit_type TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant tenants;
  _current_count INTEGER;
BEGIN
  SELECT * INTO _tenant FROM tenants WHERE id = _tenant_id;
  
  IF NOT _tenant.is_active THEN
    RETURN FALSE;
  END IF;
  
  CASE _limit_type
    WHEN 'users' THEN
      SELECT COUNT(*) INTO _current_count FROM profiles WHERE tenant_id = _tenant_id;
      RETURN _current_count < _tenant.max_users;
    
    WHEN 'cases' THEN
      SELECT COUNT(*) INTO _current_count FROM cases WHERE tenant_id = _tenant_id;
      RETURN _current_count < _tenant.max_cases;
    
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$;

-- Trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _default_tenant_id UUID;
BEGIN
  -- Get tenant_id from user metadata (set during signup)
  -- If not provided, you'll need to manually assign tenant
  _default_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  
  IF _default_tenant_id IS NOT NULL THEN
    INSERT INTO profiles (id, tenant_id, full_name, phone)
    VALUES (
      NEW.id,
      _default_tenant_id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Analytics view: Documents by user
CREATE OR REPLACE VIEW documents_by_user AS
SELECT 
  d.tenant_id,
  d.uploaded_by,
  p.full_name as uploader_name,
  COUNT(*) as total_documents,
  SUM(d.file_size) as total_storage_bytes,
  COUNT(*) FILTER (WHERE d.document_status = 'Approved') as approved_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Pending') as pending_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Rejected') as rejected_count
FROM documents d
LEFT JOIN profiles p ON d.uploaded_by = p.id
WHERE d.is_latest_version = TRUE
GROUP BY d.tenant_id, d.uploaded_by, p.full_name;

-- Analytics view: Documents by category
CREATE OR REPLACE VIEW documents_by_category AS
SELECT 
  d.tenant_id,
  d.category,
  COUNT(*) as document_count,
  SUM(d.file_size) as total_size_bytes,
  AVG(d.file_size) as avg_file_size_bytes,
  COUNT(DISTINCT d.case_id) as unique_cases
FROM documents d
WHERE d.is_latest_version = TRUE
GROUP BY d.tenant_id, d.category;

-- Analytics view: Storage usage by tenant
CREATE OR REPLACE VIEW storage_usage_by_tenant AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.license_tier,
  t.max_storage_gb,
  COUNT(DISTINCT d.id) as total_documents,
  SUM(d.file_size) as storage_used_bytes,
  ROUND((SUM(d.file_size) / (t.max_storage_gb * 1073741824.0))::numeric * 100, 2) as storage_used_percentage,
  (t.max_storage_gb * 1073741824) - COALESCE(SUM(d.file_size), 0) as storage_remaining_bytes
FROM tenants t
LEFT JOIN documents d ON t.id = d.tenant_id AND d.is_latest_version = TRUE
GROUP BY t.id, t.name, t.license_tier, t.max_storage_gb;

-- Analytics view: Case activity summary
CREATE OR REPLACE VIEW case_activity_summary AS
SELECT 
  c.id as case_id,
  c.tenant_id,
  c.case_number,
  c.title,
  c.status,
  COUNT(DISTINCT d.id) as document_count,
  COUNT(DISTINCT h.id) as hearing_count,
  COUNT(DISTINCT t.id) as task_count,
  MAX(d.upload_timestamp) as last_document_date,
  MAX(h.hearing_date) as last_hearing_date,
  MAX(t.updated_at) as last_task_update
FROM cases c
LEFT JOIN documents d ON c.id = d.case_id
LEFT JOIN hearings h ON c.id = h.case_id
LEFT JOIN tasks t ON c.id = t.case_id
GROUP BY c.id, c.tenant_id, c.case_number, c.title, c.status;

-- Analytics view: Pending review documents
CREATE OR REPLACE VIEW pending_review_documents AS
SELECT 
  d.id,
  d.tenant_id,
  d.file_name,
  d.category,
  d.uploaded_by,
  p.full_name as uploader_name,
  d.upload_timestamp,
  EXTRACT(DAY FROM NOW() - d.upload_timestamp) as days_pending,
  c.case_number,
  c.title as case_title
FROM documents d
LEFT JOIN profiles p ON d.uploaded_by = p.id
LEFT JOIN cases c ON d.case_id = c.id
WHERE d.document_status = 'Pending' 
  AND d.is_latest_version = TRUE
ORDER BY d.upload_timestamp ASC;