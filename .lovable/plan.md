

# Fix Hearing Edit Not Persisting -- hearing_type and Field Mapping Gaps

## Problem

When editing a hearing (changing type, date, time, etc.), the changes appear to save but revert on reload. Two bugs cause this:

## Root Causes

### Bug 1: HearingModal sends OLD hearing_type (not the user's selection)

In the edit submission (HearingModal.tsx line 490), `hearing_type` is set to `hearingData.hearing_type` -- the original value from when the modal opened. The user's selection via the Hearing Type dropdown (stored in the `hearingType` state variable) is never included in the update payload.

### Bug 2: hearingsService ignores hearing_type in DB update

In `hearingsService.updateHearing()` (lines 370-400), the field mapping that builds `updateData` for the database write does not include `hearing_type`. So even if the modal sent the correct value, it would never reach the database.

## Fix

### 1. HearingModal.tsx -- Use current hearingType state in edit payload

Line 490: Change `hearing_type: hearingData.hearing_type` to `hearing_type: hearingType` so the user's dropdown selection is sent to the service.

### 2. hearingsService.ts -- Add hearing_type to updateData mapping

Add a line after the existing field mappings (around line 399):
```
if (updates.hearing_type !== undefined) updateData.hearing_type = updates.hearing_type;
```

This ensures `hearing_type` is included in the database PATCH request.

## Files Modified

| File | Change |
|------|--------|
| `src/components/modals/HearingModal.tsx` | Line 490: use `hearingType` state instead of `hearingData.hearing_type` |
| `src/services/hearingsService.ts` | Add `hearing_type` to the `updateData` field mapping block |

## Why This Fixes It

- The modal will now send the user's actual selection for hearing type
- The service will now persist `hearing_type` to the database
- The post-update fetch (`storage.getById`) on line 406 will return the correct data
- The dispatched `fullHearing` object will reflect all updated fields
- No double-write issue since `usePersistentDispatch` already skips `UPDATE_HEARING`

