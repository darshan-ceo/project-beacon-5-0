

# Lifecycle Stage Context and Historical View

## Overview
Add a **stage context switcher** so clicking any lifecycle stage tile loads its historical data (notices, replies, hearings, closure, tasks, documents) without mutating case status. The current view always defaults to the latest/active stage instance on load.

## Current State
- `CaseLifecycleFlow.tsx` (1356 lines) renders 6 stage tiles but clicking only triggers "Manage Stage" on the current stage -- no context switching exists
- `stageInstanceId` is fetched once for the **active** stage instance only (line 240: `.eq('status', 'Active')`)
- All child panels (`StageNoticesPanel`, `StageHearingsPanel`, `StageClosurePanel`, workflow timeline) consume this single `stageInstanceId`
- Stage tiles for completed/pending stages show no interactive behavior
- `stage_notices` and `hearings` tables have `stage_instance_id` columns; `documents` and `tasks` do NOT have `stage_instance_id`

---

## Step 1: Database Migration -- Add `stage_instance_id` to `tasks` and `documents`

Add nullable FK columns so entities can be tagged with stage ownership:

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES stage_instances(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS stage_instance_id UUID REFERENCES stage_instances(id);
```

No existing data is modified. New records will optionally carry `stage_instance_id`.

## Step 2: Create `ActiveStageContext` State in `CaseLifecycleFlow.tsx`

Add new state variables to track which stage the user is *viewing*:

```typescript
const [viewingStageInstanceId, setViewingStageInstanceId] = useState<string | null>(null);
const [viewingStageKey, setViewingStageKey] = useState<string | null>(null);
const [isViewingHistorical, setIsViewingHistorical] = useState(false);
```

**On mount / case change**: Default to the active stage instance (current behavior).

**On stage tile click**: Fetch the stage instance for that stage, update viewing context.

The `useStageWorkflow` hook and all child panels will consume `viewingStageInstanceId` instead of `stageInstanceId`.

## Step 3: Make Stage Tiles Clickable

Currently (lines 690-775), stage tiles only show "Manage Stage" for the current stage. Change to:

1. **All tiles become clickable** -- clicking any tile calls `handleStageClick(stage.id)`
2. `handleStageClick` queries `stage_instances` for the clicked stage's instance(s):
   - If exactly one instance exists, switch context to it
   - If multiple instances exist (remand cycles), show a small dropdown/popover to pick which cycle
   - If no instance exists (future stage), show a toast: "This stage has no history yet"
3. Add a visual indicator (ring/highlight) on the currently *viewed* stage tile, distinct from the *current* stage marker
4. The "Manage Stage" button only appears when `viewingStageInstanceId === activeStageInstanceId`

## Step 4: Historical Stage Banner (UX Indicator)

When `isViewingHistorical === true`, render a persistent banner below the stage tiles:

```text
[Info icon] Viewing: {viewingStageKey} (Closed) | Current Stage: {selectedCase.currentStage}
            [Button: Return to Current Stage]
```

- Uses yellow/amber background with clear text
- "Return to Current Stage" resets context to the active instance
- Persists across workflow tabs (notices, replies, hearings, closure)

## Step 5: Read-Only Mode for Historical Stages

When `isViewingHistorical === true`:

- **StageWorkflowTimeline**: Steps render as view-only (no click actions to add/edit)
- **StageNoticesPanel**: Hide "Add Notice" button; existing notices display in read-only mode
- **StageHearingsPanel**: Hide "Schedule Hearing" button; hearings are view-only
- **StageClosurePanel**: Display closure data read-only (no Save/Close buttons)
- **Stage Dashboard**: "Manage Stage" button is hidden; "Create Task" and "Upload Response" are hidden
- All action handlers receive an `isReadOnly` prop to disable mutations

Implementation: Pass `isReadOnly={isViewingHistorical}` to each panel. Each panel already has conditional rendering patterns -- extend them.

## Step 6: Update `useStageWorkflow` Hook

The hook currently takes `stageInstanceId` and loads workflow state. No changes needed to the hook itself -- the parent (`CaseLifecycleFlow`) will simply pass `viewingStageInstanceId` instead of `stageInstanceId`. The hook already handles arbitrary instance IDs.

Update the call site:

```typescript
// Before
const { workflowState, ... } = useStageWorkflow({
  stageInstanceId,
  caseId: selectedCase?.id || '',
  stageKey: selectedCase?.currentStage || '',
  ...
});

// After  
const { workflowState, ... } = useStageWorkflow({
  stageInstanceId: viewingStageInstanceId || stageInstanceId,
  caseId: selectedCase?.id || '',
  stageKey: viewingStageKey || selectedCase?.currentStage || '',
  ...
});
```

## Step 7: Stage-Filtered Hearings for Viewed Context

Update the `stageHearings` memo (line 441) to filter by `viewingStageInstanceId`:

```typescript
const stageHearings = useMemo(() => {
  const effectiveInstanceId = viewingStageInstanceId || stageInstanceId;
  return state.hearings?.filter(h => {
    const hearingCaseId = h.caseId || h.case_id;
    const matchesCase = hearingCaseId === selectedCase?.id;
    const matchesStage = h.stage_instance_id === effectiveInstanceId || !h.stage_instance_id;
    return matchesCase && matchesStage;
  }) || [];
}, [selectedCase?.id, viewingStageInstanceId, stageInstanceId, state.hearings]);
```

## Step 8: Stage Summary Placeholder (Future-Ready)

Create a lightweight type file `src/types/stageSummary.ts`:

```typescript
export interface StageSummary {
  stage_instance_id: string;
  notice_count: number;
  hearing_count: number;
  reply_count: number;
  financial_impact: number | null;
  outcome_summary: string | null;
}
```

No service implementation yet -- this is a structural placeholder for future AI summarization.

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| Migration SQL | Create | Add `stage_instance_id` to `tasks` and `documents` |
| `src/components/cases/CaseLifecycleFlow.tsx` | Edit | Add viewing context state, make tiles clickable, pass `isReadOnly` to panels, historical banner |
| `src/components/lifecycle/StageNoticesPanel.tsx` | Edit | Accept `isReadOnly` prop, hide action buttons when true |
| `src/components/lifecycle/StageHearingsPanel.tsx` | Edit | Accept `isReadOnly` prop, hide action buttons when true |
| `src/components/lifecycle/StageClosurePanel.tsx` | Edit | Accept `isReadOnly` prop, render view-only when true |
| `src/components/lifecycle/StageWorkflowTimeline.tsx` | Edit | Accept `isReadOnly` prop, disable step click actions when true |
| `src/types/stageSummary.ts` | Create | Placeholder interface for future stage summaries |

## What This Does NOT Change

- Case creation flow -- untouched
- Notice intake wizard -- untouched
- Existing dashboards, reports, calendar -- untouched
- Case status, stage status, stage instance status -- remain independent; clicking a tile never mutates any status
- Timeline tab -- continues to show merged chronological view across all stages
- Default load behavior -- always shows the active/latest stage

## Scope Boundaries (Deferred Items)

The following items from the prompt are noted but deferred to avoid overengineering:

- **Role-stage permission map** (item 12): Requires a permissions framework refactor; not blocking the context view feature
- **Backend immutability enforcement** (item 8): Currently UI-only via `isReadOnly`; database-level triggers can be added later
- **Cross-stage read-only references** (item 9): The data model supports this via `stage_instance_id` FK; UI for cross-referencing is a separate feature
- **Communication tagging** (Email/WhatsApp): The communications module does not yet exist in the stage workflow

