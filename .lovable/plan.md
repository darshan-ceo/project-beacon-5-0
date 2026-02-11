
# Fix: Notice Intake Wizard Document Upload Not Working

## Problem

When a notice is added to an existing case via the Notice Intake Wizard, the uploaded document appears in the Documents tab but cannot be previewed, downloaded, or deleted. After refresh, it disappears entirely.

## Root Cause

There are **two separate document upload systems** in the codebase:

1. **`dmsService.files.upload()`** (legacy) -- Creates documents with non-UUID IDs like `doc-1770796660746`, stores file content as base64 in app state/IndexedDB, and dispatches to Redux.

2. **`supabaseDocumentService.uploadDocument()`** (production) -- Creates documents with proper UUID IDs, uploads actual files to Supabase Storage, and creates records in the `documents` database table.

The Notice Intake Wizard V2 uses the **legacy** `dmsService` (option 1), but the Case Documents tab uses the **production** `supabaseDocumentService` for all view/download/delete operations. This mismatch causes:

- **Preview/Download fails**: `documentDownloadService.preview()` tries to fetch from Supabase Storage using a path like `/documents/doc-1770796660746` which doesn't exist in Storage.
- **Delete fails**: `supabaseDocumentService.deleteDocument()` calls `isValidUUID(id)` on `doc-1770796660746`, which fails immediately with "Invalid document ID".
- **Disappears on refresh**: The document only exists in transient Redux state (dispatched via `ADD_DOCUMENT`). The persistence layer may partially save it, but the Documents tab queries Supabase, where no record exists.

## Fix

Update `NoticeIntakeWizardV2.tsx` to use `supabaseDocumentService.uploadDocument()` instead of `dmsService.files.upload()`. This ensures:

- File is uploaded to Supabase Storage (real blob storage)
- Database record is created with proper UUID
- Preview, download, and delete all work correctly
- Document persists across refreshes
- Real-time subscription picks up the new document automatically

### Changes Required

**File: `src/components/notices/NoticeIntakeWizardV2.tsx`**

Replace the document upload block (around lines 408-426):

```typescript
// BEFORE (broken):
await dmsService.files.upload('system', uploadedFile, {
  caseId, stage: 'Assessment', folderId: 'gst-notices',
  tags: [extractedData.notice_type || 'Notice', 'Wizard-Upload']
}, dispatch);

// AFTER (correct):
import { uploadDocument } from '@/services/supabaseDocumentService';

// Get tenant_id from user profile
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase.from('profiles')
  .select('tenant_id').eq('id', user.id).single();

await uploadDocument(uploadedFile, {
  tenant_id: profile.tenant_id,
  case_id: caseId,
  client_id: clientId,
  category: 'Notice',
});
```

This is a targeted one-file change. The real-time subscription in `CaseDocuments.tsx` will automatically pick up the new document from the database INSERT event, so no other files need modification.

### Also Check

The original `NoticeIntakeWizard.tsx` (V1) has the same issue at line ~577. If V1 is still in use, it should receive the same fix.

## Files to Modify

1. **`src/components/notices/NoticeIntakeWizardV2.tsx`** -- Switch from `dmsService.files.upload()` to `supabaseDocumentService.uploadDocument()`
2. **`src/components/notices/NoticeIntakeWizard.tsx`** -- Same fix for V1 wizard (if still active)
