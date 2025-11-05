# Background Jobs System - User Guide

**Audience:** System Administrators, Partners, Managers  
**Last Updated:** January 2025  
**Version:** 1.0.0

---

## Table of Contents

1. [Introduction](#introduction)
2. [Accessing the Monitoring Dashboard](#accessing-the-monitoring-dashboard)
3. [Understanding the Dashboard](#understanding-the-dashboard)
4. [Monitoring Job Status](#monitoring-job-status)
5. [Manual Job Triggers](#manual-job-triggers)
6. [Reading Job Logs](#reading-job-logs)
7. [Common Scenarios](#common-scenarios)
8. [Best Practices](#best-practices)
9. [Frequently Asked Questions](#frequently-asked-questions)

---

## Introduction

### What Are Background Jobs?

Background jobs are **automated tasks that run on the server** 24/7 to keep your GST Litigation Management System running smoothly. Unlike tasks that require someone to be logged in, these jobs work continuously in the background to:

- ✅ Monitor SLA compliance and detect overdue tasks
- ✅ Send daily hearing reminders to team members
- ✅ Capture analytics snapshots for historical reporting
- ✅ Alert you to upcoming deadlines
- ✅ Monitor automation system health

### Why Background Jobs Matter

**Before background jobs:** SLA monitoring only worked when someone had the app open in their browser. If everyone logged out, critical checks stopped running.

**With background jobs:** The system works 24/7, even when no one is logged in. You get reliable, timely alerts and never miss important deadlines.

### Who Can Access Background Jobs?

**Admin and Partner roles** can:
- ✅ View the monitoring dashboard
- ✅ See job execution history
- ✅ Manually trigger jobs
- ✅ Review job logs

**Other roles** (Manager, CA, Advocate, User) cannot access background jobs monitoring.

---

## Accessing the Monitoring Dashboard

### Step 1: Navigate to Dev Dashboard

1. Click your **profile icon** in the top-right corner
2. Select **"Dev Mode"** from the dropdown menu
3. You'll be redirected to the Dev Dashboard

![Dev Dashboard Access](../assets/dev-dashboard-access.png)

### Step 2: Open Background Jobs Tab

In the Dev Dashboard, you'll see several tabs at the top:
- Overview
- Data Seeding
- Environment
- Advanced Tools
- **Background Jobs** ← Click here

![Background Jobs Tab](../assets/background-jobs-tab.png)

---

## Understanding the Dashboard

### Dashboard Layout

The Background Jobs dashboard shows:

```
┌──────────────────────────────────────────────────────────────┐
│ 📊 Background Jobs Monitor                                    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌────────────────────────────────┐ ┌─────────────────────┐   │
│ │ SLA & Overdue Check            │ │ Status: Running     │   │
│ │ Frequency: Every 15 minutes    │ │ Last Run: 2 min ago │   │
│ │                                │ │ [Run Now]           │   │
│ │ Checks tasks for SLA violations│ │                     │   │
│ └────────────────────────────────┘ └─────────────────────┘   │
│                                                                │
│ ┌────────────────────────────────┐ ┌─────────────────────┐   │
│ │ Hearing Reminders              │ │ Status: Success     │   │
│ │ Frequency: Daily at 8:00 AM    │ │ Last Run: 3 hrs ago │   │
│ │                                │ │ [Run Now]           │   │
│ │ Sends daily hearing reminders  │ │                     │   │
│ └────────────────────────────────┘ └─────────────────────┘   │
│                                                                │
│ [Additional jobs shown below...]                              │
└──────────────────────────────────────────────────────────────┘
```

### Job Card Components

Each job is displayed in a card with:

1. **Job Name:** "SLA & Overdue Check", "Hearing Reminders", etc.
2. **Description:** What the job does
3. **Frequency:** How often it runs (e.g., "Every 15 minutes", "Daily at 8 AM")
4. **Status Badge:** Current state (Running, Success, Failed, Pending)
5. **Last Run Time:** When it last executed (e.g., "2 minutes ago")
6. **Run Now Button:** Manual trigger for immediate execution

---

## Monitoring Job Status

### Status Indicators

| Badge | Meaning | What to Do |
|-------|---------|------------|
| 🟢 **Running** | Job is currently executing | Wait for completion (usually <30 seconds) |
| ✅ **Success** | Last execution completed successfully | No action needed |
| ❌ **Failed** | Last execution encountered an error | Click job card to see error details |
| ⏳ **Pending** | Waiting for next scheduled run | No action needed |

### Understanding "Last Run" Times

The "Last Run" timestamp shows when the job last executed:

- **"2 minutes ago"** - Job executed very recently ✅
- **"3 hours ago"** - Normal for jobs that run daily ✅
- **"2 days ago"** - **WARNING** - Job may not be running ⚠️

**Expected "Last Run" Times:**

| Job | Expected Max Age | Alert If |
|-----|-----------------|----------|
| SLA & Overdue Check | 15 minutes | >30 minutes |
| Hearing Reminders | 24 hours | >36 hours |
| Analytics Snapshot | 24 hours | >36 hours |
| Deadline Alerts | 24 hours | >36 hours |
| Automation Health Check | 24 hours | >36 hours |

### Checking Job Health

**Healthy System Indicators:**
- ✅ All jobs show "Success" or "Pending" status
- ✅ "Last Run" times are within expected ranges
- ✅ No error messages in logs
- ✅ Manual triggers complete successfully

**Unhealthy System Indicators:**
- ❌ Multiple jobs showing "Failed" status
- ❌ "Last Run" times are >24 hours old
- ❌ Error messages in logs
- ❌ Manual triggers fail repeatedly

---

## Manual Job Triggers

### When to Manually Trigger a Job

Use the **"Run Now"** button when:

1. **Testing:** Verifying a job works after configuration changes
2. **Urgent Check:** Need immediate SLA check before a client meeting
3. **On-Demand Reminders:** Send hearing reminders outside normal schedule
4. **System Recovery:** Job failed, and you want to retry immediately
5. **Data Refresh:** Force analytics snapshot before generating reports

### How to Manually Trigger a Job

**Step 1:** Locate the job card in the dashboard

**Step 2:** Click the **"Run Now"** button in the top-right corner of the card

**Step 3:** Wait for execution (typically 5-30 seconds)

**Step 4:** Observe status change:
```
Before:  Status: Success | Last Run: 3 hours ago
During:  Status: Running | Last Run: Just now
After:   Status: Success | Last Run: Just now
```

**Step 5:** Check toast notification for result:
- ✅ **Success:** "Job executed successfully - 5 overdue tasks found"
- ❌ **Failed:** "Job execution failed - Check logs for details"

### Manual Trigger Best Practices

**DO:**
- ✅ Use manual triggers for testing and urgent scenarios
- ✅ Wait for completion before triggering again (avoid spam)
- ✅ Check logs after manual trigger to verify results
- ✅ Document why you triggered a job manually (for audit trail)

**DON'T:**
- ❌ Spam the "Run Now" button (jobs queue, don't execute twice)
- ❌ Use manual triggers as primary method (defeats automation purpose)
- ❌ Trigger jobs during known outage windows
- ❌ Expect instant results (some jobs take 30+ seconds)

---

## Reading Job Logs

### Accessing Execution Logs

**Method 1: In-App Logs** (Coming Soon)
- Click on a job card to expand details
- View last 10 executions with timestamps and results

**Method 2: Database Query**
```sql
-- View recent job executions
SELECT 
  id,
  action_type,
  details->>'job_name' as job,
  details->>'status' as status,
  details->>'execution_time_ms' as duration_ms,
  timestamp
FROM audit_log
WHERE action_type = 'background_job_execution'
ORDER BY timestamp DESC
LIMIT 20;
```

### Log Entry Format

Each job execution creates an audit log entry:

```json
{
  "job_name": "check-sla-and-overdue",
  "status": "success",
  "execution_time_ms": 2340,
  "results": {
    "overdue_tasks": 5,
    "sla_violations": 2,
    "automation_rules_triggered": 3
  },
  "errors": null
}
```

### Interpreting Log Data

**Success Log:**
```json
{
  "job_name": "send-hearing-reminders",
  "status": "success",
  "results": {
    "hearings_processed": 8,
    "notifications_sent": 16,
    "failed_notifications": 0
  }
}
```
**Meaning:** Job ran successfully, sent 16 reminders for 8 hearings

**Failure Log:**
```json
{
  "job_name": "check-sla-and-overdue",
  "status": "failed",
  "error_message": "Database connection timeout",
  "error_details": "Connection timed out after 10000ms"
}
```
**Meaning:** Job failed due to database connectivity issue

---

## Common Scenarios

### Scenario 1: "SLA Check Shows 10 Overdue Tasks"

**What Happened:**
The SLA check job detected 10 tasks that are past their due date and haven't been completed.

**What to Do:**
1. Review the overdue tasks list in the main Tasks page
2. Assign team members to complete urgent tasks
3. Update task due dates if deadlines have been extended
4. Check if automation rules sent escalation notifications
5. Document reasons for delays (client delays, court adjournments, etc.)

**Prevention:**
- Enable daily deadline alerts (already configured)
- Use task bundles for structured workflows
- Set realistic due dates with buffer time

---

### Scenario 2: "Hearing Reminder Failed"

**What Happened:**
The daily 8 AM hearing reminder job failed to send notifications.

**Possible Causes:**
- Email service outage
- Invalid recipient email addresses
- Edge Function error

**What to Do:**
1. Click the job card to see error details
2. Check if hearing records have valid `assigned_to` and `owner_id` fields
3. Verify user profiles have valid email addresses
4. Manually trigger the job again with "Run Now"
5. If problem persists, check Edge Function logs in Supabase

**Quick Fix:**
```sql
-- Check for hearings with missing email addresses
SELECT h.id, h.hearing_date, c.case_number, p.full_name, p.phone
FROM hearings h
JOIN cases c ON h.case_id = c.id
LEFT JOIN profiles p ON c.owner_id = p.id
WHERE h.hearing_date >= NOW()
  AND h.hearing_date <= NOW() + INTERVAL '24 hours'
  AND (p.phone IS NULL OR p.phone = '');
```

---

### Scenario 3: "Analytics Snapshot Missing Data"

**What Happened:**
Last night's analytics snapshot shows 0 cases, but you have active cases.

**Possible Causes:**
- Job ran before cases were created (timing issue)
- Query filtered by wrong tenant_id
- Database connection failed mid-execution

**What to Do:**
1. Manually trigger "Analytics Snapshot" job with "Run Now"
2. Check the "Last Run" time - if it's from yesterday, re-run today
3. Verify the snapshot appears in the analytics dashboard
4. If problem persists, check database logs for query errors

**Verification Query:**
```sql
-- Check if snapshots are being created
SELECT snapshot_date, metric_type, metric_value
FROM analytics_snapshots
WHERE tenant_id = 'your-tenant-id'
ORDER BY snapshot_date DESC
LIMIT 7;
```

---

### Scenario 4: "All Jobs Showing Old 'Last Run' Times"

**What Happened:**
All background jobs show "Last Run: 3 days ago" - they're not executing.

**Possible Causes:**
- Cron jobs were accidentally unscheduled
- Edge Functions not deployed
- API key expired or invalid

**What to Do:**
1. Manually trigger one job with "Run Now"
2. If manual trigger succeeds: Cron jobs need to be rescheduled
3. If manual trigger fails: Check Edge Function deployment and API key
4. Contact your Supabase administrator or development team

**For Admins:**
```sql
-- Check if cron jobs are active
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE active = true
ORDER BY jobid;
```

---

## Best Practices

### Daily Monitoring Routine

**Morning Checklist (5 minutes):**
1. ✅ Open Dev Dashboard → Background Jobs
2. ✅ Verify all jobs show "Success" or "Pending"
3. ✅ Check "Last Run" times are within expected ranges
4. ✅ Review any error notifications from overnight
5. ✅ Manually trigger "Deadline Alerts" if needed urgently

**Weekly Review (15 minutes):**
1. ✅ Review execution logs for patterns (frequent failures)
2. ✅ Verify automation rules are triggering correctly
3. ✅ Check analytics snapshots for data completeness
4. ✅ Test manual triggers for all 5 jobs
5. ✅ Document any recurring issues or trends

### When to Escalate

**Escalate to Development Team If:**
- ❌ Jobs fail for >24 hours despite manual re-triggers
- ❌ Error messages mention "database", "connection", or "authentication"
- ❌ Manual triggers always fail (not just occasional timeouts)
- ❌ System shows "unhealthy" status consistently

**How to Report Issues:**
1. Take a screenshot of the Background Jobs dashboard
2. Copy error messages from failed job logs
3. Note the timestamp when issue started
4. Describe what actions you've tried (manual triggers, etc.)
5. Submit via your internal support ticket system

---

## Frequently Asked Questions

### General Questions

**Q: Do I need to do anything to keep background jobs running?**  
A: No. Background jobs run automatically 24/7. You only need to monitor them via the dashboard.

**Q: Can I customize when jobs run?**  
A: Not currently. Job schedules are system-wide and optimized for best performance. Custom scheduling is planned for future releases.

**Q: What happens if a job fails?**  
A: The system logs the failure, and the job will retry on its next scheduled run. You can also manually trigger it immediately via "Run Now".

**Q: Do background jobs use my user account?**  
A: No. Jobs run with "service role" permissions, which bypass user-level access controls to perform system-wide operations.

---

### Technical Questions

**Q: Why does "SLA Check" run every 15 minutes?**  
A: This frequency ensures overdue tasks are detected within 15 minutes, meeting SLA monitoring requirements. Daily or hourly checks would be too infrequent.

**Q: Can I see which automation rules were triggered by a job?**  
A: Yes. Check the `automation_logs` table for entries created during the job's execution window.

**Q: What's the difference between "Running" and "Pending"?**  
A: "Running" means the job is actively executing right now. "Pending" means it's waiting for its next scheduled run.

**Q: How long should a job take to complete?**  
A: Most jobs complete in 2-10 seconds. Analytics snapshots can take up to 30 seconds. If a job is "Running" for >60 seconds, it may be stuck.

---

### Troubleshooting Questions

**Q: Job shows "Failed" - what do I do?**  
A: 
1. Click the job card to see error details
2. Try manually triggering with "Run Now"
3. If it succeeds, it was a temporary issue
4. If it fails again, escalate to development team

**Q: "Run Now" button doesn't work - why?**  
A:
1. Check if you have Admin or Partner role (required)
2. Wait 10 seconds if you just clicked it (may be processing)
3. Refresh the page and try again
4. Check browser console for JavaScript errors

**Q: How do I know if a hearing reminder was sent?**  
A: Check the `audit_log` table for entries with `action_type = 'notification_sent'` and match the timestamp to the job execution time.

**Q: Can I disable a background job?**  
A: Not via the UI. Contact your Supabase administrator to unschedule a cron job if needed.

---

## Getting Help

### In-App Help

- **Inline Help:** Hover over the ℹ️ icon next to job names for quick tips
- **User Guide:** This document is available in Dev Dashboard → Help → Background Jobs

### Support Resources

1. **Documentation:** [Background Jobs Technical Documentation](./BACKGROUND_JOBS_SYSTEM.md)
2. **Operations Guide:** [Background Jobs Operations Guide](./BACKGROUND_JOBS_OPERATIONS.md)
3. **API Reference:** [Edge Functions Reference](./EDGE_FUNCTIONS_REFERENCE.md)

### Contact

- **Internal Support:** File a ticket via your support portal
- **Urgent Issues:** Contact your system administrator
- **Feature Requests:** Submit via product feedback form

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Feedback:** Submit suggestions via Dev Dashboard → Help → Submit Feedback
