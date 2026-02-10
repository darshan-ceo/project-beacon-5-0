

# Fix: Stage Workflow Auto-Initialization and Lifecycle Sync

## Problem Summary

When cases are created (manually or via Notice Intake Wizard), no `stage_instances` row is inserted. The Stage Workflow depends on an active `stage_instance` to function. Currently, stage instances are **only** created when a `stage_transitions` record is inserted (via a database trigger), but no transition is created at case creation time.

Database evidence: 4 out of 5 recent cases have **zero** stage instances.

---

## Root Cause

```text
Case Created (casesService.create / Wizard)
    |
    v
Cases table updated with stage_code
    |
    X --- No stage_instances row created
    X --- No stage_workflow_steps rows created
    |
    v
Stage Workflow UI finds no stageInstanceId --> renders empty
```

The trigger `trg_create_stage_instance_on_transition` only fires on `INSERT INTO stage_transitions`. Since case creation never inserts a transition, no stage instance is bootstrapped.

---

## Solution: Database Trigger on Case Insert

Create a new database trigger that fires `AFTER INSERT ON cases` to automatically:
1. Insert the first `stage_instances` row (cycle 1, status Active)
2. This ensures every new case immediately has an active stage instance

Additionally, add a **one-time backfill** migration for existing cases that lack stage instances.

For the frontend, add a lightweight "ensure stage instance" check in the `useStageWorkflow` hook so that if a case somehow still lacks an instance, one is created on first access (belt-and-suspenders).

---

## Implementation Steps

### Step 1: Database Migration (Trigger + Backfill)

Create a migration with:

**A) Trigger function** `initialize_stage_instance_on_case_create()`
- Fires `AFTER INSERT ON cases`
- Reads `NEW.stage_code` (or defaults to `'Assessment'`)
- Inserts into `stage_instances` with `cycle_no = 1`, `status = 'Active'`
- Uses `NEW.tenant_id`, `NEW.id` as case_id, `NEW.stage_code` as stage_key

**B) Backfill query** for existing cases without stage instances:
```sql
INSERT INTO stage_instances (tenant_id, case_id, stage_key, cycle_no, started_at, status, created_by)
SELECT c.tenant_id, c.id, COALESCE(c.stage_code, 'Assessment'), 1, c.created_at, 'Active', c.owner_user_id
FROM cases c
WHERE NOT EXISTS (
  SELECT 1 FROM stage_instances si WHERE si.case_id = c.id
)
AND c.status != 'Completed';
```

### Step 2: Frontend - Ensure Stage Instance in useStageWorkflow

Modify `src/hooks/useStageWorkflow.ts`:
- When `stageInstanceId` is null but `caseId` is provided, query for an active stage instance
- If none exists, create one via a direct Supabase insert (fallback safety net)
- Pass the resolved `stageInstanceId` to the workflow service

### Step 3: Update Case Creation Flows to Pass stageInstanceId

Modify `src/services/casesService.ts` `create()` method:
- After creating the case, the DB trigger handles stage instance creation automatically
- No code change needed here since the trigger handles it

Modify `src/components/notices/NoticeIntakeWizardV2.tsx`:
- After `casesService.create()`, the stage instance exists via trigger
- The notice creation (`stageNoticesService.createNotice`) should query for the active stage instance and attach `stage_instance_id`

### Step 4: Lifecycle Sync on Stage Workflow Closure

Modify `src/services/stageWorkflowService.ts` `completeStep()`:
- When the `closure` step is completed, automatically create a `stage_transitions` record (Forward type)
- This triggers the existing `trg_create_stage_instance_on_transition` to close the current instance and open the next stage
- Also dispatch `UPDATE_CASE` to sync `currentStage` on the case record

---

## Technical Details

### New Database Trigger

```sql
CREATE OR REPLACE FUNCTION public.initialize_stage_instance_on_case_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.stage_instances (
    tenant_id, case_id, stage_key, cycle_no, 
    started_at, status, created_by
  ) VALUES (
    NEW.tenant_id, NEW.id, 
    COALESCE(NEW.stage_code, 'Assessment'), 
    1, now(), 'Active', 
    COALESCE(NEW.owner_user_id, NEW.created_by, auth.uid())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_initialize_stage_instance
AFTER INSERT ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.initialize_stage_instance_on_case_create();
```

### useStageWorkflow Enhancement

Add a `resolveStageInstanceId` function that:
1. Queries `stage_instances` for an active instance matching the caseId
2. If found, returns its id
3. If not found, inserts a new one and returns the id
4. This runs once on hook mount when `stageInstanceId` is null

### Files Changed

| File | Change |
|------|--------|
| New migration SQL | Trigger + backfill |
| `src/hooks/useStageWorkflow.ts` | Auto-resolve missing stageInstanceId |
| `src/services/stageWorkflowService.ts` | Closure step triggers lifecycle transition |
| `src/components/notices/NoticeIntakeWizardV2.tsx` | Attach stage_instance_id to notice |

### Acceptance Criteria Mapping

| Criteria | How Solved |
|----------|-----------|
| Manual case creation auto-initializes lifecycle | DB trigger on `cases` INSERT |
| Notice intake auto-initializes | Same DB trigger |
| Stage completion updates lifecycle | Closure step creates transition |
| No case without lifecycle-linked workflow | Backfill + trigger guarantee |
| No duplicate lifecycle logic | Single trigger, single source of truth |
| Backward compatibility | Backfill migration + hook fallback |

