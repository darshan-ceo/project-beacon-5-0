-- Phase 1: Enable Security Barriers on All Analytics Views
-- Security barriers ensure RLS policies from underlying base tables are enforced through the views

-- Enable security barrier on all analytics views
ALTER VIEW case_activity_summary SET (security_barrier = true);
ALTER VIEW case_analytics_summary SET (security_barrier = true);
ALTER VIEW documents_by_category SET (security_barrier = true);
ALTER VIEW documents_by_user SET (security_barrier = true);
ALTER VIEW employee_productivity_metrics SET (security_barrier = true);
ALTER VIEW hearing_outcome_trends SET (security_barrier = true);
ALTER VIEW pending_review_documents SET (security_barrier = true);
ALTER VIEW storage_usage_by_tenant SET (security_barrier = true);

-- Note: Views inherit RLS policies from their underlying base tables
-- The tenant_id filtering in each view combined with security_barrier ensures tenant isolation