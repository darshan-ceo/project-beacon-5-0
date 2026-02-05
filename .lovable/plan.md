
# Fix Stage Workflow Integration Issues

## Problem Summary

Three issues identified in the Stage Workflow micro-workflow:

| Issue | Root Cause |
|-------|------------|
| 1. Scheduled hearing not visible | `HearingModal` doesn't receive/pass `stage_instance_id`, so new hearings aren't linked to the stage |
| 2. Reply step has no popup | Clicking "Reply" step only shows filtered notices list; no dedicated reply action when there are no pending notices |
| 3. Layout order | User wants Stage Workflow section ABOVE Stage Dashboard since workflow is higher priority |

---

## Issue 1: Hearings Not Visible After Scheduling

### Problem
When scheduling a hearing from the Stage Workflow panel:
- The `HearingModal` doesn't receive the current `stageInstanceId` as a prop
- `hearingsService.createHearing()` doesn't include `stage_instance_id` in the payload
- As a result, the new hearing has `stage_instance_id = null`
- The `StageHearingsPanel` filters by `stage_instance_id` OR `null`, but the workflow count query (`getHearingsCount`) returns 0 for the stage

### Solution

**1. Pass `stageInstanceId` to HearingModal**

In `CaseLifecycleFlow.tsx`, update the `HearingModal` render to include the stage instance:
```typescript
<HearingModal
  isOpen={showHearingModal}
  onClose={() => setShowHearingModal(false)}
  mode="create"
  contextCaseId={selectedCase?.id}
  contextClientId={selectedCase?.clientId}
  stageInstanceId={stageInstanceId}  // NEW PROP
/>
```

**2. Update HearingModal interface**

Add the new prop to the modal:
```typescript
interface HearingModalProps {
  // ... existing props
  stageInstanceId?: string | null;
}
```

**3. Include stage_instance_id in hearing creation**

In `HearingModal.tsx`, include it in the `hearingFormData`:
```typescript
const hearingFormData = {
  // ... existing fields
  stage_instance_id: props.stageInstanceId || undefined,
};
```

**4. Update hearingsService.createHearing() to persist stage_instance_id**

In `hearingsService.ts`, add `stage_instance_id` to the `hearingData` object:
```typescript
const hearingData = {
  // ... existing fields
  stage_instance_id: data.stage_instance_id || null,
};
```

**5. Refresh workflow after hearing creation**

After the `HearingModal` closes, call `refreshWorkflow()` to update the count:
```typescript
onClose={() => {
  setShowHearingModal(false);
  refreshWorkflow(); // Refresh to pick up new hearing
}}
```

---

## Issue 2: Reply Step Has No Response

### Problem
- Clicking "Reply" step in the timeline shows a filtered `StageNoticesPanel` with only pending notices
- If there are no notices, nothing is shown
- The user expects a more direct reply action when clicking the Reply step

### Solution

**1. Add empty state message for Reply step**

When `activeStep === 'reply'` and there are no pending notices, show an informative empty state:
```typescript
{activeStep === 'reply' && (
  workflowState.notices.filter(n => n.status === 'Reply Pending' || n.status === 'Received').length > 0 
  ? (
    <StageNoticesPanel 
      notices={...} 
      // Show only pending notices with focus on reply action
    />
  ) : (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <Send className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No notices awaiting reply</p>
        <p className="text-xs mt-1">Add a notice first, then file replies</p>
      </CardContent>
    </Card>
  )
)}
```

**2. Add dedicated Reply panel view**

Alternatively, create a `StageRepliesPanel` component that shows:
- All filed replies grouped by notice
- Quick action to file a new reply
- Status overview

For now, the simpler fix is to improve the empty state and ensure the FileReplyModal opens correctly from the notices panel.

---

## Issue 3: Swap Stage Dashboard and Stage Workflow Position

### User Request
Move "Stage Workflow Timeline" section **above** "Stage Dashboard" since it's higher priority.

### Solution

Reorder the sections in `CaseLifecycleFlow.tsx`:

**Current Order (lines ~697-1111):**
1. Stage Dashboard (Collapsible) - lines 697-1043
2. Stage Workflow Timeline - lines 1045-1111

**New Order:**
1. Stage Workflow Timeline (moved up)
2. Stage Dashboard (Collapsible) (moved down)

This involves:
- Moving the entire Stage Workflow block (lines 1045-1111) to appear before Stage Dashboard (line 697)
- Adjusting animation delays to maintain smooth transitions

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/cases/CaseLifecycleFlow.tsx` | 1. Reorder sections (Workflow before Dashboard), 2. Pass `stageInstanceId` to HearingModal, 3. Add `refreshWorkflow()` on modal close, 4. Improve Reply step empty state |
| `src/components/modals/HearingModal.tsx` | Add `stageInstanceId` prop and include in hearing form data |
| `src/services/hearingsService.ts` | Accept and persist `stage_instance_id` in `createHearing()` |

---

## Type Updates

**HearingFormData Interface** (in `types/hearings.ts`):
```typescript
export interface HearingFormData {
  // ... existing fields
  stage_instance_id?: string | null;
}
```

---

## Testing Checklist

1. Navigate to Cases → Select case → Lifecycle tab
2. Verify Stage Workflow appears **above** Stage Dashboard
3. Click "Hearing(s)" step in workflow
4. Click "Schedule Hearing" button
5. Fill form and save
6. Verify hearing appears immediately in the panel (without refresh)
7. Verify hearing count badge updates on the timeline step
8. Click "Reply" step
9. If no notices: Verify empty state message appears
10. If notices exist: Verify notices panel shows and Reply button works
11. Click Reply button on a notice
12. Verify FileReplyModal opens with correct notice context
