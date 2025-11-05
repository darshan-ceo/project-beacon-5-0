# Background Jobs System - Operations Guide

**Audience:** System Administrators, DevOps Engineers  
**Classification:** Internal Use Only  
**Last Updated:** January 2025  
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing Monitoring Dashboard](#accessing-monitoring-dashboard)
3. [Understanding Job Status](#understanding-job-status)
4. [Operational Procedures](#operational-procedures)
5. [Troubleshooting Workflows](#troubleshooting-workflows)
6. [Performance Monitoring](#performance-monitoring)
7. [Security Operations](#security-operations)
8. [Backup & Recovery](#backup--recovery)
9. [Incident Response](#incident-response)
10. [Maintenance Windows](#maintenance-windows)

---

## Overview

This operations guide provides system administrators with procedures for monitoring, troubleshooting, and maintaining the Background Jobs System.

### System Components

```mermaid
graph TB
    subgraph "Infrastructure Layer"
        CRON[pg_cron Extension]
        NET[pg_net Extension]
        DB[(PostgreSQL Database)]
    end
    
    subgraph "Application Layer"
        E1[Edge Function: SLA Check]
        E2[Edge Function: Hearing Reminders]
        E3[Edge Function: Analytics Snapshot]
        E4[Edge Function: Deadline Alerts]
        E5[Edge Function: Health Check]
    end
    
    subgraph "Monitoring Layer"
        UI[Monitoring Dashboard]
        LOGS[audit_log Table]
        ALERTS[Alerting System]
    end
    
    CRON --> E1
    CRON --> E2
    CRON --> E3
    CRON --> E4
    CRON --> E5
    
    E1 --> DB
    E2 --> DB
    E3 --> DB
    E4 --> DB
    E5 --> DB
    
    E1 --> LOGS
    E2 --> LOGS
    E3 --> LOGS
    E4 --> LOGS
    E5 --> LOGS
    
    UI --> LOGS
    LOGS --> ALERTS
```

### Service Level Objectives (SLOs)

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **Job Success Rate** | ≥95% | 7 days rolling |
| **Job Execution Time** | ≤30s (p95) | Per execution |
| **Detection Latency** | ≤15 min | For SLA violations |
| **Notification Delivery** | ≥99% | Daily hearings |
| **System Uptime** | ≥99.5% | Monthly |

---

## Accessing Monitoring Dashboard

### Web UI Access

**URL:** `https://your-app-domain.lovable.app/dev-dashboard?tab=background-jobs`

**Access Requirements:**
- ✅ Active user account with Admin or Partner role
- ✅ Authenticated session
- ✅ Network access to application domain

**Navigation:**
1. Profile Icon → Dev Mode
2. Background Jobs Tab
3. View all job statuses and execution history

### Database Access

**Direct Database Queries:**

```sql
-- Connection string (use service role key)
postgresql://postgres:[SERVICE_ROLE_KEY]@db.[PROJECT_REF].supabase.co:5432/postgres

-- View cron jobs
SELECT * FROM cron.job ORDER BY jobid;

-- View recent executions
SELECT * FROM audit_log 
WHERE action_type = 'background_job_execution'
ORDER BY timestamp DESC LIMIT 20;
```

### CLI Access (Supabase CLI)

```bash
# List all Edge Functions
supabase functions list

# View Edge Function logs
supabase functions logs check-sla-and-overdue --tail

# Invoke function manually (for testing)
supabase functions invoke check-sla-and-overdue \
  --body '{"executedAt": "2025-01-15T10:30:00Z"}'
```

---

## Understanding Job Status

### Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Job Scheduled
    Pending --> Running: Cron Trigger
    Running --> Success: Execution Complete
    Running --> Failed: Error Occurred
    Success --> Pending: Next Schedule
    Failed --> Pending: Next Schedule
    Failed --> Running: Manual Retry
```

### Status Indicators

| Status | Badge Color | Icon | Meaning |
|--------|------------|------|---------|
| **Running** | Blue | ⚙️ | Currently executing |
| **Success** | Green | ✅ | Last run successful |
| **Failed** | Red | ❌ | Last run encountered error |
| **Pending** | Gray | ⏳ | Waiting for next schedule |

### Health Score Calculation

```
Health Score = (Successful Executions / Total Executions) × 100
```

**Thresholds:**
- **Healthy:** ≥95%
- **Degraded:** 80-94%
- **Unhealthy:** <80%

---

## Operational Procedures

### Daily Health Check Routine

**Morning Checklist (10 minutes):**

```bash
#!/bin/bash
# Daily health check script

echo "=== Background Jobs Health Check ==="
echo "Date: $(date)"

# 1. Check cron jobs are active
psql $DATABASE_URL -c "
SELECT jobid, jobname, active, schedule
FROM cron.job
WHERE active = false;
" | tee -a health-check.log

# 2. Check for failed executions in last 24 hours
psql $DATABASE_URL -c "
SELECT COUNT(*) as failed_jobs
FROM audit_log
WHERE action_type = 'background_job_execution'
  AND details->>'status' = 'failed'
  AND timestamp > NOW() - INTERVAL '24 hours';
" | tee -a health-check.log

# 3. Check execution times
psql $DATABASE_URL -c "
SELECT 
  details->>'job_name' as job,
  AVG((details->>'execution_time_ms')::int) as avg_ms,
  MAX((details->>'execution_time_ms')::int) as max_ms
FROM audit_log
WHERE action_type = 'background_job_execution'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY details->>'job_name';
" | tee -a health-check.log

echo "=== Health Check Complete ==="
```

### Weekly Maintenance Tasks

**Every Monday (30 minutes):**

1. **Review Execution Logs**
```sql
-- Find anomalies in execution patterns
SELECT 
  DATE(timestamp) as date,
  details->>'job_name' as job,
  COUNT(*) as executions,
  COUNT(*) FILTER (WHERE details->>'status' = 'failed') as failures
FROM audit_log
WHERE action_type = 'background_job_execution'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), details->>'job_name'
ORDER BY date DESC, job;
```

2. **Verify Edge Function Deployments**
```bash
# Check deployed versions
supabase functions list

# Compare with git repository
git log --oneline --since="7 days ago" -- supabase/functions/
```

3. **Test Manual Triggers**
- Trigger each job manually via dashboard
- Verify execution completes successfully
- Check logs for expected outputs

4. **Review Automation Rule Stats**
```sql
-- Check automation health
SELECT 
  rule_name,
  COUNT(*) as executions,
  COUNT(*) FILTER (WHERE status = 'failed') as failures,
  AVG((actions_executed::jsonb->0->>'duration_ms')::int) as avg_duration
FROM automation_logs
WHERE executed_at > NOW() - INTERVAL '7 days'
GROUP BY rule_name
ORDER BY failures DESC;
```

### Monthly Reporting

**First Week of Month:**

Generate monthly report with:
- Total job executions
- Success/failure rates per job
- Average execution times
- Automation rules triggered
- Notifications sent
- Anomalies detected

**SQL Query for Monthly Report:**
```sql
-- Monthly background jobs report
WITH job_stats AS (
  SELECT 
    details->>'job_name' as job,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE details->>'status' = 'success') as successful,
    COUNT(*) FILTER (WHERE details->>'status' = 'failed') as failed,
    AVG((details->>'execution_time_ms')::int) as avg_time_ms,
    MAX((details->>'execution_time_ms')::int) as max_time_ms
  FROM audit_log
  WHERE action_type = 'background_job_execution'
    AND timestamp >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    AND timestamp < DATE_TRUNC('month', NOW())
  GROUP BY details->>'job_name'
)
SELECT 
  job,
  total_runs,
  successful,
  failed,
  ROUND((successful::numeric / total_runs * 100), 2) as success_rate_pct,
  avg_time_ms,
  max_time_ms
FROM job_stats
ORDER BY job;
```

---

## Troubleshooting Workflows

### Workflow 1: Job Not Running on Schedule

**Decision Tree:**

```mermaid
flowchart TD
    START[Job not running] --> CHECK_ACTIVE{Is cron job<br/>active?}
    CHECK_ACTIVE -->|No| REACTIVATE[Reschedule cron job]
    CHECK_ACTIVE -->|Yes| CHECK_SCHEDULE{Is schedule<br/>correct?}
    CHECK_SCHEDULE -->|No| FIX_SCHEDULE[Update cron expression]
    CHECK_SCHEDULE -->|Yes| CHECK_EDGE{Edge Function<br/>deployed?}
    CHECK_EDGE -->|No| DEPLOY[Deploy Edge Function]
    CHECK_EDGE -->|Yes| CHECK_NETWORK{Network<br/>reachable?}
    CHECK_NETWORK -->|No| ESCALATE[Contact Supabase Support]
    CHECK_NETWORK -->|Yes| CHECK_LOGS[Review cron.job_run_details]
    
    REACTIVATE --> TEST
    FIX_SCHEDULE --> TEST
    DEPLOY --> TEST
    CHECK_LOGS --> MANUAL_TRIGGER[Try manual trigger]
    MANUAL_TRIGGER --> TEST[Test execution]
    TEST --> RESOLVED{Resolved?}
    RESOLVED -->|Yes| DONE[Monitor for 24h]
    RESOLVED -->|No| ESCALATE
```

**Step-by-Step:**

1. **Verify Cron Job is Active**
```sql
SELECT jobid, jobname, active, schedule
FROM cron.job
WHERE jobname LIKE '%your-job-name%';
```
If `active = false`, reschedule:
```sql
-- Reschedule the job
SELECT cron.schedule(
  'job-name',
  'cron-expression',
  $$SELECT net.http_post(...)$$
);
```

2. **Check Schedule Syntax**
- Verify cron expression at [crontab.guru](https://crontab.guru)
- Common mistake: `0 8 * * *` (daily 8 AM) vs `*/8 * * * *` (every 8 min)

3. **Verify Edge Function Deployment**
```bash
curl https://[PROJECT_REF].supabase.co/functions/v1/check-sla-and-overdue \
  -H "Authorization: Bearer [ANON_KEY]" \
  -X POST
```
If 404: Deploy function with `supabase functions deploy check-sla-and-overdue`

4. **Review Execution History**
```sql
SELECT jobid, runid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'your-job-name')
ORDER BY start_time DESC
LIMIT 10;
```

---

### Workflow 2: Job Failing Consistently

**Diagnostic Steps:**

1. **Check Error Logs**
```sql
SELECT id, timestamp, details
FROM audit_log
WHERE action_type = 'background_job_execution'
  AND details->>'status' = 'failed'
  AND details->>'job_name' = 'check-sla-and-overdue'
ORDER BY timestamp DESC
LIMIT 5;
```

2. **Identify Error Pattern**

| Error Message | Root Cause | Solution |
|--------------|------------|----------|
| "Unauthorized" | Invalid API key | Verify `LOVABLE_API_KEY` secret |
| "Database connection timeout" | Network/DB issue | Check Supabase status page |
| "RLS policy violation" | Using anon key instead of service role | Update Edge Function to use `SUPABASE_SERVICE_ROLE_KEY` |
| "Function not found" | Edge Function not deployed | Run `supabase functions deploy` |
| "JSON parse error" | Malformed request body | Check cron job `body` parameter |

3. **Test in Isolation**
```bash
# Invoke Edge Function directly with verbose logging
supabase functions invoke check-sla-and-overdue \
  --body '{"executedAt": "2025-01-15T10:30:00Z"}' \
  --debug
```

4. **Check Database Connectivity**
```sql
-- Test from Edge Function perspective
SELECT NOW(); -- Should return current timestamp
```

5. **Review RLS Policies**
```sql
-- Check if service role can access required tables
SET ROLE service_role;
SELECT * FROM tasks LIMIT 1;
SELECT * FROM hearings LIMIT 1;
RESET ROLE;
```

---

### Workflow 3: Performance Degradation

**Symptoms:**
- Execution time >30 seconds
- Timeout errors
- Database CPU spikes

**Diagnostic Query:**
```sql
-- Find slow-running jobs
SELECT 
  details->>'job_name' as job,
  timestamp,
  (details->>'execution_time_ms')::int as duration_ms
FROM audit_log
WHERE action_type = 'background_job_execution'
  AND (details->>'execution_time_ms')::int > 30000 -- >30 seconds
ORDER BY timestamp DESC
LIMIT 20;
```

**Optimization Steps:**

1. **Add Database Indexes**
```sql
-- Index for SLA check queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status 
ON tasks(due_date, status, tenant_id);

-- Index for hearing queries
CREATE INDEX IF NOT EXISTS idx_hearings_date_status 
ON hearings(hearing_date, status, tenant_id);
```

2. **Optimize Queries**
```typescript
// Before: Full table scan
const tasks = await supabase.from('tasks').select('*');

// After: Filtered query with index
const tasks = await supabase
  .from('tasks')
  .select('id, title, due_date, status')
  .lt('due_date', new Date())
  .neq('status', 'Completed')
  .eq('tenant_id', tenantId)
  .limit(100);
```

3. **Implement Batch Processing**
```typescript
// Process in chunks of 100
const BATCH_SIZE = 100;
let offset = 0;

while (true) {
  const { data: batch } = await supabase
    .from('tasks')
    .select('*')
    .range(offset, offset + BATCH_SIZE - 1);
    
  if (!batch || batch.length === 0) break;
  
  await processBatch(batch);
  offset += BATCH_SIZE;
}
```

4. **Enable Query Logging**
```sql
-- Enable slow query log (run as superuser)
ALTER DATABASE postgres SET log_min_duration_statement = 1000; -- Log queries >1s
```

---

## Performance Monitoring

### Key Performance Indicators (KPIs)

| KPI | Target | Measurement | Alert Threshold |
|-----|--------|-------------|-----------------|
| Execution Time (p50) | <5s | Median from last 100 runs | >10s |
| Execution Time (p95) | <30s | 95th percentile | >60s |
| Success Rate | ≥95% | Last 7 days rolling | <90% |
| Notification Delivery | ≥99% | Daily hearings | <95% |
| Database CPU | <50% | During job execution | >80% |
| Memory Usage | <200MB | Edge Function runtime | >500MB |

### Monitoring Dashboard Metrics

```sql
-- Real-time performance dashboard
SELECT 
  details->>'job_name' as job,
  COUNT(*) as total_runs,
  AVG((details->>'execution_time_ms')::int) as avg_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (details->>'execution_time_ms')::int) as p95_time_ms,
  COUNT(*) FILTER (WHERE details->>'status' = 'success') as successes,
  COUNT(*) FILTER (WHERE details->>'status' = 'failed') as failures
FROM audit_log
WHERE action_type = 'background_job_execution'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY details->>'job_name';
```

### Alerting Rules

**CRITICAL Alerts (Immediate Response):**
- ❌ Job fails 3 consecutive times
- ❌ Execution time >2x expected for 3 consecutive runs
- ❌ No jobs executed in 24 hours
- ❌ Database connection failures

**WARNING Alerts (Response within 4 hours):**
- ⚠️ Success rate <90% in last 24 hours
- ⚠️ Execution time >1.5x expected
- ⚠️ Single job failure (may be transient)

**INFO Alerts (Review during next business day):**
- ℹ️ Anomaly detected in analytics snapshot
- ℹ️ Automation rule triggered >10 times in 1 hour
- ℹ️ Notification delivery rate <99%

---

## Security Operations

### Access Control

**Who Has Access:**
- ✅ **Admins:** Full monitoring + manual triggers
- ✅ **Partners:** View-only monitoring
- ❌ **Managers:** No access
- ❌ **Users:** No access

**Audit Logging:**
```sql
-- Log all manual job triggers
INSERT INTO audit_log (tenant_id, user_id, action_type, details)
VALUES (
  :tenant_id,
  :user_id,
  'manual_job_trigger',
  jsonb_build_object('job_name', :job_name, 'timestamp', NOW())
);
```

### Secret Rotation

**Quarterly Secret Rotation:**

1. **Rotate LOVABLE_API_KEY**
```bash
# Generate new API key in Supabase Vault
# Update in all cron jobs
SELECT cron.unschedule('job-name');
SELECT cron.schedule('job-name', 'schedule', 
  $$SELECT net.http_post(headers:='{"Authorization": "Bearer NEW_KEY"}'...)$$
);
```

2. **Rotate Database Credentials**
```bash
# Use Supabase dashboard to rotate service role key
# Update Edge Function environment variables
# Redeploy Edge Functions
supabase functions deploy --no-verify-jwt
```

### Compliance Logging

**Retention Policy:**
- `audit_log`: 90 days retention
- `automation_logs`: 180 days retention
- `cron.job_run_details`: 30 days retention (Supabase default)

**Archival Process:**
```sql
-- Archive old logs to cold storage (monthly)
COPY (
  SELECT * FROM audit_log
  WHERE action_type = 'background_job_execution'
    AND timestamp < NOW() - INTERVAL '90 days'
) TO '/archive/audit_log_2024_Q4.csv' CSV HEADER;

-- Delete archived records
DELETE FROM audit_log
WHERE action_type = 'background_job_execution'
  AND timestamp < NOW() - INTERVAL '90 days';
```

---

## Backup & Recovery

### Backup Strategy

**Daily Automated Backups** (via Supabase):
- ✅ Full database backup at 2 AM UTC
- ✅ Point-in-time recovery (PITR) enabled
- ✅ 7-day retention on free tier, 30-day on pro

**Manual Backups Before Changes:**
```bash
# Before modifying cron jobs
pg_dump -h db.[PROJECT_REF].supabase.co \
  -U postgres \
  -t cron.job \
  -t cron.job_run_details \
  > backup_cron_$(date +%Y%m%d).sql
```

### Recovery Procedures

**Scenario 1: Cron Job Accidentally Deleted**

```sql
-- Restore from backup
\i backup_cron_20250115.sql

-- Verify restoration
SELECT * FROM cron.job WHERE jobname = 'recovered-job-name';
```

**Scenario 2: Edge Function Corrupted**

```bash
# Rollback to previous deployment
git checkout main~1 -- supabase/functions/check-sla-and-overdue
supabase functions deploy check-sla-and-overdue

# Verify function works
supabase functions invoke check-sla-and-overdue --body '{}'
```

**Scenario 3: Database Connection Lost**

```sql
-- Check active connections
SELECT * FROM pg_stat_activity 
WHERE datname = 'postgres' 
  AND usename = 'postgres';

-- Terminate hanging connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'postgres'
  AND state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

---

## Incident Response

### Severity Levels

| Severity | Definition | Response Time | Example |
|----------|-----------|---------------|---------|
| **P0 - Critical** | All jobs down | 15 minutes | Database outage |
| **P1 - High** | Single job down >4 hours | 1 hour | SLA check failing |
| **P2 - Medium** | Degraded performance | 4 hours | Slow execution times |
| **P3 - Low** | Minor issue, workaround available | 24 hours | Single transient failure |

### Incident Response Playbook

**P0 - Critical Incident:**

1. **Acknowledge (within 5 minutes)**
   - Update status page
   - Notify stakeholders

2. **Assess (within 10 minutes)**
   - Check Supabase status page
   - Review database connectivity
   - Check Edge Function logs

3. **Mitigate (within 15 minutes)**
   - Enable maintenance mode if needed
   - Manually trigger critical jobs
   - Escalate to Supabase support

4. **Resolve (within 4 hours)**
   - Fix root cause
   - Verify all jobs running
   - Run manual health check

5. **Post-Mortem (within 48 hours)**
   - Document incident timeline
   - Identify root cause
   - Implement preventive measures

**Incident Communication Template:**

```
INCIDENT ALERT - Background Jobs System
Severity: P1 - High
Status: Investigating
Detected: 2025-01-15 10:30 UTC
Impact: Hearing reminders not being sent

Timeline:
10:30 - Issue detected via monitoring dashboard
10:35 - Incident acknowledged, team notified
10:40 - Root cause identified: Edge Function deployment failed
10:45 - Fix deployed, testing in progress
10:50 - Verified reminders sending successfully
10:55 - Incident resolved, monitoring for recurrence

Root Cause: Deployment script error in CI/CD pipeline
Prevention: Added pre-deployment validation checks

Next Update: 24 hours (unless issue recurs)
```

---

## Maintenance Windows

### Planned Maintenance

**Monthly Maintenance Window:**
- **When:** First Sunday of month, 2:00-4:00 AM UTC
- **Duration:** 2 hours
- **Impact:** Jobs may be paused temporarily

**Maintenance Activities:**
- Database index optimization
- Edge Function redeployment
- Secret rotation (quarterly)
- Log archival and cleanup
- Performance testing

**Pre-Maintenance Checklist:**
```bash
#!/bin/bash
# Run 24 hours before maintenance

echo "=== Pre-Maintenance Checklist ==="

# 1. Backup cron jobs
pg_dump -t cron.job > backup_cron.sql

# 2. Document current job status
psql -c "SELECT * FROM cron.job" > job_status_before.txt

# 3. Create system snapshot
supabase db dump > db_snapshot.sql

# 4. Notify stakeholders
echo "Maintenance window: $(date -d 'tomorrow 2:00' '+%Y-%m-%d %H:%M') UTC"

echo "=== Checklist Complete ==="
```

**Post-Maintenance Verification:**
```bash
#!/bin/bash
# Run immediately after maintenance

echo "=== Post-Maintenance Verification ==="

# 1. Verify all cron jobs active
psql -c "SELECT jobname, active FROM cron.job WHERE active = false;"

# 2. Trigger manual test of all jobs
for job in check-sla-and-overdue send-hearing-reminders analytics-snapshot check-upcoming-deadlines automation-health-check; do
  supabase functions invoke $job --body '{}'
done

# 3. Check for errors
psql -c "SELECT COUNT(*) FROM audit_log WHERE action_type = 'background_job_execution' AND details->>'status' = 'failed' AND timestamp > NOW() - INTERVAL '1 hour';"

echo "=== Verification Complete ==="
```

---

## Escalation Contacts

| Issue Type | Primary Contact | Secondary Contact | Escalation |
|-----------|----------------|-------------------|------------|
| Database Issues | DBA Team | DevOps Lead | CTO |
| Edge Function Errors | Backend Team | Tech Lead | VP Engineering |
| Notification Failures | Integration Team | Backend Team | Product Manager |
| Security Incidents | Security Team | CISO | CEO |
| Supabase Platform | Supabase Support | DevOps Lead | CTO |

**Emergency Contacts:**
- **DBA Team:** dba@company.com | +1-XXX-XXX-XXXX
- **DevOps On-Call:** devops-oncall@company.com | PagerDuty
- **Supabase Support:** support@supabase.com | Dashboard → Support

---

## Related Documentation

- [Background Jobs System - Technical Documentation](./BACKGROUND_JOBS_SYSTEM.md)
- [Background Jobs User Guide](./BACKGROUND_JOBS_USER_GUIDE.md)
- [Edge Functions API Reference](./EDGE_FUNCTIONS_REFERENCE.md)
- [Incident Response Playbook](./INCIDENT_RESPONSE.md) *(internal)*

---

**Document Owner:** DevOps Team  
**Review Cycle:** Quarterly  
**Next Review:** April 2025
