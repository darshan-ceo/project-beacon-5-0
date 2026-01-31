
# Fix "Create Task" Navigation from Case Lifecycle

## Problem

When clicking "Create Task" from the Case Lifecycle → Stage Dashboard, users are currently redirected to the Task Management home page (`/tasks?action=create&caseId=...`) instead of the actual Create Task form (`/tasks/new`).

**Expected Behavior**: The Create Task form should open directly with:
- Client pre-selected based on the case
- Case pre-linked
- Case number displayed

## Root Cause

In `CaseLifecycleFlow.tsx` (line 204-206), the navigation handler uses:
```typescript
navigate(`/tasks?action=create&caseId=${selectedCase.id}&stage=${...}`);
```

This navigates to the Task Management page, not the Create Task form.

## Solution

Update the navigation to match how `CaseTasksTab.tsx` correctly handles this:
```typescript
navigate(`/tasks/new?caseId=${selectedCase.id}&clientId=${selectedCase.clientId}&caseNumber=${selectedCase.caseNumber}`);
```

---

## Technical Changes

### File: `src/components/cases/CaseLifecycleFlow.tsx`

**Location**: Lines 203-208

**Current Code**:
```typescript
const handleCreateTask = () => {
  if (selectedCase) {
    navigate(`/tasks?action=create&caseId=${selectedCase.id}&stage=${encodeURIComponent(selectedCase.currentStage)}`);
  }
};
```

**Updated Code**:
```typescript
const handleCreateTask = () => {
  if (selectedCase) {
    const params = new URLSearchParams({
      caseId: selectedCase.id,
      clientId: selectedCase.clientId || '',
      caseNumber: selectedCase.caseNumber || '',
    });
    navigate(`/tasks/new?${params.toString()}`);
  }
};
```

---

## Expected Result

After clicking "Create Task" from the Stage Dashboard:

1. User is navigated to `/tasks/new?caseId=...&clientId=...&caseNumber=...`
2. The Create Task form opens immediately
3. The "Linked Case" card shows the pre-selected case details
4. Client is already associated via the case linkage
5. User can immediately fill in task details and submit

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/cases/CaseLifecycleFlow.tsx` | Update `handleCreateTask` to navigate to `/tasks/new` with proper query parameters |

---

## Testing Checklist

1. From Case Management → Lifecycle tab → Stage Dashboard, click "Create Task"
2. Verify the Create Task form opens (not Task Management home)
3. Verify the "Linked Case" card shows the correct case number and client name
4. Complete the form and submit - task should be created with case linkage
5. After submission, verify task appears in Case → Tasks tab
6. Verify "View Tasks" button still works correctly (navigates to filtered task list)
