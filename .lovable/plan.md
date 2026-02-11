

# Fix: "View Scanned Notice Copy" Shows All Documents Instead of Case-Specific

## Problem
Clicking "View Scanned Notice Copy" in the Stage Dashboard navigates to `/documents` (the global Document Management page), which shows documents from all cases. It should show only documents for the currently selected case.

## Root Cause
In `CaseLifecycleFlow.tsx`, `handleViewOriginalNotice` calls `navigate('/documents?docId=...')`, routing to the global DMS page. The global DMS page does not filter by case.

## Fix
Change the navigation to stay within Case Management and switch to the case's own **Documents** tab. `CaseManagement` already supports URL-based tab switching via `?caseId=X&tab=documents`.

### File: `src/components/cases/CaseLifecycleFlow.tsx`

Update `handleViewOriginalNotice` (lines 528-547):

**Before:**
```typescript
const handleViewOriginalNotice = () => {
  if (!selectedCase) return;
  const noticeDoc = state.documents?.find(...);
  if (noticeDoc) {
    navigate(`/documents?docId=${noticeDoc.id}`);
  } else {
    toast({ ... });
  }
};
```

**After:**
```typescript
const handleViewOriginalNotice = () => {
  if (!selectedCase) return;
  // Navigate to case Documents tab (filtered to this case)
  navigate(`/cases?caseId=${selectedCase.id}&tab=documents`);
};
```

This ensures:
- Only documents for the selected case are displayed (CaseDocuments component already filters by `selectedCase.id`)
- No need for a document-specific match -- the user lands on the case's Documents tab and can find the notice document there
- Simpler, more reliable behavior

## Files to Modify
1. **`src/components/cases/CaseLifecycleFlow.tsx`** -- Update `handleViewOriginalNotice` to navigate to the case Documents tab
