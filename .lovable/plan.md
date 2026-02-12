
# Fix Reply Panel in Stage Workflow + Enrich Intelligence Report

## Problem 1: Reply Step Shows Notices Instead of Replies

When clicking the "Reply" icon in the Stage Workflow timeline, the system incorrectly renders `StageNoticesPanel` (showing notices with "Reply Pending" status). Instead, it should display a dedicated **StageRepliesPanel** that lists all filed replies (e.g., "Reply (5)" with 5 reply cards), similar to how clicking "Hearing(s)" shows individual hearing cards.

### Root Cause
In `CaseLifecycleFlow.tsx` (lines 898-925), the `activeStep === 'reply'` block reuses `StageNoticesPanel` with a filter. There is no `StageRepliesPanel` component.

### Fix
1. **Create `src/components/lifecycle/StageRepliesPanel.tsx`** -- A new panel component that:
   - Shows a header: "Reply(s)" with a count badge (e.g., "5")
   - Lists all replies across all notices for the current stage instance
   - Each reply card shows: Reply date, filing mode (Portal/Physical/Email), status badge (Draft/Filed/Acknowledged), linked notice reference, and filed-by name
   - Includes a "+ File Reply" button (opens reply modal on the first pending notice)
   - Read-only mode support for historical stages
   - Design mirrors the `StageHearingsPanel` card layout

2. **Update `CaseLifecycleFlow.tsx`** (lines 898-925):
   - Replace the `StageNoticesPanel` usage under `activeStep === 'reply'` with the new `StageRepliesPanel`
   - Pass all replies from `noticeReplies` map (aggregated across all notices) plus the notice list for reference

3. **Pre-load all replies on workflow init** -- Update `useStageWorkflow.ts` to automatically load replies for all notices when the workflow state loads, so the Reply panel has data immediately without requiring expand clicks.

---

## Problem 2: Intelligence Report Missing Stage Workflow Content

The Intelligence Report currently shows Lifecycle (stages + transitions), Hearings, Documents, Financial, and Risk sections. It is missing:
- **Notices summary** (count, types, statuses, demand breakdown)
- **Replies summary** (count, filing modes, statuses)
- **Stage Closure details** (outcomes, closure orders)

### Fix
1. **Create `src/components/intelligence/NoticesRepliesSummary.tsx`** -- A new section that renders:
   - **Notices Table**: Notice number, date, status, demand amount, stage
   - **Replies Table**: Linked notice, filing date, filing mode, status
   - Counts and summary statistics

2. **Create `src/components/intelligence/StageClosureSummary.tsx`** -- A new section showing:
   - Closure outcomes per stage (Order Passed, Dropped, Remanded, etc.)
   - Order references and dates
   - Fetches from `stage_closure_details` table

3. **Update `src/services/caseIntelligenceService.ts`**:
   - Add `closures` field to `IntelligenceData` interface
   - Add `ClosureData` type (stageKey, outcome, orderNumber, orderDate, demandBreakdown)
   - Fetch `stage_closure_details` data in the parallel query block
   - Map closure data alongside existing data

4. **Update `src/pages/CaseIntelligenceReport.tsx`**:
   - Add `NoticesRepliesSummary` section between Lifecycle and Financial
   - Add `StageClosureSummary` section after Notices/Replies

5. **Update `src/components/intelligence/IntelligenceSidebar.tsx`**:
   - Add "Notices & Replies" nav item (with Send icon)
   - Add "Stage Closures" nav item (with CheckCircle2 icon)

---

## Technical Details

### New Files

| File | Purpose |
|------|---------|
| `src/components/lifecycle/StageRepliesPanel.tsx` | Dedicated reply list panel for Stage Workflow timeline |
| `src/components/intelligence/NoticesRepliesSummary.tsx` | Intelligence report section for notices and replies |
| `src/components/intelligence/StageClosureSummary.tsx` | Intelligence report section for stage closure outcomes |

### Modified Files

| File | Change |
|------|--------|
| `src/components/cases/CaseLifecycleFlow.tsx` | Replace notices panel under `activeStep === 'reply'` with new `StageRepliesPanel` |
| `src/hooks/useStageWorkflow.ts` | Auto-load replies for all notices on workflow init |
| `src/services/caseIntelligenceService.ts` | Add closures data fetch, `ClosureData` type, expand `IntelligenceData` |
| `src/pages/CaseIntelligenceReport.tsx` | Add two new report sections |
| `src/components/intelligence/IntelligenceSidebar.tsx` | Add two new nav entries |

### StageRepliesPanel Component Structure

```text
StageRepliesPanel
  +-- Header: "Reply(s)" + count badge + "+ File Reply" button
  +-- Reply Cards (one per reply):
       +-- Filing date + status badge (Draft/Filed/Acknowledged)
       +-- Filing mode (Portal/Physical/Email) icon + label
       +-- Linked notice reference
       +-- Filed by name
       +-- Document attachment indicator
  +-- Empty state: "No replies filed yet"
```

### Intelligence Report Section Order (Updated)

1. Cover
2. Executive Summary
3. Lifecycle Intelligence (stages, transitions)
4. **Notices & Replies** (NEW)
5. **Stage Closures** (NEW)
6. Financial Exposure
7. Hearings
8. Documents
9. Risk & Action Matrix
