
# Stage Workflow Bug Fixes and UX Improvements

## Issues Identified

| # | Issue | Root Cause |
|---|-------|------------|
| 1 | Hearings not visible in Stage Workflow panel despite badge showing count | The `stageHearings` variable filters from `state.hearings` (React context), but `state.hearings` is NOT updated when the modal closes. The `refreshWorkflow()` only refreshes workflow counts from database, not the local `state.hearings` array |
| 2 | File Reply modal - cannot upload documents | The "Upload Reply Document" button is a placeholder `<Button type="button">` with no click handler - document upload functionality was never implemented |
| 3 | UI/UX needs improvement (similar to new case modal) | Modals use basic `Dialog` instead of the standardized `ModalLayout` or `AdaptiveFormShell` pattern with proper section headers and dividers |
| 4 | Filed replies not visible in UI | No dedicated "Replies" panel exists to show filed replies. Replies are created but not displayed anywhere after filing |

---

## Issue 1: Hearings Not Visible in Panel

### Root Cause Analysis

```text
Current Flow:
1. User clicks "Schedule Hearing" in StageHearingsPanel
2. HearingModal opens with stageInstanceId passed as prop ✓
3. User saves hearing → hearingsService.createHearing() persists to DB ✓
4. Service calls dispatch({ type: 'ADD_HEARING', payload: newHearing }) ✓
5. Modal closes, refreshWorkflow() is called ✓
6. StageHearingsPanel renders with hearings={stageHearings}

Problem:
The stageHearings variable is computed as:
  state.hearings?.filter(h => 
    h.caseId === selectedCase.id && 
    (h.stage_instance_id === stageInstanceId || !h.stage_instance_id)
  )

But `h.caseId` vs `h.case_id` - the Hearing type has BOTH:
- case_id (from database)
- caseId (legacy/mapped field)

The hearingsService.createHearing() returns the hearing with case_id but the filter 
uses caseId. Additionally, stage_instance_id may not be set on the returned hearing
object because the DB column was added but the service may not be returning it.
```

### Solution

**1. Fix the `stageHearings` filter to check both field names**

```typescript
// In CaseLifecycleFlow.tsx, update the stageHearings useMemo:
const stageHearings = useMemo(() => {
  if (!selectedCase?.id) return [];
  return state.hearings?.filter(h => {
    const hearingCaseId = h.caseId || h.case_id;
    const matchesCase = hearingCaseId === selectedCase.id;
    const matchesStage = h.stage_instance_id === stageInstanceId || !h.stage_instance_id;
    return matchesCase && matchesStage;
  }) || [];
}, [selectedCase?.id, stageInstanceId, state.hearings]);
```

**2. Ensure hearingsService.createHearing() includes stage_instance_id in the returned hearing**

Check that the `newHearing` object includes `stage_instance_id` property:

```typescript
const newHearing: Hearing = {
  id: savedHearing.id,
  case_id: savedHearing.case_id,
  caseId: data.case_id, // Ensure both field names are set
  stage_instance_id: savedHearing.stage_instance_id || data.stage_instance_id, // Include this
  // ... rest
};
```

**3. Optional: Force refetch hearings from DB after modal closes**

Since `state.hearings` should already update via dispatch, ensure the HearingModal onClose properly triggers a state refresh.

---

## Issue 2: File Reply Document Upload Not Working

### Root Cause
The FileReplyModal has a placeholder button that does nothing:

```tsx
{/* Document Upload Placeholder */}
<div className="space-y-1.5">
  <Label>Attach Documents</Label>
  <Button type="button" variant="outline" className="w-full">
    <Upload className="h-4 w-4 mr-2" />
    Upload Reply Document
  </Button>
  <p className="text-xs text-muted-foreground">
    Upload the reply document and any supporting evidence
  </p>
</div>
```

### Solution

Implement document upload functionality using the existing `HearingDocumentUpload` pattern:

**1. Add file state management to FileReplyModal**

```typescript
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
```

**2. Replace placeholder with functional upload zone**

```tsx
{/* Document Upload Zone */}
<div className="space-y-2">
  <Label>Attach Documents</Label>
  <div
    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
    onDrop={(e) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }}
    className={cn(
      "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
      isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
    )}
    onClick={() => fileInputRef.current?.click()}
  >
    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
    <p className="text-xs text-muted-foreground">
      Drop files here or click to browse
    </p>
  </div>
  <input
    ref={fileInputRef}
    type="file"
    multiple
    accept=".pdf,.doc,.docx,.jpg,.png"
    className="hidden"
    onChange={(e) => {
      const files = Array.from(e.target.files || []);
      setSelectedFiles(prev => [...prev, ...files]);
    }}
  />
  
  {/* Show selected files */}
  {selectedFiles.length > 0 && (
    <div className="space-y-1">
      {selectedFiles.map((file, idx) => (
        <div key={idx} className="flex items-center justify-between p-2 border rounded text-sm">
          <span className="truncate">{file.name}</span>
          <Button size="icon" variant="ghost" onClick={() => removeFile(idx)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )}
</div>
```

**3. Update onSave to upload documents**

In the `handleSubmit` function:
- Upload files to Supabase storage using `supabaseDocumentService`
- Collect document IDs
- Include `documents: documentIds` in the `CreateStageReplyInput`

**4. Update stageRepliesService to handle document IDs**

The service already accepts `documents` array in the input and persists it to the database.

---

## Issue 3: UI/UX Improvement - Modal Standardization

### Current State
Both `AddNoticeModal` and `FileReplyModal` use basic Dialog components without the standardized layout.

### Solution

Update both modals to follow the `ModalLayout` or `AdaptiveFormShell` pattern used across the application:

**Key UI improvements:**
1. Use `ModalLayout` wrapper or `DialogHeader` with `showDivider`
2. Add icon to title
3. Improve form field spacing with 16px gaps
4. Use proper section groupings with visual separators
5. Right-align footer buttons
6. Add proper validation feedback

**For AddNoticeModal:**
- Use `ModalLayout` with `icon={<FileText />}`
- Add divider between notice context and form fields
- Group date fields together visually
- Show notice count or stage context in header

**For FileReplyModal:**
- Use `ModalLayout` with `icon={<Send />}`
- Show notice summary card at top (already present)
- Improve document upload section with drag-drop zone
- Add visual feedback for filing status selection

---

## Issue 4: Filed Replies Not Visible in UI

### Root Cause
When a reply is filed:
1. It's saved to `stage_replies` table ✓
2. Notice status updates to "Replied" or "Reply Pending" ✓
3. The workflow timeline shows reply count ✓
4. BUT there's no UI to VIEW the filed replies

### Solution

**Option A: Show replies inline in StageNoticesPanel (Recommended)**

When a notice has replies, show them in the expanded details section:

```tsx
{/* In StageNoticesPanel expanded section */}
{isExpanded && (
  <>
    {/* Existing details grid */}
    
    {/* Replies Section */}
    {noticeReplies.length > 0 && (
      <div className="mt-3 pt-3 border-t">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Filed Replies ({noticeReplies.length})
        </p>
        {noticeReplies.map(reply => (
          <div key={reply.id} className="flex items-center justify-between p-2 bg-muted/50 rounded mb-1">
            <div>
              <span className="text-xs font-medium">{reply.reply_reference || 'Reply'}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatDate(reply.reply_date)}
              </span>
              <Badge variant="outline" className="ml-2 text-[10px]">
                {reply.filing_status}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {reply.documents?.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {reply.documents.length} doc(s)
                </Badge>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
)}
```

**Option B: Create StageRepliesPanel component**

A dedicated panel shown when clicking the "Reply" step that displays all filed replies grouped by notice.

**Recommended approach**: Option A (inline in notices) because:
- Replies are contextually linked to notices
- Users don't need to switch panels to see reply status
- Reduces UI complexity

**Implementation steps:**
1. In `CaseLifecycleFlow.tsx`, call `loadRepliesForNotice()` when expanding a notice
2. Pass `noticeReplies` Map to `StageNoticesPanel`
3. Add replies display section in the expanded notice card
4. Add document preview/download capability for attached documents

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/cases/CaseLifecycleFlow.tsx` | Fix stageHearings filter to use both caseId and case_id |
| `src/components/modals/FileReplyModal.tsx` | Add document upload functionality with drag-drop |
| `src/components/modals/AddNoticeModal.tsx` | UI polish using ModalLayout pattern |
| `src/components/lifecycle/StageNoticesPanel.tsx` | Show filed replies inline when notice is expanded |
| `src/services/hearingsService.ts` | Ensure stage_instance_id is returned in newHearing object |
| `src/types/stageWorkflow.ts` | Add filed_by_name to StageReply for display |

---

## Additional QC Items for Stage Workflow

### Missing Features to Consider

| Feature | Status | Priority |
|---------|--------|----------|
| Edit Reply functionality | Not implemented | Medium |
| Delete Reply functionality | Service exists but UI not wired | Low |
| Reply document preview/download | Not implemented | High |
| Notice document upload | Not implemented | Medium |
| Workflow step skip confirmation | No confirmation dialog | Low |
| Stage closure order upload | Not implemented | High |
| Hearing outcome recording | UI exists but needs stage linkage | Medium |

### Data Integrity Checks

1. **Orphaned Hearings**: Hearings created before stage_instance_id column may show in wrong stages
2. **Reply-Notice Linkage**: Ensure deleting a notice cascades to replies (DB constraint exists)
3. **Workflow Step Initialization**: Verify steps auto-create when stage instance is first accessed

### UI/UX Improvements to Consider

1. Add loading skeletons while fetching workflow data
2. Add confirmation dialogs for delete actions
3. Show toast notifications for all CRUD operations consistently
4. Add keyboard navigation for step timeline
5. Consider collapsible panels for mobile responsiveness

---

## Testing Checklist After Implementation

1. ✅ Create hearing from Hearings step → Verify it appears immediately in panel
2. ✅ File reply with documents → Verify documents are uploaded and linked
3. ✅ View filed replies → Verify they appear in notice expanded section
4. ✅ Check Reply step → Shows pending notices or empty state
5. ✅ Verify workflow counts update correctly after each action
6. ✅ Test on mobile viewport for responsiveness
7. ✅ Verify document download works from reply display
