
# Fix: Case Selection During Portal Upload + "Unknown" Uploader Display

## Problems Identified

1. **No case selection during upload**: The `ClientDocumentUpload` component accepts an optional `caseId` prop but the parent `ClientPortal` never passes it. There is no dropdown for selecting which case the document belongs to.

2. **"Unknown" uploader name**: The admin panel resolves `uploaded_by` (a UUID) against the employees list. Portal users are not employees, so their name resolves to "Unknown". The remarks field contains `[Client Upload]` but this is not displayed as the uploader name.

3. **No client name shown**: The admin document list shows the uploader name (from employees lookup) but has no special handling for portal-uploaded documents.

## Solution

### 1. Add Case Selection Dropdown to `ClientDocumentUpload`

**File: `src/components/portal/ClientDocumentUpload.tsx`**

- Accept a `cases` prop (array of `{ id, case_number, title }`)
- Add a `Select` dropdown above the file input for choosing the related case
- Store the selected `caseId` in local state
- Pass it to the document insert call (already wired via the `case_id` field)
- Make case selection required before upload is allowed

**File: `src/components/portal/ClientPortal.tsx`**

- Pass `clientCases` to the `ClientDocumentUpload` component so the dropdown has data

### 2. Fix "Unknown" Uploader — Show "Client Portal" for Portal-Uploaded Documents

**File: `src/hooks/useRealtimeSync.ts` (lines 502-517, 526-540)**

- When resolving `uploadedByName`, if no employee match is found AND the file path starts with `client-uploads/`, set the name to `"Client Portal"` instead of `"Unknown"`.

**File: `src/components/documents/DocumentManagement.tsx` (lines 318-324, 362-370, 409-416)**

- Same logic: when mapping `state.documents` and realtime events, check if path starts with `client-uploads/` and use `"Client Portal"` as the uploader name fallback.

**File: `src/components/cases/CaseDocuments.tsx` (line 55)**

- Same pattern: use `"Client Portal"` when the document path indicates a portal upload.

### 3. Show Client Name in Admin Document List for Portal Uploads

The remarks field already contains `[Client Upload]`. Combined with the `client_id` field (which is always set), the admin can identify which client uploaded the document. The uploader name fix above (`"Client Portal"`) provides clear attribution.

## Technical Details

### `src/components/portal/ClientDocumentUpload.tsx`

Add a new prop for cases and a Select dropdown:

```typescript
interface ClientDocumentUploadProps {
  clientId: string;
  caseId?: string;
  cases?: Array<{ id: string; case_number: string; title: string }>;
  onUploadComplete?: () => void;
}
```

Add state for selected case:
```typescript
const [selectedCaseId, setSelectedCaseId] = useState(caseId || '');
```

Add a Select component before the file input showing available cases. Use `selectedCaseId` in the insert call instead of the prop `caseId`.

### `src/components/portal/ClientPortal.tsx` (line 284-286)

Pass cases to the upload component:
```tsx
<ClientDocumentUpload 
  clientId={clientId}
  cases={clientCases.map(c => ({ id: c.id, case_number: c.case_number, title: c.title }))}
  onUploadComplete={fetchClientData}
/>
```

### `src/hooks/useRealtimeSync.ts` (lines 503, 517, 526, 540)

Change the fallback from `'Unknown'` to check the path:
```typescript
const uploaderName = uploader?.full_name 
  || (docData.file_path?.startsWith('client-uploads/') ? 'Client Portal' : 'Unknown');
```

### `src/components/documents/DocumentManagement.tsx` (lines 322, 366, 415)

Same pattern for all three mapping locations:
```typescript
uploadedByName: doc.uploadedByName 
  || (doc.path?.startsWith('client-uploads/') ? 'Client Portal' : 'Unknown'),
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/portal/ClientDocumentUpload.tsx` | Add case selection dropdown with required validation |
| `src/components/portal/ClientPortal.tsx` | Pass `clientCases` to `ClientDocumentUpload` |
| `src/hooks/useRealtimeSync.ts` | Use "Client Portal" as uploader name for portal uploads |
| `src/components/documents/DocumentManagement.tsx` | Same uploader name fix in document mapping |
| `src/components/cases/CaseDocuments.tsx` | Same uploader name fix |
