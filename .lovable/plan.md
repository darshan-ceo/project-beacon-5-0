

# Enterprise Demo Data Injection System

## Executive Summary

This plan implements a production-safe demo data injection system with 3 comprehensive case studies covering happy path, complex workflow, and exception handling scenarios. All demo data is tagged with `is_demo = true` and `demo_batch_id = 'BEACON_DEMO_V1'` for clean identification and one-click removal.

## Strategy Alignment

The solution follows the recommended **Controlled Demo Data Seeder** approach:
- Uses existing service layer and APIs (no bypassing validations)
- All data flagged with demo markers
- Admin-only triggering with environment protection
- One-click purge with referential integrity

## Database Schema Changes

Add `is_demo` and `demo_batch_id` columns to core transactional tables:

```text
tables affected:
  - cases
  - hearings  
  - tasks
  - documents
  - timeline_entries
  - communication_logs
  - task_followups
  - stage_transitions
```

Migration SQL:
```sql
-- Add demo tracking columns to transactional tables
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE hearings ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE hearings ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE task_followups ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE task_followups ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

ALTER TABLE stage_transitions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE stage_transitions ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(50);

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_cases_is_demo ON cases(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_cases_demo_batch ON cases(demo_batch_id) WHERE demo_batch_id IS NOT NULL;
```

## The 3 Case Studies

### Case Study 1: Happy Path (Straightforward Execution)

| Attribute | Value |
|-----------|-------|
| Client | Single client: "Shree Ganesh Textiles Pvt Ltd" |
| Case Type | GST Assessment - ITC Dispute |
| Lifecycle | Assessment -> Reply -> Hearing -> Favorable Order |
| Duration | 45 days from notice to resolution |
| Status | **Completed** |

**Records Created:**
- 1 Client (if not exists, linked to existing)
- 1 Case with complete metadata
- 3 Hearings (Initial, Argument, Final)
- 6 Tasks (Review, Draft Reply, File Reply, Prepare Hearing, Follow-up, Close)
- 3 Documents (Notice PDF, Reply Document, Final Order)
- 5 Follow-ups (calls, meetings, emails)
- 5 Timeline entries (milestones)
- 2 Stage transitions
- 3 Communication logs

### Case Study 2: Complex Workflow (Iterations & Dependencies)

| Attribute | Value |
|-----------|-------|
| Client | Multiple stakeholders: "Mehta Industries Group" |
| Case Type | GST Audit - Multi-year assessment |
| Lifecycle | Assessment -> Adjudication -> First Appeal (ongoing) |
| Complexity | Reassignments, scope revisions, partial billing |
| Status | **Ongoing / Extended** |

**Records Created:**
- 1 Case with revisions tracked
- 5 Hearings (including adjournments)
- 10 Tasks (with dependencies, delays marked)
- 5 Document versions (versioned attachments)
- 8 Follow-ups with varied outcomes
- 8 Timeline entries
- 4 Stage transitions (with resubmit cycle)
- 5 Communication logs

### Case Study 3: Risk & Exception Handling

| Attribute | Value |
|-----------|-------|
| Client | High-risk client: "Sunrise Exports Ltd" |
| Case Type | GST Fraud Investigation - Fake Invoice allegation |
| Lifecycle | Investigation -> SCN -> On Hold -> Resolution |
| Complexity | Escalations, missed deadlines, internal notes |
| Status | **Resolved with Remarks** |

**Records Created:**
- 1 Case marked high-risk (priority: Critical)
- 4 Hearings (with missed auto-flags)
- 8 Tasks (including overdue, escalated)
- 4 Documents (evidence, internal memos)
- 6 Follow-ups (including missed ones with flags)
- 6 Timeline entries
- 3 Stage transitions
- 4 Communication logs
- 2 Escalation events

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/services/enterpriseDemoSeeder.ts` | Main seeder service with 3 case study generators |
| `src/data/seedData/enterpriseDemoCaseStudies.json` | JSON data for all 3 case studies |
| `src/components/admin/EnterpriseDemoManager.tsx` | Admin UI for seeding/purging demo data |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/admin/DataSeedingPanel.tsx` | Add Enterprise Demo section with seed/purge buttons |

## Implementation Architecture

### EnterpriseDemoSeeder Service

```text
class EnterpriseDemoSeeder {
  DEMO_BATCH_ID = 'BEACON_DEMO_V1';
  
  // Initialization
  initialize()       // Get tenant/user context
  
  // Safety checks
  checkForExistingDemoData()  // Returns count of existing demo records
  
  // Seeding
  seedCaseStudy1()   // Happy path
  seedCaseStudy2()   // Complex workflow  
  seedCaseStudy3()   // Exception handling
  seedAll()          // Seeds all 3 case studies
  
  // Purge
  purgeAllDemoData() // One-click removal with FK-aware deletion
  
  // Helpers
  createDemoCase(data)
  createDemoHearing(caseId, data)
  createDemoTask(caseId, data)
  createDemoDocument(caseId, data)
  createDemoFollowUp(taskId, data)
  createDemoCommunication(caseId, data)
  createDemoTimeline(caseId, data)
}
```

### Purge Implementation

```text
purgeAllDemoData() {
  // Delete in FK dependency order (children first)
  1. DELETE FROM task_followups WHERE demo_batch_id = 'BEACON_DEMO_V1'
  2. DELETE FROM communication_logs WHERE demo_batch_id = 'BEACON_DEMO_V1'
  3. DELETE FROM timeline_entries WHERE demo_batch_id = 'BEACON_DEMO_V1'
  4. DELETE FROM stage_transitions WHERE demo_batch_id = 'BEACON_DEMO_V1'
  5. DELETE FROM documents WHERE demo_batch_id = 'BEACON_DEMO_V1'
  6. DELETE FROM tasks WHERE demo_batch_id = 'BEACON_DEMO_V1'
  7. DELETE FROM hearings WHERE demo_batch_id = 'BEACON_DEMO_V1'
  8. DELETE FROM cases WHERE demo_batch_id = 'BEACON_DEMO_V1'
  
  // Log deletion summary
  return { deletedCounts: {...}, success: true }
}
```

## Admin UI Design

The EnterpriseDemoManager component provides:

```text
+---------------------------------------------------+
|  Enterprise Demo Data Management                  |
|  ------------------------------------------------ |
|  Status: [No Demo Data / 3 Case Studies Active]  |
|                                                   |
|  [SEED ALL 3 CASE STUDIES]        [PURGE ALL]    |
|                                                   |
|  Case Study 1: Happy Path         [Seed] [View]  |
|  Case Study 2: Complex Workflow   [Seed] [View]  |
|  Case Study 3: Risk Handling      [Seed] [View]  |
|                                                   |
|  Last Seeded: 2026-02-05 10:30 AM                |
|  Total Demo Records: 87                          |
+---------------------------------------------------+
```

## Security & Isolation

1. **Demo Data Visibility Control**
   - Reports/Analytics exclude demo data by default: `WHERE is_demo = false OR is_demo IS NULL`
   - Dashboard metrics filter out demo records
   - Export functions exclude demo data

2. **Admin-Only Access**
   - Seed/Purge buttons only visible to admin role
   - Environment flag check: `ALLOW_DEMO_SEEDING` (optional)

3. **Audit Trail**
   - Seeding operations logged to audit_log
   - Purge operations logged with summary

## JSON Data Structure

```text
enterpriseDemoCaseStudies.json structure:

{
  "batch_id": "BEACON_DEMO_V1",
  "version": "1.0",
  "case_studies": [
    {
      "id": "CS1_HAPPY_PATH",
      "name": "Happy Path - Shree Ganesh Textiles",
      "description": "Straightforward GST ITC dispute resolved favorably",
      "case": { ... case data ... },
      "hearings": [ ... ],
      "tasks": [ ... ],
      "documents": [ ... ],
      "followups": [ ... ],
      "communications": [ ... ],
      "timeline": [ ... ]
    },
    // CS2_COMPLEX, CS3_EXCEPTION
  ]
}
```

## Testing Checklist

Post-implementation validation:

1. Seed all 3 case studies successfully
2. Verify all records have `is_demo = true` and `demo_batch_id = 'BEACON_DEMO_V1'`
3. Verify demo data appears in Cases list (with visual DEMO badge)
4. Verify demo data is filtered from:
   - Dashboard analytics
   - Reports
   - Compliance metrics
5. Purge demo data and confirm complete removal
6. Verify no orphaned records after purge
7. Test partial seeding (individual case studies)
8. Test re-seeding (should handle duplicates gracefully)

## Demo Walkthrough Guide

Each case study demonstrates specific features:

| Case Study | Features Demonstrated |
|------------|----------------------|
| Happy Path | Full lifecycle, document generation, task completion, timeline tracking |
| Complex | Reassignments, versioned documents, partial billing, scope changes, multi-stakeholder |
| Exception | Escalation, risk flags, missed deadlines, on-hold status, internal notes, resolution audit |

**Recommended Demo Flow:**
1. Show Cases list with 3 demo cases
2. Open Happy Path case - walk through completed timeline
3. Open Complex case - show ongoing status, document versions
4. Open Exception case - show escalation, risk indicators
5. Demonstrate purge capability

## Summary

This implementation provides:
- 3 comprehensive, realistic case studies
- Production-safe with clear demo tagging
- One-click seed and purge operations
- Admin-only access controls
- Automatic exclusion from production reports
- Complete referential integrity during purge
- Audit logging for all operations

