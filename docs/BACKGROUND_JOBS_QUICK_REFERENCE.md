# Background Jobs - Quick Reference Card

**Version:** 1.0.0 | **Last Updated:** January 2025

---

## Job Schedule Table

| Job Name | Schedule | Cron Expression | Frequency |
|----------|----------|-----------------|-----------|
| SLA & Overdue Check | Every 15 minutes | `*/15 * * * *` | 96/day |
| Hearing Reminders | Daily at 8:00 AM | `0 8 * * *` | 1/day |
| Analytics Snapshot | Daily at 11:59 PM | `59 23 * * *` | 1/day |
| Deadline Alerts | Daily at 9:00 AM | `0 9 * * *` | 1/day |
| Automation Health Check | Daily at 7:00 AM | `0 7 * * *` | 1/day |

---

## Common SQL Commands

```sql
-- List all cron jobs
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;

-- Check job execution history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- View recent background job logs
SELECT id, timestamp, details->>'job_name', details->>'status'
FROM audit_log 
WHERE action_type = 'background_job_execution'
ORDER BY timestamp DESC LIMIT 20;

-- Unschedule a job
SELECT cron.unschedule('job-name-here');

-- Reschedule a job
SELECT cron.schedule('job-name', '*/15 * * * *', $$SELECT net.http_post(...)$$);
```

---

## Top 5 Troubleshooting Quick Checks

| Issue | Quick Check | Fix |
|-------|-------------|-----|
| 🔴 Job not running | `SELECT active FROM cron.job WHERE jobname = 'job-name'` | Reschedule if `active = false` |
| 🔴 Job failing | Check `audit_log` for error details | Verify API key, redeploy Edge Function |
| 🔴 Slow execution | Check execution_time_ms in logs | Add database indexes, optimize queries |
| 🔴 Old "Last Run" | Check if cron job exists and is active | Reschedule job or check Edge Function |
| 🔴 No notifications | Verify email addresses in profiles table | Update user profiles, check email service |

---

## Key Metrics Dashboard

```
Healthy System Indicators:
✅ Success Rate: >95%
✅ Avg Execution Time: <10s
✅ Last Run: Within expected window
✅ No failed jobs in last 24h
✅ Manual triggers work

Unhealthy System Indicators:
❌ Success Rate: <90%
❌ Avg Execution Time: >30s
❌ Last Run: >24 hours ago
❌ Multiple failures
❌ Manual triggers fail
```

---

## Emergency Contacts

| Issue Type | Contact | Response Time |
|-----------|---------|---------------|
| System Down (P0) | DevOps On-Call | 15 minutes |
| Job Failures (P1) | Backend Team | 1 hour |
| Performance Issues (P2) | Database Team | 4 hours |
| General Questions | Tech Support | 24 hours |

---

## Edge Function Endpoints

```
Base URL: https://[PROJECT_REF].supabase.co/functions/v1/

POST /check-sla-and-overdue
POST /send-hearing-reminders  
POST /analytics-snapshot
POST /check-upcoming-deadlines
POST /automation-health-check

Auth: Bearer [LOVABLE_API_KEY]
```
