

# Upgrade Stage Closure -- Embedded Form with Demand Breakdown

## Overview
Replace the current minimal Stage Closure panel with a full embedded "Add Closure" form. This includes authority/officer fields, a Final Demand Amount Breakdown with GST components, decoupled workflow validation, two-action footer ("Save Closure" / "Close Stage"), and lifecycle mapping based on closure outcome.

---

## Step 1: Database Migration -- `stage_closure_details` Table

Create an additive table to persist closure data independently of the stage transition:

```text
stage_closure_details
  id                       UUID PK
  tenant_id                UUID NOT NULL
  stage_instance_id        UUID UNIQUE FK -> stage_instances(id)
  case_id                  UUID FK -> cases(id)
  closure_status           TEXT NOT NULL  -- Order Passed | Fully Dropped | Withdrawn | Settled | Remanded
  closure_ref_no           TEXT
  closure_date             DATE
  issuing_authority        TEXT
  officer_name             TEXT
  officer_designation      TEXT
  final_tax_amount         JSONB DEFAULT '{}'  -- {igst, cgst, sgst, cess}
  final_interest_amount    NUMERIC DEFAULT 0
  final_penalty_amount     NUMERIC DEFAULT 0
  final_total_demand       NUMERIC DEFAULT 0   -- auto-calculated on save
  closure_notes            TEXT
  is_draft                 BOOLEAN DEFAULT true
  created_at               TIMESTAMPTZ DEFAULT now()
  updated_at               TIMESTAMPTZ DEFAULT now()
```

RLS: tenant-scoped read/write matching existing `stage_instances` policies.

This table stores the closure snapshot. "Fully Dropped" auto-zeros all amounts. No existing tables are modified.

## Step 2: New Types -- `stageClosureDetails.ts`

Location: `src/types/stageClosureDetails.ts`

```typescript
export type ClosureStatus = 'Order Passed' | 'Fully Dropped' | 'Withdrawn' | 'Settled' | 'Remanded';

export interface TaxBreakdown {
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface StageClosureDetailsRecord {
  id: string;
  tenant_id: string;
  stage_instance_id: string;
  case_id: string;
  closure_status: ClosureStatus;
  closure_ref_no: string | null;
  closure_date: string | null;
  issuing_authority: string | null;
  officer_name: string | null;
  officer_designation: string | null;
  final_tax_amount: TaxBreakdown;
  final_interest_amount: number;
  final_penalty_amount: number;
  final_total_demand: number;
  closure_notes: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}
```

## Step 3: New Service -- `stageClosureDetailsService.ts`

Location: `src/services/stageClosureDetailsService.ts`

Methods:
- `getByStageInstanceId(stageInstanceId)` -- fetch saved closure (draft or final)
- `save(data)` -- upsert into `stage_closure_details` with `is_draft = true`
- `finalize(stageInstanceId)` -- set `is_draft = false`

Auto-calculation: `final_total_demand = sum(igst+cgst+sgst+cess) + interest + penalty`

If `closure_status === 'Fully Dropped'`, all amounts are force-set to 0.

## Step 4: Decouple `checkCanClose` in `stageWorkflowService.ts`

Current logic blocks closure when notices are missing or workflow steps are incomplete.

Changed to:
- Remove all blocking reasons
- Return `canClose: true` always
- Compute `warningReasons` instead (same text, different semantics)
- Pass warnings to UI for informational display only

The `StageWorkflowState` interface gets a new field: `closureWarnings: string[]`

## Step 5: Rewrite `StageClosurePanel.tsx`

Replace the existing component with a full embedded form matching the reference screenshot.

### Layout

**Section 1: Closure Details (2-column grid)**
- Row 1: Closure Status (dropdown, required) | Move to Next Level (read-only, auto-derived)
- Row 2: Closure/Order Reference No (required) | Closure/Order Date (required, date picker)
- Row 3: Issuing Authority (required) | Officer Name (required)
- Row 4: Officer Designation (required)

**"Move to Next Level" logic** (read-only display):
- Order Passed -> "Next Stage: [stage name]" or "Final Stage" if at Supreme Court
- Fully Dropped / Withdrawn / Settled -> "No Movement (Case Closed at this Level)"
- Remanded -> "Remand to Earlier Stage"

**Section 2: Final Demand Amount Breakdown**
- Final Tax Amount (click-to-expand IGST/CGST/SGST/CESS breakdown, stored as JSON)
- Final Interest (numeric) with "As Applicable" checkbox
- Final Penalty (numeric) with "As Applicable" checkbox
- Auto-calculated "Final Total Demand" display (red, bold)
- If Closure Status = "Fully Dropped": all fields auto-zero with a green note: "This case will be marked as Closed as all demands are fully dropped."

**Section 3: Closure Notes** (optional textarea)

**Warnings Banner** (replaces blocking error):
- Yellow info banner: "Some workflow steps are incomplete. You can still close this stage."
- Never blocks the form

**Footer: Two Buttons**
- "Save Closure" (outline) -- validates and persists to `stage_closure_details` as draft
- "Close Stage" (primary) -- validates, finalizes closure, then executes lifecycle transition

### Validation Rules
- Closure Status: always required
- Reference No, Date, Issuing Authority, Officer Name, Officer Designation: required for all statuses
- Demand amounts: required unless "Fully Dropped" (auto-zeroed)

## Step 6: Update `handleCloseStage` in `CaseLifecycleFlow.tsx`

Split into two handlers:

**`handleSaveClosure`**: Saves closure data as draft via `stageClosureDetailsService.save()`. Shows success toast.

**`handleCloseStage`**: 
1. Saves/finalizes closure data
2. Completes the `closure` workflow step
3. Based on `closure_status`:
   - **Order Passed**: Creates stage transition to next stage (existing `stage_transitions` insert triggers `create_stage_instance_on_transition`)
   - **Fully Dropped / Withdrawn / Settled**: Updates `stage_instances.status` to 'Completed', updates `cases.status` to 'Closed'
   - **Remanded**: Creates stage transition with `transition_type = 'Remand'` back to an earlier stage
4. Shows success toast, refreshes workflow

## Step 7: Update Props Flow

`StageClosurePanel` receives new props:
- `onSaveClosure: (data) => void` -- for Save Closure button
- `onCloseStage: (data) => void` -- for Close Stage button  
- `closureWarnings: string[]` -- replaces `blockingReasons`
- `caseId: string` -- for loading existing draft
- Remove `canClose` prop (always enabled now)

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| New migration SQL | Create | `stage_closure_details` table + RLS |
| `src/types/stageClosureDetails.ts` | Create | Closure record types and form interfaces |
| `src/types/stageWorkflow.ts` | Edit | Add `closureWarnings` to `StageWorkflowState`, update `ClosureOutcome` to include "Fully Dropped" |
| `src/services/stageClosureDetailsService.ts` | Create | CRUD for closure details |
| `src/services/stageWorkflowService.ts` | Edit | Decouple `checkCanClose` to return warnings instead of blockers |
| `src/components/lifecycle/StageClosurePanel.tsx` | Rewrite | Full embedded closure form with demand breakdown |
| `src/components/cases/CaseLifecycleFlow.tsx` | Edit | Add `handleSaveClosure`, update `handleCloseStage` with lifecycle mapping |

## Zero-Regression Guarantee

- Existing `stage_instances`, `stage_workflow_steps`, `stage_notices`, `stage_replies` tables are untouched
- Existing `stage_transitions` trigger (`create_stage_instance_on_transition`) handles lifecycle progression automatically
- Existing timeline, hearings, and notices workflows are unaffected
- "Case Dropped" renamed to "Fully Dropped" in UI only; backward-compatible since closure status is stored in the new table
- Existing cases without closure data continue to work (form loads empty)

