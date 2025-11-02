-- Phase 5: Security Hardening

-- 1. Fix Security Definer Views (Critical)
-- Drop and recreate views without SECURITY DEFINER to prevent RLS bypass

DROP VIEW IF EXISTS case_activity_summary;
CREATE VIEW case_activity_summary 
WITH (security_invoker = on)
AS
SELECT 
  c.id AS case_id,
  c.tenant_id,
  c.case_number,
  c.title,
  c.status,
  COUNT(DISTINCT h.id) AS hearing_count,
  MAX(h.hearing_date) AS last_hearing_date,
  COUNT(DISTINCT t.id) AS task_count,
  MAX(t.updated_at) AS last_task_update,
  COUNT(DISTINCT d.id) AS document_count,
  MAX(d.upload_timestamp) AS last_document_date
FROM cases c
LEFT JOIN hearings h ON h.case_id = c.id
LEFT JOIN tasks t ON t.case_id = c.id
LEFT JOIN documents d ON d.case_id = c.id
GROUP BY c.id, c.tenant_id, c.case_number, c.title, c.status;

DROP VIEW IF EXISTS documents_by_category;
CREATE VIEW documents_by_category
WITH (security_invoker = on)
AS
SELECT 
  tenant_id,
  category,
  COUNT(*) AS document_count,
  SUM(file_size) AS total_size_bytes,
  AVG(file_size) AS avg_file_size_bytes,
  COUNT(DISTINCT case_id) AS unique_cases
FROM documents
WHERE category IS NOT NULL
GROUP BY tenant_id, category;

DROP VIEW IF EXISTS documents_by_user;
CREATE VIEW documents_by_user
WITH (security_invoker = on)
AS
SELECT 
  d.tenant_id,
  d.uploaded_by,
  p.full_name AS uploader_name,
  COUNT(*) AS total_documents,
  SUM(d.file_size) AS total_storage_bytes,
  COUNT(*) FILTER (WHERE d.document_status = 'Approved') AS approved_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Pending') AS pending_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Rejected') AS rejected_count
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by
GROUP BY d.tenant_id, d.uploaded_by, p.full_name;

DROP VIEW IF EXISTS pending_review_documents;
CREATE VIEW pending_review_documents
WITH (security_invoker = on)
AS
SELECT 
  d.id,
  d.tenant_id,
  d.file_name,
  d.category,
  d.upload_timestamp,
  d.uploaded_by,
  p.full_name AS uploader_name,
  c.case_number,
  c.title AS case_title,
  EXTRACT(DAY FROM NOW() - d.upload_timestamp) AS days_pending
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by
LEFT JOIN cases c ON c.id = d.case_id
WHERE d.document_status = 'Pending'
ORDER BY d.upload_timestamp ASC;

DROP VIEW IF EXISTS storage_usage_by_tenant;
CREATE VIEW storage_usage_by_tenant
WITH (security_invoker = on)
AS
SELECT 
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.license_tier,
  t.max_storage_gb,
  COALESCE(SUM(d.file_size), 0) AS storage_used_bytes,
  COUNT(d.id) AS total_documents,
  (t.max_storage_gb * 1024 * 1024 * 1024) - COALESCE(SUM(d.file_size), 0) AS storage_remaining_bytes,
  (COALESCE(SUM(d.file_size), 0)::NUMERIC / NULLIF(t.max_storage_gb * 1024 * 1024 * 1024, 0) * 100) AS storage_used_percentage
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
GROUP BY t.id, t.name, t.license_tier, t.max_storage_gb;

-- 2. Enable Leaked Password Protection (High Priority)
-- Note: This is configured at the auth config level, handled via configure-auth tool

-- 3. Add indexes for performance on security-critical queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_active ON user_roles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_email ON employees(tenant_id, email);

-- 4. Add audit log policies if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_log' AND policyname = 'Users can view audit logs in their tenant'
  ) THEN
    CREATE POLICY "Users can view audit logs in their tenant"
    ON audit_log FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_log' AND policyname = 'System can create audit logs'
  ) THEN
    CREATE POLICY "System can create audit logs"
    ON audit_log FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;