

# Fix Reply Save Redirect + Add View/Edit Mode for Closed Stages

## Issue 1: Reply Save Redirects to Case Management Dashboard

### Root Cause
In `src/pages/StructuredReplyPage.tsx` (line 196), after filing a reply, `navigate(-1)` is called. Since the Structured Reply page is navigated to via a full route (`/cases/:caseId/reply/edit`), `navigate(-1)` goes back in browser history. If the user came from the Lifecycle tab, this should work -- but the issue is that after filing, the navigation history may point to `/cases` (the main Case Management page) instead of the Lifecycle tab.

### Fix
Replace `navigate(-1)` with an explicit navigation back to the cases page with the correct case selected. The `/cases` route uses query params or in-app state to select a case. The safest approach is to use `navigate(-1)` but also handle the "Save Draft" path to navigate back too, keeping the user on the same page. However, the real fix is to navigate explicitly to `/cases` with the case pre-selected and Lifecycle tab active, e.g.:
```
navigate(`/cases?selectedCase=${caseId}&tab=Lifecycle`)
```
We need to verify how the cases page reads these params.

Alternatively, a simpler approach: change `navigate(-1)` to `navigate(`/cases`, { state: { selectedCaseId: caseId, activeTab: 'Lifecycle' } })` and ensure `CaseManagement` reads from location state.

**Simpler approach chosen**: Use `navigate(-1)` but ensure it works correctly. The actual problem visible in the screenshots is that the user lands on `/cases` (Case Management dashboard) without any case selected. The fix is to replace `navigate(-1)` with a direct navigation that preserves case context.

### Changes in `src/pages/StructuredReplyPage.tsx`
- Line 195-197: Replace `navigate(-1)` with `navigate('/cases', { state: { selectedCaseId: caseId, activeTab: 'Lifecycle' } })` after successful filing
- Line 237 and 243: Update the Cancel/Close `navigate(-1)` calls similarly to preserve context

### Changes in `src/pages/CaseManagement.tsx` (or equivalent)
- Read `location.state.selectedCaseId` and `location.state.activeTab` on mount to auto-select the case and switch to Lifecycle tab

---

## Issue 2: Closed Stages Should Open in View Mode with Edit Toggle

### Current Behavior
When `isViewingHistorical` is true, the entire stage content is locked in read-only mode with no way to edit. The user wants closed/historical stages to default to view mode but allow toggling to edit mode via an Edit button.

### Fix
Add an `isEditing` state toggle in `CaseLifecycleFlow.tsx`. When viewing a historical stage:
- Default: `isEditing = false` (view-only mode, same as current behavior)
- Show an "Edit" button in the historical stage banner
- When Edit is clicked, set `isEditing = true`, which passes `isReadOnly={false}` to child panels
- Reset `isEditing` to false when switching stages

### Changes in `src/components/cases/CaseLifecycleFlow.tsx`
1. Add state: `const [isEditingHistorical, setIsEditingHistorical] = useState(false)`
2. Reset `isEditingHistorical` to `false` in the stage switch effect and `handleReturnToCurrent`
3. Add an "Edit" button to the historical stage amber banner
4. Change all `isReadOnly={isViewingHistorical}` to `isReadOnly={isViewingHistorical && !isEditingHistorical}`
5. When editing is active on a historical stage, show a "Cancel Edit" button to return to view mode

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/StructuredReplyPage.tsx` | Replace `navigate(-1)` with explicit navigation preserving case + tab context |
| `src/components/cases/CaseLifecycleFlow.tsx` | Add `isEditingHistorical` toggle; show Edit button on historical banner; pass computed `isReadOnly` to all panels |

### Additional verification needed
- Check how the Cases page receives navigation state to auto-select a case and tab (will inspect during implementation)
- Ensure the FileReplyModal (pre-appeal) already stays on the same page (it uses a modal, so it should be fine)

