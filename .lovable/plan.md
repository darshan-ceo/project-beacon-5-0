

# Fix: Documents Not Appearing After Notice Intake Upload + Preview/Download/Delete Reliability

## Problem

When a document is uploaded via the Notice Intake Wizard ("Add this Notice to an Existing Case"), the upload succeeds (DB record confirmed), but the document does not appear in the case Documents tab. Preview, download, and delete buttons fail for some documents.

## Root Cause

**CaseDocuments relies solely on `state.documents` (Redux)**, which is populated once at app startup by DataInitializer. When the wizard uploads a document mid-session:

1. `uploadDocument()` inserts into the database successfully
2. But no `ADD_DOCUMENT` dispatch happens to update Redux state
3. CaseDocuments has a realtime subscription, but it only fires while the Documents tab is actively mounted -- during the wizard flow, it is NOT mounted, so the INSERT event is missed
4. Result: the document exists in the DB but is invisible in the UI until a full page refresh

After page refresh, DataInitializer reloads all documents from the DB, so they should appear. The user reports they do not appear even after refresh, which could indicate a timing or navigation issue where the case is not re-selected after refresh.

## Fix Strategy

### Fix 1: CaseDocuments should fetch documents from DB on mount

Instead of relying only on stale `state.documents`, CaseDocuments should perform an initial fetch from the `documents` table when it mounts (or when `selectedCase` changes). This ensures any documents uploaded while the tab was unmounted are loaded.

**File: `src/components/cases/CaseDocuments.tsx`**

Add a `useEffect` that fetches documents from the DB directly:

```typescript
useEffect(() => {
  if (!selectedCase) return;
  
  const fetchCaseDocuments = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', selectedCase.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Map and dispatch each document to Redux state
      data.forEach(doc => {
        const exists = state.documents.some(d => d.id === doc.id);
        if (!exists) {
          rawDispatch({ type: 'ADD_DOCUMENT', payload: mapDbDocToState(doc) });
        }
      });
    }
  };
  
  fetchCaseDocuments();
}, [selectedCase?.id]);
```

Extract the DB-to-state mapping into a shared helper function (used by both the realtime handler and the initial fetch) to avoid duplication.

### Fix 2: Wizard should dispatch to Redux after upload

**File: `src/components/notices/NoticeIntakeWizardV2.tsx`**

After `uploadDocument()` succeeds, dispatch the result to Redux state so documents appear immediately without waiting for realtime or tab remount:

```typescript
const result = await uploadDocument(uploadedFile, { ... });

// Dispatch to Redux so Documents tab shows it immediately
dispatch({
  type: 'ADD_DOCUMENT',
  payload: {
    id: result.id,
    name: result.file_name,
    type: result.file_type,
    size: result.file_size,
    path: result.file_path,
    caseId: caseId,
    clientId: clientId,
    category: 'Notice',
    // ... mapped fields
  }
});
```

Same fix for `NoticeIntakeWizard.tsx` (V1).

### Fix 3: Prevent duplicate documents in state

The realtime subscription and initial fetch could both add the same document. Add a guard in the `ADD_DOCUMENT` reducer (or in the dispatch call) to skip if a document with the same `id` already exists in state.

## Files to Modify

1. **`src/components/cases/CaseDocuments.tsx`** -- Add initial DB fetch on mount; extract mapping helper
2. **`src/components/notices/NoticeIntakeWizardV2.tsx`** -- Dispatch ADD_DOCUMENT after successful upload
3. **`src/components/notices/NoticeIntakeWizard.tsx`** -- Same dispatch fix for V1

## What This Fixes

- Documents uploaded via wizard appear immediately in the Documents tab
- Documents uploaded while Documents tab was unmounted appear when tab is opened
- Preview, download, and delete continue to work (they already use `filePath` from state, which will now be correctly populated from DB data)
- No duplicate documents in state

