-- Make analytics views use security_invoker mode to respect RLS of querying user
-- This ensures views enforce tenant isolation through underlying table RLS policies

-- Recreate case_activity_summary with security_invoker
DROP VIEW IF EXISTS case_activity_summary CASCADE;
CREATE VIEW case_activity_summary WITH (security_invoker = on) AS
SELECT 
  c.id as case_id,
  c.tenant_id,
  c.case_number,
  c.title,
  c.status,
  COUNT(DISTINCT h.id) as hearing_count,
  MAX(h.hearing_date) as last_hearing_date,
  COUNT(DISTINCT t.id) as task_count,
  MAX(t.updated_at) as last_task_update,
  COUNT(DISTINCT d.id) as document_count,
  MAX(d.upload_timestamp) as last_document_date
FROM cases c
LEFT JOIN hearings h ON h.case_id = c.id
LEFT JOIN tasks t ON t.case_id = c.id
LEFT JOIN documents d ON d.case_id = c.id
GROUP BY c.id, c.tenant_id, c.case_number, c.title, c.status;

-- Recreate case_analytics_summary with security_invoker
DROP VIEW IF EXISTS case_analytics_summary CASCADE;
CREATE VIEW case_analytics_summary WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  stage_code,
  COUNT(*) as total_cases,
  COUNT(*) FILTER (WHERE status = 'open') as active_cases,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_cases,
  COUNT(*) FILTER (WHERE priority = 'High' OR priority = 'Critical') as critical_cases,
  COUNT(*) FILTER (WHERE next_hearing_date < NOW() AND status = 'open') as breached_cases,
  CAST(AVG(EXTRACT(DAY FROM NOW() - created_at)) AS INTEGER) as avg_age_days
FROM cases
GROUP BY tenant_id, stage_code;

-- Recreate documents_by_category with security_invoker
DROP VIEW IF EXISTS documents_by_category CASCADE;
CREATE VIEW documents_by_category WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  category,
  COUNT(*) as document_count,
  COUNT(DISTINCT case_id) as unique_cases,
  SUM(file_size) as total_size_bytes,
  AVG(file_size) as avg_file_size_bytes
FROM documents
GROUP BY tenant_id, category;

-- Recreate documents_by_user with security_invoker
DROP VIEW IF EXISTS documents_by_user CASCADE;
CREATE VIEW documents_by_user WITH (security_invoker = on) AS
SELECT 
  d.tenant_id,
  d.uploaded_by,
  p.full_name as uploader_name,
  COUNT(*) as total_documents,
  SUM(d.file_size) as total_storage_bytes,
  COUNT(*) FILTER (WHERE d.document_status = 'Approved') as approved_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Rejected') as rejected_count,
  COUNT(*) FILTER (WHERE d.document_status = 'Pending') as pending_count
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by
GROUP BY d.tenant_id, d.uploaded_by, p.full_name;

-- Recreate employee_productivity_metrics with security_invoker
DROP VIEW IF EXISTS employee_productivity_metrics CASCADE;
CREATE VIEW employee_productivity_metrics WITH (security_invoker = on) AS
SELECT 
  e.tenant_id,
  e.id as employee_id,
  e.employee_code,
  COUNT(DISTINCT c.id) as assigned_cases,
  COUNT(DISTINCT t.id) as assigned_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed') as completed_tasks,
  AVG(EXTRACT(DAY FROM t.completed_date - t.created_at)) FILTER (WHERE t.status = 'Completed') as avg_task_completion_days
FROM employees e
LEFT JOIN cases c ON c.assigned_to = e.id
LEFT JOIN tasks t ON t.assigned_to = e.id
GROUP BY e.tenant_id, e.id, e.employee_code;

-- Recreate hearing_outcome_trends with security_invoker
DROP VIEW IF EXISTS hearing_outcome_trends CASCADE;
CREATE VIEW hearing_outcome_trends WITH (security_invoker = on) AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', hearing_date) as period,
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY tenant_id, DATE_TRUNC('month', hearing_date)), 2) as completion_rate
FROM hearings
GROUP BY tenant_id, DATE_TRUNC('month', hearing_date), status;

-- Recreate pending_review_documents with security_invoker
DROP VIEW IF EXISTS pending_review_documents CASCADE;
CREATE VIEW pending_review_documents WITH (security_invoker = on) AS
SELECT 
  d.id,
  d.tenant_id,
  d.file_name,
  d.category,
  d.uploaded_by,
  p.full_name as uploader_name,
  d.upload_timestamp,
  c.case_number,
  c.title as case_title,
  ROUND(EXTRACT(EPOCH FROM (NOW() - d.upload_timestamp)) / 86400, 1) as days_pending
FROM documents d
LEFT JOIN profiles p ON p.id = d.uploaded_by
LEFT JOIN cases c ON c.id = d.case_id
WHERE d.document_status = 'Pending';

-- Recreate storage_usage_by_tenant with security_invoker
DROP VIEW IF EXISTS storage_usage_by_tenant CASCADE;
CREATE VIEW storage_usage_by_tenant WITH (security_invoker = on) AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  t.license_tier,
  t.max_storage_gb,
  COUNT(d.id) as total_documents,
  COALESCE(SUM(d.file_size), 0) as storage_used_bytes,
  (t.max_storage_gb * 1024 * 1024 * 1024) - COALESCE(SUM(d.file_size), 0) as storage_remaining_bytes,
  ROUND((COALESCE(SUM(d.file_size), 0)::numeric / (t.max_storage_gb * 1024 * 1024 * 1024) * 100), 2) as storage_used_percentage
FROM tenants t
LEFT JOIN documents d ON d.tenant_id = t.id
GROUP BY t.id, t.name, t.license_tier, t.max_storage_gb;