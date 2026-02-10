

# Stage-Aware Structured Reply for Appeal Stages

## Overview
Extend the Reply workflow so that for appeal-level stages (First Appeal and above), clicking "Reply" opens a full-page structured form instead of the existing simple modal. The existing modal remains unchanged for Assessment and Adjudication stages.

## Stage Level Logic
The `lifecycleStages` array defines stage order:
- Index 0: Assessment -- simple modal
- Index 1: Adjudication -- simple modal
- Index 2+: First Appeal, Tribunal, High Court, Supreme Court -- full-page structured reply

The threshold is index >= 2 (matching "First Appeal onwards").

---

## Step 1: Database Migration -- `structured_reply_details` Table

Create a new additive table to store the extended reply fields without modifying `stage_replies`:

```text
structured_reply_details
  id             UUID PK
  tenant_id      UUID FK -> tenants
  reply_id       UUID FK -> stage_replies (unique, 1:1)
  case_id        UUID FK -> cases
  prepared_by    TEXT
  filed_by_name  TEXT
  pre_deposit_pct    NUMERIC
  pre_deposit_amount NUMERIC
  pre_deposit_remarks TEXT
  cross_obj_ref      TEXT
  cross_obj_date     DATE
  ack_reference_id   TEXT
  filing_proof_doc_ids JSONB (array of doc IDs)
  delay_reason       TEXT
  condonation_filed  BOOLEAN DEFAULT false
  key_arguments      TEXT
  strength_weakness  TEXT
  expected_outcome   TEXT
  additional_submissions JSONB (array of {description, doc_id})
  created_at     TIMESTAMPTZ DEFAULT now()
  updated_at     TIMESTAMPTZ DEFAULT now()
```

RLS: tenant-scoped read/write matching existing `stage_replies` policies.

## Step 2: New Route -- `/cases/:caseId/reply/edit`

Add a new route in `App.tsx`:

```text
/cases/:caseId/reply/edit?noticeId=X&replyId=Y&stageInstanceId=Z
```

This route renders the new `StructuredReplyPage` component wrapped in `ProtectedRoute` (no AdminLayout needed -- full-page form).

## Step 3: New Page Component -- `StructuredReplyPage.tsx`

Location: `src/pages/StructuredReplyPage.tsx`

Uses the existing `FullPageForm` shell. Sections (as Card components):

1. **Header Snapshot** (read-only) -- Case number, stage name, notice due date, reply status, delay badge
2. **Basic Reply Details** -- Reply Reference (required), Reply Date, Filing Mode (Online/Physical), Prepared By, Filed By
3. **Pre-Deposit Details** -- Percentage, Amount, Remarks (visible only for appeal stages)
4. **Cross-Objection** (optional) -- Reference No, Date
5. **Filing Proof** -- Acknowledgement/Portal Reference ID, Upload filing proof (reuses existing upload logic from `FileReplyModal`)
6. **Additional Submissions** -- Repeatable rows with description + document upload
7. **Delay Handling** -- Conditionally shown when reply_date > notice due_date; mandatory delay reason, optional condonation checkbox
8. **Internal Notes** -- Key Arguments, Strength/Weakness, Expected Outcome dropdown

Footer: "Save Draft" and "File Reply" buttons.

## Step 4: New Service -- `structuredReplyService.ts`

Location: `src/services/structuredReplyService.ts`

Methods:
- `getByReplyId(replyId)` -- fetch structured details
- `save(data)` -- upsert into `structured_reply_details`
- Reuses `stageRepliesService.createReply()` / `updateReply()` for the base reply record

On "File Reply" (status = Filed):
- Calls `stageRepliesService` to update status to Filed
- This automatically updates notice status to "Replied" (existing logic)
- Creates a timeline entry via existing workflow step mechanisms

## Step 5: Modify `handleFileReply` in `CaseLifecycleFlow.tsx`

Current code (line 304-307):
```typescript
const handleFileReply = useCallback((notice: StageNotice) => {
  setSelectedNotice(notice);
  setShowFileReplyModal(true);
}, []);
```

Changed to:
```typescript
const handleFileReply = useCallback((notice: StageNotice) => {
  const stageIndex = lifecycleStages.findIndex(
    s => s.id === normalizeStage(selectedCase?.currentStage)
  );
  if (stageIndex >= 2) {
    // Appeal stage: navigate to full-page structured reply
    navigate(`/cases/${selectedCase.id}/reply/edit?noticeId=${notice.id}&stageInstanceId=${stageInstanceId}`);
  } else {
    // Pre-appeal: use existing modal
    setSelectedNotice(notice);
    setShowFileReplyModal(true);
  }
}, [selectedCase, stageInstanceId, navigate]);
```

## Step 6: Lifecycle Automation

When structured reply is filed (status = "Filed"):
1. `stageRepliesService.createReply` already updates notice status to "Replied"
2. The workflow step for "reply" is already auto-advanced
3. No additional automation code needed -- existing service handles it

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| New migration SQL | Create | `structured_reply_details` table + RLS |
| `src/App.tsx` | Edit | Add `/cases/:caseId/reply/edit` route |
| `src/pages/StructuredReplyPage.tsx` | Create | Full-page structured reply form |
| `src/services/structuredReplyService.ts` | Create | CRUD for structured reply details |
| `src/components/cases/CaseLifecycleFlow.tsx` | Edit | Stage-aware reply routing in `handleFileReply` |
| `src/types/stageWorkflow.ts` | Edit | Add `StructuredReplyDetails` type |

## Zero-Regression Guarantee

- Existing `FileReplyModal` is untouched -- still used for Assessment and Adjudication
- Existing `stage_replies` table is not modified
- Existing `stageRepliesService` is reused as the base layer
- Only additive database changes (new table)
- Back navigation from structured reply page returns to case lifecycle

