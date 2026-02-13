
# Fix Hearing Edit Not Reflecting Updated Data

## Problem
When a hearing is edited and saved from the Lifecycle tab, the "Hearing Updated" toast appears, but the hearing card still shows old data. Reopening the hearing also shows the previous values.

## Root Cause
In `hearingsService.updateHearing()` (lines 405-422), after the DB update, a `fullHearing` object is built and dispatched via `UPDATE_HEARING`. This object is incomplete -- it is missing critical fields like `stage_instance_id`, `hearing_type`, `authority_name`, `forum_name`, and `caseId` (legacy alias). When this partial object replaces the hearing in `state.hearings`, the data appears stale or wrong.

Additionally, the HearingModal's edit submission (line 487-498) does not include `stage_instance_id` or `hearing_type` in the updates payload.

## Fix (2 file changes)

### 1. `src/services/hearingsService.ts` -- Preserve all fields in UPDATE_HEARING dispatch

Update the `fullHearing` construction (lines 407-422) to include all fields from `existingHearing`, properly mapped from their DB column names to the app-level field names. Key additions:
- `stage_instance_id` from `existingHearing`
- `hearing_type` from `existingHearing`
- `authority_name`, `forum_name` from `existingHearing`
- `caseId` (legacy alias) from `existingHearing?.case_id`
- All other fields currently in the hearing state

The approach: Start with a comprehensive mapping of `existingHearing` DB fields, then spread `updates` on top, ensuring no field is lost.

### 2. `src/components/modals/HearingModal.tsx` -- Include stage_instance_id and hearing_type in edit updates

Update the edit path (lines 487-498) to pass `stage_instance_id` and `hearing_type` from the existing `hearingData` so the service has complete data to work with.

## Why This Works
- The `stageHearings` memo filters by `stage_instance_id` and displays fields like date, time, status, and hearing type from `state.hearings`
- By ensuring `UPDATE_HEARING` dispatches a complete hearing object, the UI immediately reflects the updated values without needing a page refresh
- The `refreshWorkflow` call in the modal's `onClose` already re-fetches workflow data, but hearings come from `state.hearings`, so the dispatch must be accurate
