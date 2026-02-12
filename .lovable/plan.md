

# Fix Stage-Scoped Data Isolation + Intelligence Report Accuracy

## Problem Summary
Data entered in one lifecycle stage (e.g., First Appeal) leaks into other stages (e.g., Tribunal) because several queries use case-level IDs instead of stage_instance_id filtering. Additionally, the Stage Closure panel doesn't reset when switching between stages, showing stale data from a previous stage.

## Root Causes Identified

### Bug 1: Reply count is case-wide, not stage-scoped
`stageWorkflowService.ts` calls `getRepliesCountByCase(caseId)` which counts ALL replies across the entire case. It should count only replies linked to notices of the current stage instance.

### Bug 2: Hearings fallback shows cross-stage data
`stageWorkflowService.getHearingsCount()` falls back to `case_id` with `stage_instance_id IS NULL` when no stage-linked hearings exist. This incorrectly shows unlinked hearings from any stage.

### Bug 3: Stage Closure panel doesn't reset on stage switch
`StageClosurePanel.tsx` uses a `loaded` boolean that is never reset when `stageInstanceId` changes. Once loaded for one stage, it keeps showing that stage's closure data even when viewing a different stage.

### Bug 4: Intelligence report notice mapping uses wrong column names
The intelligence service maps `n.notice_no` and `n.stage_key`, but the database columns are `notice_number` and `stage_instance_id` (no `stage_key` on notices).

### Bug 5: `useStageWorkflow` doesn't clear replies on stage switch
The `noticeReplies` Map is never cleared when switching stages, so old replies persist.

## Solution: 6 File Changes

### 1. `src/services/stageWorkflowService.ts`

**Reply count fix (line ~283):** Replace `getRepliesCountByCase(caseId)` with a new stage-scoped method that counts replies only for notices belonging to the current `stageInstanceId`.

**Hearings count fix (lines 462-471):** Remove the fallback that queries by `case_id` with null `stage_instance_id`. Only count hearings explicitly linked to the current stage instance.

### 2. `src/services/stageRepliesService.ts`

Add a new method `getRepliesCountByStageInstance(stageInstanceId)` that:
- Fetches notice IDs from `stage_notices` where `stage_instance_id` matches
- Counts replies linked to those specific notices only

### 3. `src/components/lifecycle/StageClosurePanel.tsx`

**Reset on stage change (lines 77-104):** When `stageInstanceId` prop changes, reset the form to `INITIAL_CLOSURE_FORM` and set `loaded` back to `false` so the effect re-fetches the correct stage's closure data.

### 4. `src/hooks/useStageWorkflow.ts`

**Clear state on stage switch:** When `externalStageInstanceId` changes, clear `noticeReplies`, `workflowState`, and `activeStep` to prevent cross-stage data bleed. Also reset `resolveAttempted` ref when dependencies change.

### 5. `src/services/caseIntelligenceService.ts`

**Fix notice field mapping (line ~277):** Change `n.notice_no` to `n.notice_number`. For `stageKey`, join through `stage_instance_id` to get the stage from `stage_instances` table, or resolve it from the instances array already fetched.

**Add stage grouping to notices/replies:** Include `stageKey` on notices by looking up the stage_instance_id in the already-fetched instances array.

### 6. `src/components/intelligence/NoticesRepliesSummary.tsx`

**Group by stage:** Display notices and replies grouped by their parent stage (e.g., "First Appeal", "Tribunal") so the intelligence report clearly shows which data belongs to which stage.

## Additional Requirement: Back Stage Editability
The existing code already handles this correctly -- when `isViewingHistorical` is false (i.e., viewing the active/current stage), all panels are editable. When a stage is sent back (remanded), it becomes the active stage again and `isViewingHistorical` will be false, making it editable. No additional code change is needed for this.

## Files Modified

| File | Change |
|------|--------|
| `src/services/stageWorkflowService.ts` | Use stage-scoped reply count; remove hearings fallback |
| `src/services/stageRepliesService.ts` | Add `getRepliesCountByStageInstance()` method |
| `src/components/lifecycle/StageClosurePanel.tsx` | Reset form and `loaded` flag when `stageInstanceId` changes |
| `src/hooks/useStageWorkflow.ts` | Clear replies/state when stage instance changes; reset resolve ref |
| `src/services/caseIntelligenceService.ts` | Fix column name mapping; add stage linkage for notices |
| `src/components/intelligence/NoticesRepliesSummary.tsx` | Group notices/replies by stage in the report |

## Result
- Each stage shows only its own notices, replies, hearings, and closure data
- Switching between stage tiles reloads correct data without bleed
- Intelligence report accurately reflects stage-specific workflow content
- Back-staged (remanded) stages remain editable as the active stage

