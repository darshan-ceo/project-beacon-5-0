
# Integration Fix: Stage Workflow Micro-Workflow Missing from UI

## Problem Identified

The Stage Workflow micro-workflow components were fully implemented but **never integrated** into the main `CaseLifecycleFlow.tsx` component. All backend infrastructure and UI components exist:

| Component | Status |
|-----------|--------|
| `StageWorkflowTimeline.tsx` | Created but NOT imported |
| `StageNoticesPanel.tsx` | Created but NOT used |
| `StageHearingsPanel.tsx` | Created but NOT used |
| `StageClosurePanel.tsx` | Created but NOT used |
| `useStageWorkflow.ts` hook | Created but NOT used |
| `stage_workflow_v1` feature flag | Enabled |
| Database tables | Created (stage_notices, stage_replies, stage_workflow_steps) |

## Root Cause

The implementation created all the components and services but stopped before integrating them into `CaseLifecycleFlow.tsx`.

## Solution: Integrate Stage Workflow into CaseLifecycleFlow

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/cases/CaseLifecycleFlow.tsx` | Import and render workflow components |

### Integration Points

1. **Import Required Components**
   - `StageWorkflowTimeline`
   - `StageNoticesPanel`
   - `StageHearingsPanel`
   - `StageClosurePanel`
   - `useStageWorkflow` hook
   - `AddNoticeModal`
   - `FileReplyModal`

2. **Add State Management**
   - Hook up `useStageWorkflow` with current stage instance ID
   - Add modal states for Add Notice and File Reply

3. **Render Workflow Timeline**
   - Place between "Stage Dashboard" collapsible and "Stage History"
   - Only show when `stage_workflow_v1` feature flag is enabled
   - Only show when a case is selected

4. **Render Workflow Panels**
   - Add collapsible accordion for each step:
     - Notices Panel (with add/edit/delete/reply capabilities)
     - Hearings Panel (integrated with existing hearings)
     - Closure Panel (with outcome selection)

### UI Layout After Integration

```text
┌─────────────────────────────────────────────────┐
│ Header (Case Lifecycle Workflow)                 │
├─────────────────────────────────────────────────┤
│ Stage Cards (6 stages horizontal)                │
├─────────────────────────────────────────────────┤
│ [Collapsible] Stage Dashboard: Assessment        │
├─────────────────────────────────────────────────┤
│ ★ NEW: Stage Workflow Timeline                  │
│   [✓ Notices] → [○ Reply] → [○ Hearings] → [○]  │
├─────────────────────────────────────────────────┤
│ ★ NEW: Active Panel (based on selected step)    │
│   - StageNoticesPanel OR                        │
│   - StageHearingsPanel OR                       │
│   - StageClosurePanel                           │
├─────────────────────────────────────────────────┤
│ Stage History & Cycles                          │
├─────────────────────────────────────────────────┤
│ Stage Transition History                        │
└─────────────────────────────────────────────────┘
```

### Key Implementation Details

**Stage Instance ID Resolution**
The current placeholder for `currentStageInstanceId` needs to be replaced with a real lookup from the `stage_instances` table:
- Query `stage_instances` where `case_id` matches and `status = 'Active'`
- Pass this ID to the `useStageWorkflow` hook

**Feature Flag Check**
Wrap the entire workflow section in:
```typescript
{featureFlagService.isEnabled('stage_workflow_v1') && selectedCase && (
  // Workflow components here
)}
```

**Modal Integration**
- Add Notice Modal: Opens when "Add Notice" is clicked
- File Reply Modal: Opens when "File Reply" is clicked on a notice

### New Imports to Add

```typescript
import { StageWorkflowTimeline } from '@/components/lifecycle/StageWorkflowTimeline';
import { StageNoticesPanel } from '@/components/lifecycle/StageNoticesPanel';
import { StageHearingsPanel } from '@/components/lifecycle/StageHearingsPanel';
import { StageClosurePanel } from '@/components/lifecycle/StageClosurePanel';
import { AddNoticeModal } from '@/components/modals/AddNoticeModal';
import { FileReplyModal } from '@/components/modals/FileReplyModal';
import { useStageWorkflow } from '@/hooks/useStageWorkflow';
import { stageWorkflowService } from '@/services/stageWorkflowService';
import { StageNotice, WorkflowStepKey } from '@/types/stageWorkflow';
```

### New State Variables

```typescript
const [showAddNoticeModal, setShowAddNoticeModal] = useState(false);
const [showFileReplyModal, setShowFileReplyModal] = useState(false);
const [selectedNotice, setSelectedNotice] = useState<StageNotice | null>(null);
const [stageInstanceId, setStageInstanceId] = useState<string | null>(null);
```

### Workflow Hook Integration

```typescript
const {
  workflowState,
  activeStep,
  setActiveStep,
  noticeReplies,
  refresh: refreshWorkflow,
  addNotice,
  updateNotice,
  deleteNotice,
  loadRepliesForNotice,
  addReply,
  completeStep,
  skipStep,
  isFeatureEnabled: isStageWorkflowEnabled
} = useStageWorkflow({
  stageInstanceId,
  caseId: selectedCase?.id || '',
  stageKey: selectedCase?.currentStage || '',
  enabled: !!selectedCase
});
```

### Stage Instance ID Fetch

Add a useEffect to fetch the actual stage instance ID:
```typescript
useEffect(() => {
  async function fetchStageInstance() {
    if (!selectedCase) return;
    const { data } = await supabase
      .from('stage_instances')
      .select('id')
      .eq('case_id', selectedCase.id)
      .eq('status', 'Active')
      .single();
    if (data) setStageInstanceId(data.id);
  }
  fetchStageInstance();
}, [selectedCase?.id, selectedCase?.currentStage]);
```

## Testing Checklist

After integration:
1. Navigate to Cases → Select a case → Lifecycle tab
2. Verify "Stage Workflow: [Stage Name]" section appears below Stage Dashboard
3. Verify 4-step timeline shows (Notices, Reply, Hearings, Closure)
4. Click "Add Notice" and verify modal opens
5. Add a notice and verify it appears in the Notices panel
6. Click on Hearings step and verify panel shows
7. Click on Closure step and verify closure options appear
8. Verify feature works only when `stage_workflow_v1` flag is enabled

## Summary

This integration fix will:
- Wire up the already-created Stage Workflow components
- Add the visual micro-workflow timeline to the Lifecycle tab
- Enable users to manage notices, replies, hearings, and stage closure
- All changes are feature-flagged for safe rollout
