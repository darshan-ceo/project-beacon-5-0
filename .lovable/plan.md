
# Case Lifecycle Micro-Workflow Refactor

## Overview

This plan introduces a guided **Stage Workflow Timeline** within each legal stage (Assessment, Adjudication, First Appeal, Tribunal, High Court, Supreme Court). The micro-workflow adds four logical steps inside every stage:

1. **Notice(s)** - Multiple notices per stage with metadata, due dates, documents
2. **Reply** - Linked replies to each notice with filing status
3. **Hearing(s)** - Repeatable hearings with outcomes and next actions
4. **Stage Closure** - Explicit closure action with selectable outcomes

This enhancement improves user guidance and legal correctness while maintaining full backward compatibility with existing cases, transitions, analytics, and the Stage Dashboard.

## Current Architecture Analysis

### Existing Stage Model
- **6 Legal Stages**: Assessment → Adjudication → First Appeal → Tribunal → High Court → Supreme Court
- **stage_instances**: Tracks each stage occurrence with cycle numbers, duration, status
- **stage_transitions**: Records Forward/Send Back/Remand movements between stages
- **Original Notice Data**: Stored on `cases` table (notice_no, notice_date, tax_demand, etc.)
- **Hearings**: Separate `hearings` table linked to cases (not stage-specific currently)

### Key Findings
- No `notices` or `replies` tables exist in the Supabase database currently
- Hearings exist but are not linked to specific stage instances
- Original notice metadata is captured at case creation, not per-stage
- The `CaseLifecycleFlow.tsx` component displays "Original Notice Reference" but doesn't support multiple notices

## Solution Design

### New Database Tables

```text
1. stage_notices
   - id (uuid, PK)
   - tenant_id (uuid, FK → tenants)
   - stage_instance_id (uuid, FK → stage_instances)
   - case_id (uuid, FK → cases)
   - notice_type (varchar) - e.g., 'ASMT-10', 'DRC-01', 'SCN'
   - notice_number (varchar)
   - notice_date (date)
   - due_date (date)
   - amount_demanded (numeric)
   - section_invoked (varchar)
   - status (varchar) - 'Received', 'Reply Pending', 'Replied', 'Closed'
   - is_original (boolean) - true for inherited from case creation
   - documents (jsonb) - array of linked document IDs
   - metadata (jsonb) - extensible fields
   - created_at, updated_at timestamps

2. stage_replies
   - id (uuid, PK)
   - tenant_id (uuid, FK)
   - notice_id (uuid, FK → stage_notices)
   - stage_instance_id (uuid, FK)
   - reply_date (date)
   - reply_reference (varchar)
   - filing_status (varchar) - 'Draft', 'Filed', 'Acknowledged'
   - documents (jsonb)
   - notes (text)
   - filed_by (uuid, FK → profiles)
   - created_at, updated_at

3. stage_workflow_steps (for tracking micro-workflow progress)
   - id (uuid, PK)
   - tenant_id (uuid, FK)
   - stage_instance_id (uuid, FK)
   - step_key (varchar) - 'notices', 'reply', 'hearings', 'closure'
   - status (varchar) - 'Pending', 'In Progress', 'Completed', 'Skipped'
   - completed_at (timestamp)
   - completed_by (uuid, FK)
   - notes (text)

4. ALTER hearings: Add stage_instance_id column
   - Link hearings to specific stage instances
   - Backward compatible: existing hearings remain linked via case_id
```

### Data Model Relationships

```text
case
 └─► stage_instances (1:N)
      ├─► stage_notices (1:N per stage)
      │    └─► stage_replies (1:N per notice)
      ├─► hearings (1:N per stage)
      └─► stage_workflow_steps (1:4 per stage)
```

### Notice Inheritance Strategy

When a case advances to a higher stage:
1. Original notice data from Assessment stage is automatically visible as "Original Notice Reference"
2. Each new stage can have additional notices (e.g., SCN at Tribunal, HC Notice)
3. All notices across all stages are aggregated in the case timeline
4. The "is_original" flag identifies the initial case notice vs stage-specific notices

## New Components

### 1. StageWorkflowTimeline Component

A visual stepper/timeline showing the 4 workflow steps within the current stage:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Stage Workflow: Assessment                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   [✓ Notice(s)]  ──►  [○ Reply]  ──►  [○ Hearings]  ──►  [○ Closure] │
│      2 notices           0 filed        0 scheduled        pending   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Each step is clickable to expand an action panel.

### 2. StageNoticesPanel Component

Displays all notices for the current stage with add/edit capabilities:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Notice(s)                                          [+ Add Notice]│
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ASMT-10/2025/001          Status: Reply Pending              │ │
│  │ Date: 15 Jan 2026         Due: 14 Feb 2026 (9 days left)     │ │
│  │ Demand: ₹5,50,000         Section: 73(1)                     │ │
│  │ [📄 2 docs]  [Reply Filed ✓]  [View Details]                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ DRC-01/2025/002           Status: Received                   │ │
│  │ Date: 20 Jan 2026         Due: 19 Feb 2026 (14 days left)    │ │
│  │ Demand: ₹2,20,000         Section: 74(1)                     │ │
│  │ [📄 1 doc]   [Draft Reply]  [View Details]                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3. StageRepliesPanel Component

Linked to each notice - supports multiple reply versions:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Reply to: ASMT-10/2025/001                     [+ File Reply]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Reply Ref: RPL-001         Filed: 10 Feb 2026               │ │
│  │ Status: Acknowledged       Filed by: Rahul Sharma           │ │
│  │ [📄 Reply Document]  [📄 Supporting Docs]  [View Details]    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4. StageHearingsPanel Component

Shows all hearings for the current stage instance:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Hearing(s)                                   [+ Schedule Hearing]│
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📅 15 Feb 2026 @ 10:30 AM    Status: Scheduled              │ │
│  │ Authority: Additional Commissioner, GST                     │ │
│  │ Agenda: Review of taxpayer reply                            │ │
│  │ [Add Outcome]  [Adjourn]  [View Details]                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📅 28 Jan 2026 @ 11:00 AM    Outcome: Adjourned             │ │
│  │ Notes: Taxpayer requested additional time for documentation │ │
│  │ Next Action: Submit documents by 12 Feb 2026               │ │
│  │ [📄 Order Copy]  [View Details]                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 5. StageClosurePanel Component

Explicit closure action with selectable outcomes:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Stage Closure                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Closure Outcome:                                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ○ Order Passed - Proceed to next stage (if applicable)      │ │
│  │ ○ Case Dropped - No further action required                 │ │
│  │ ○ Withdrawn - Taxpayer withdrew the case                    │ │
│  │ ○ Settled - Case resolved through settlement                │ │
│  │ ○ Remanded - Sent back to earlier stage                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Order Details (if Order Passed):                                │
│  Order No: [____________]  Order Date: [__________]              │
│  [📎 Attach Order Document]                                      │
│                                                                  │
│  Closure Notes: [___________________________________]            │
│                                                                  │
│  [Close Stage]                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Service Layer

### New Services

| Service | Purpose |
|---------|---------|
| `stageNoticesService.ts` | CRUD for stage_notices with due date calculations |
| `stageRepliesService.ts` | CRUD for stage_replies with notice linking |
| `stageWorkflowService.ts` | Manage workflow step progress, auto-complete logic |

### Enhanced Services

| Service | Changes |
|---------|---------|
| `hearingsService.ts` | Add stage_instance_id support, maintain backward compat |
| `lifecycleService.ts` | Initialize workflow steps when stage starts |

## UI Integration Points

### CaseLifecycleFlow.tsx Modifications

1. **Add StageWorkflowTimeline** - New section between "Stage Dashboard" and "Stage History"
2. **Preserve Original Notice Reference** - Keep existing card, add "View All Stage Notices" link
3. **Integrate Workflow Panels** - Expandable accordion for each workflow step

### Layout Change

```text
Current:                          After:
┌────────────────────────┐        ┌────────────────────────┐
│ Header                 │        │ Header                 │
│ Lifecycle Flow Cards   │        │ Lifecycle Flow Cards   │
│ Stage Dashboard        │        │ Stage Dashboard        │
│ (Original Notice Ref)  │        │ ──────────────────────│
│ Stage History          │        │ Stage Workflow Timeline│
│ Transition History     │        │   ├─ Notices Panel     │
└────────────────────────┘        │   ├─ Reply Panel       │
                                  │   ├─ Hearings Panel    │
                                  │   └─ Closure Panel     │
                                  │ ──────────────────────│
                                  │ Stage History          │
                                  │ Transition History     │
                                  └────────────────────────┘
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/stageWorkflow.ts` | Type definitions for notices, replies, workflow steps |
| `src/services/stageNoticesService.ts` | Notices CRUD and business logic |
| `src/services/stageRepliesService.ts` | Replies CRUD and linking |
| `src/services/stageWorkflowService.ts` | Workflow step management |
| `src/components/lifecycle/StageWorkflowTimeline.tsx` | Main workflow stepper component |
| `src/components/lifecycle/StageNoticesPanel.tsx` | Notices list and management |
| `src/components/lifecycle/StageRepliesPanel.tsx` | Replies management |
| `src/components/lifecycle/StageHearingsPanel.tsx` | Stage-specific hearings view |
| `src/components/lifecycle/StageClosurePanel.tsx` | Closure action component |
| `src/components/modals/AddNoticeModal.tsx` | Add/Edit notice form |
| `src/components/modals/FileReplyModal.tsx` | File reply form |
| `src/hooks/useStageWorkflow.ts` | Hook for workflow state management |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/cases/CaseLifecycleFlow.tsx` | Add StageWorkflowTimeline component |
| `src/services/hearingsService.ts` | Add stage_instance_id support |
| `src/services/lifecycleService.ts` | Initialize workflow steps on stage create |
| `src/components/lifecycle/EnhancedCycleTimeline.tsx` | Show notices/replies count per stage |

## Backward Compatibility Strategy

### For Existing Cases
1. **No data migration required** - Existing cases continue to work with case-level notice fields
2. **Auto-create original notice** - When viewing a case in new UI, auto-populate stage_notices from case fields if not exists
3. **Hearings linkage** - Existing hearings remain linked via case_id; new hearings get stage_instance_id

### For Existing Features
- **Stage Dashboard**: Unchanged - continues to show stage overview
- **Transition History**: Unchanged - still tracks stage transitions
- **Analytics**: Unchanged - stage-level metrics remain consistent
- **Stage Transitions**: Existing Forward/Send Back/Remand logic preserved

### Feature Flag
Add feature flag `stage_workflow_v1` to progressively roll out:
- When disabled: Current behavior (no micro-workflow)
- When enabled: Show StageWorkflowTimeline and panels

## Database Migration

```sql
-- Migration: Add stage workflow tables

-- 1. Stage Notices
CREATE TABLE stage_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stage_instance_id UUID REFERENCES stage_instances(id),
  case_id UUID NOT NULL REFERENCES cases(id),
  notice_type VARCHAR(50),
  notice_number VARCHAR(100),
  notice_date DATE,
  due_date DATE,
  amount_demanded NUMERIC,
  section_invoked VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Received',
  is_original BOOLEAN DEFAULT false,
  documents JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Stage Replies
CREATE TABLE stage_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  notice_id UUID NOT NULL REFERENCES stage_notices(id),
  stage_instance_id UUID REFERENCES stage_instances(id),
  reply_date DATE,
  reply_reference VARCHAR(100),
  filing_status VARCHAR(50) DEFAULT 'Draft',
  documents JSONB DEFAULT '[]',
  notes TEXT,
  filed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Stage Workflow Steps
CREATE TABLE stage_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  stage_instance_id UUID NOT NULL REFERENCES stage_instances(id),
  step_key VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stage_instance_id, step_key)
);

-- 4. Add stage_instance_id to hearings (backward compatible)
ALTER TABLE hearings 
  ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES stage_instances(id);

-- 5. Indexes
CREATE INDEX idx_stage_notices_case ON stage_notices(case_id);
CREATE INDEX idx_stage_notices_instance ON stage_notices(stage_instance_id);
CREATE INDEX idx_stage_replies_notice ON stage_replies(notice_id);
CREATE INDEX idx_stage_workflow_instance ON stage_workflow_steps(stage_instance_id);
CREATE INDEX idx_hearings_stage_instance ON hearings(stage_instance_id);

-- 6. RLS Policies (following existing patterns)
ALTER TABLE stage_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_workflow_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies follow existing can_user_view_case pattern
```

## Testing Considerations

### Test Scenarios
1. Create new case → Verify original notice auto-created in stage_notices
2. Add additional notice to stage → Verify linkage to stage_instance
3. File reply to notice → Verify notice status updates
4. Schedule hearing → Verify stage_instance_id populated
5. Close stage → Verify workflow steps marked complete
6. Advance stage → Verify new workflow steps initialized
7. Remand case → Verify notices from target stage still visible

### Backward Compatibility Tests
1. Existing cases load without errors
2. Original Notice Reference card still displays
3. Existing hearings accessible
4. Stage transitions work as before
5. Analytics metrics unchanged

## Summary

This refactor introduces a guided micro-workflow within each legal stage while:
- **Preserving existing architecture** - No changes to stage_instances or stage_transitions
- **Supporting multiple notices** - Each stage can have N notices, each with replies
- **Improving legal correctness** - Explicit closure outcomes (Order Passed, Dropped, Remanded)
- **Maintaining flexibility** - Advanced users can skip/customize workflow steps
- **Ensuring backward compatibility** - Existing cases continue to work seamlessly

The implementation follows a feature-flag approach for safe progressive rollout.
