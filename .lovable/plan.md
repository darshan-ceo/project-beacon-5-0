

# Case Intelligence Report -- Implementation Plan

## Overview

Replace the existing "Case Action Dossier (PDF)" with a full **Case Intelligence Report** -- an interactive, executive-level web view with lifecycle analytics, risk scoring, financial exposure summaries, and optional PDF export and snapshot freezing.

---

## Phase 1: Renaming and Button Update

### Changes
- **StickyCaseActionBar.tsx**: Replace the "Dossier" button with a BarChart3 icon labeled "Intelligence". On click, navigate to `/cases/:id/intelligence-report` instead of calling `caseActionDossierService.downloadDossier()`.
- **CaseContextHeader.tsx**: Same replacement -- navigate instead of download.
- Tooltip: "View Case Intelligence Report"
- If risk is High, show a small red dot indicator on the icon.

### Header button order (right side):
```text
[ BarChart3 Intelligence ]   [ Complete ]   [ Clear ]
```

---

## Phase 2: New Route and Page Shell

### New route in App.tsx
```text
/cases/:id/intelligence-report --> CaseIntelligenceReport page
```

### New files
- `src/pages/CaseIntelligenceReport.tsx` -- Full-page layout with:
  - Scrollable executive layout
  - Sticky top bar: Download PDF, Print, Freeze Snapshot, Close
  - Left anchor sidebar navigation (desktop)
  - Collapsible sections
  - Print-friendly CSS

---

## Phase 3: Intelligence Service

### New file: `src/services/caseIntelligenceService.ts`

A dedicated aggregation service that fetches all data in parallel and computes analytics. Replaces `caseActionDossierService.ts` for the intelligence report.

**Data fetched (parallel):**
1. Case record + client name
2. Stage instances (from `stage_instances` table)
3. Stage transitions (from `stage_transitions` table)
4. Stage notices (from `stage_notices` table)
5. Hearings (from `hearings` table)
6. Tasks (from `tasks` table)
7. Documents (from `documents` table)
8. Stage replies (from `stage_replies` table)
9. Current user profile

**Computed analytics:**
- Days in current stage = today - stage entry date
- Total lifecycle duration = today - case creation date
- Stage efficiency % = completed checklist items / required items
- Total stage transitions count
- Average stage duration
- Reopened/remand cycle count
- Litigation complexity score (weighted: cycles + hearings + transitions)
- Escalation flag if stage exceeds SLA threshold

**Risk scoring engine (rule-based):**
- Stage overdue weight (days beyond SLA)
- Financial exposure weight (demand amount tiers)
- Pending critical actions weight (overdue tasks, pending replies)
- Reopened cycle weight (remand count)
- Output: Low (Green) / Medium (Amber) / High (Red) with numeric score

**Financial exposure summary:**
- Demand amount, penalty, interest, contested amount from stage notices demand breakdown

---

## Phase 4: Report Sections (React Components)

All sections are collapsible and rendered as individual components under `src/components/intelligence/`.

### Section 1: Cover
- "Confidential -- Legal Privilege" banner
- Case name, number, client, current stage
- Risk level (color-coded badge)
- Financial exposure total
- Days in current stage
- Generated date and user

### Section 2: Executive Summary
- Auto-generated structured text block describing current position, pending actions, financial exposure, risk evaluation, escalation alerts

### Section 3: Lifecycle Intelligence
- **A. Stage Workflow Visual**: Horizontal pipeline (Notice -> Reply -> Hearing -> Closure) with completion %, active node highlighted, color codes (green/blue/grey/red), count badges
- **B. Stage Dashboard KPIs**: Card grid with total notices, replies, hearings, pending actions, documents, financial exposure, risk indicator, stage progress %
- **C. Stage History and Cycles**: Accordion/timeline showing each stage instance with cycle number, start/end dates, duration, reopen reason
- **D. Stage Transition History**: Vertical chronological timeline with from/to stage, date, triggered by, duration in previous stage, remarks

### Section 4: Financial Exposure Summary
- Demand, penalty, interest, contested amount, payment status
- Pie chart (using recharts)

### Section 5: Hearings Summary
- Upcoming and past hearings table
- PH vs Regular classification
- Outcome summary

### Section 6: Document Index
- Total documents count
- Stage-wise grouping table
- Filed vs Pending status

### Section 7: Risk and Action Matrix
- Table: Risk Item | Severity | Impact | Action Required | Owner | Due Date
- Dynamically generated from overdue tasks, pending replies, SLA breaches

---

## Phase 5: PDF Export

- "Download PDF" button calls `window.print()` with print-friendly CSS, or reuses html2pdf.js on the rendered component tree
- Same layout as web view -- no duplicate formatting logic
- Filename: `Case_Intelligence_Report_{caseNumber}_{date}.pdf`

---

## Phase 6: Snapshot Mode

### Database migration
Create `case_intelligence_snapshots` table:
- `id` (uuid, PK)
- `case_id` (FK to cases)
- `snapshot_data` (jsonb -- the full computed intelligence payload)
- `risk_score` (text)
- `financial_exposure` (numeric)
- `created_by` (uuid)
- `created_at` (timestamptz)
- `label` (text, optional user note)
- RLS: tenant-scoped read/write

### Functionality
- "Freeze Snapshot" button saves current computed intelligence JSON to this table
- Snapshot is timestamped and immutable (no update, only insert)
- Historical snapshots can be viewed from a dropdown on the report page
- Comparison between current vs snapshot (future enhancement)

---

## Phase 7: Performance

- All data fetching in parallel via `Promise.all()`
- Lazy load heavy sections (transition history, document index) with React.lazy or intersection observer
- Paginate long transition logs (>20 entries)
- Cache computed analytics in component state (no re-fetch on section toggle)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/caseIntelligenceService.ts` | Data aggregation + analytics computation |
| `src/pages/CaseIntelligenceReport.tsx` | Full-page report shell with sidebar nav |
| `src/components/intelligence/IntelligenceCover.tsx` | Cover section |
| `src/components/intelligence/ExecutiveSummary.tsx` | Auto-generated summary |
| `src/components/intelligence/LifecycleIntelligence.tsx` | Workflow visual + KPIs + history |
| `src/components/intelligence/FinancialExposure.tsx` | Financial summary + pie chart |
| `src/components/intelligence/HearingsSummary.tsx` | Hearings table |
| `src/components/intelligence/DocumentIndex.tsx` | Document grouping |
| `src/components/intelligence/RiskActionMatrix.tsx` | Risk table |
| `src/components/intelligence/IntelligenceSidebar.tsx` | Anchor nav sidebar |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/cases/:id/intelligence-report` route |
| `src/components/cases/StickyCaseActionBar.tsx` | Replace Dossier button with Intelligence navigation |
| `src/components/cases/CaseContextHeader.tsx` | Same replacement |

## Database Migration

- Create `case_intelligence_snapshots` table with RLS policies

---

## Technical Notes

- Reuses existing `recharts` dependency for pie charts and mini bar charts
- Reuses existing Tailwind + shadcn/ui component library
- Risk scoring is purely rule-based (no AI model required)
- The old `caseActionDossierService.ts` is kept but no longer referenced from UI (can be removed in a cleanup pass)
- Executive summary text is template-driven (string interpolation from computed data), not AI-generated (can be upgraded to AI later)

