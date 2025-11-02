-- Phase 3A: Analytics Infrastructure - Tables, Views, and Indexes

-- ============================================
-- 1. Analytics Snapshots for Historical Trends
-- ============================================
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

CREATE POLICY "Users can view analytics in their tenant"
ON analytics_snapshots FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "System can create analytics snapshots"
ON analytics_snapshots FOR INSERT
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin')
);

CREATE INDEX idx_analytics_snapshots_tenant_date ON analytics_snapshots(tenant_id, snapshot_date);
CREATE INDEX idx_analytics_snapshots_metric_type ON analytics_snapshots(metric_type);

-- ============================================
-- 2. Performance Baselines and Targets
-- ============================================
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

CREATE POLICY "Users can view baselines in their tenant"
ON performance_baselines FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage baselines"
ON performance_baselines FOR ALL
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND has_role(auth.uid(), 'admin')
);

CREATE INDEX idx_performance_baselines_tenant ON performance_baselines(tenant_id);

-- ============================================
-- 3. Scheduled Reports Configuration
-- ============================================
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

CREATE POLICY "Users can view scheduled reports in tenant"
ON scheduled_reports FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Authorized users can create scheduled reports"
ON scheduled_reports FOR INSERT
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
);

CREATE POLICY "Authorized users can update scheduled reports"
ON scheduled_reports FOR UPDATE
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner'))
);

CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run) WHERE enabled = TRUE;
CREATE INDEX idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);

-- ============================================
-- 4. Report Execution Logs
-- ============================================
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

CREATE POLICY "Users can view report logs in their tenant"
ON report_execution_log FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
));

CREATE INDEX idx_report_execution_log_tenant ON report_execution_log(tenant_id);
CREATE INDEX idx_report_execution_log_report ON report_execution_log(scheduled_report_id);

-- ============================================
-- 5. Analytics Views
-- ============================================

-- Case Analytics Summary View
CREATE OR REPLACE VIEW case_analytics_summary AS
SELECT 
  c.tenant_id,
  c.stage_code,
  COUNT(*) as total_cases,
  COUNT(*) FILTER (WHERE c.status = 'Active') as active_cases,
  COUNT(*) FILTER (WHERE c.status = 'Completed') as completed_cases,
  COUNT(*) FILTER (WHERE c.priority = 'Critical') as critical_cases,
  AVG(EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400)::INTEGER as avg_age_days,
  COUNT(*) FILTER (WHERE c.title LIKE '%Red%' OR 
    EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 60) as breached_cases
FROM cases c
GROUP BY c.tenant_id, c.stage_code;

-- Hearing Outcome Trends View
CREATE OR REPLACE VIEW hearing_outcome_trends AS
SELECT 
  h.tenant_id,
  DATE_TRUNC('month', h.hearing_date) as period,
  h.status,
  COUNT(*) as count,
  ROUND(AVG(CASE WHEN h.status = 'Completed' THEN 1.0 ELSE 0.0 END) * 100, 2) as completion_rate
FROM hearings h
WHERE h.hearing_date >= NOW() - INTERVAL '12 months'
GROUP BY h.tenant_id, DATE_TRUNC('month', h.hearing_date), h.status;

-- Employee Productivity Metrics View
CREATE OR REPLACE VIEW employee_productivity_metrics AS
SELECT 
  e.tenant_id,
  e.id as employee_id,
  e.employee_code,
  COUNT(DISTINCT c.id) as assigned_cases,
  COUNT(DISTINCT t.id) as assigned_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed') as completed_tasks,
  ROUND(AVG(CASE WHEN t.status = 'Completed' 
      THEN EXTRACT(EPOCH FROM (t.completed_date - t.created_at)) / 86400 
      END), 2) as avg_task_completion_days
FROM employees e
LEFT JOIN cases c ON c.assigned_to = e.id
LEFT JOIN tasks t ON t.assigned_to = e.id
GROUP BY e.tenant_id, e.id, e.employee_code;

-- Timeline Compliance Trends View
CREATE OR REPLACE VIEW timeline_compliance_trends AS
SELECT 
  c.tenant_id,
  DATE_TRUNC('week', c.created_at) as week,
  COUNT(*) as total_cases,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 <= 30) as on_time_cases,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 BETWEEN 31 AND 60) as at_risk_cases,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 60) as breached_cases,
  ROUND(COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 <= 30)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 2) as compliance_percentage
FROM cases c
WHERE c.created_at >= NOW() - INTERVAL '6 months'
GROUP BY c.tenant_id, DATE_TRUNC('week', c.created_at);

-- ============================================
-- 6. Performance Indexes on Existing Tables
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_status ON cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cases_tenant_stage ON cases(tenant_id, stage_code);
CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);
CREATE INDEX IF NOT EXISTS idx_hearings_tenant_date ON hearings(tenant_id, hearing_date);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- ============================================
-- 7. Trigger for updating updated_at
-- ============================================
CREATE TRIGGER update_performance_baselines_updated_at
BEFORE UPDATE ON performance_baselines
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();