

# Fix: All Hearing Fields Not Persisting on Edit

## Problem

When editing a hearing, the "Agenda" and "Notes" fields (plus any other non-type fields) are not saved. Only `hearing_type` persists because it was explicitly fixed earlier.

## Root Cause

The edit payload in `HearingModal.tsx` (line 498) sends:
```
notes: formData.notes || undefined
```

But the database has only ONE text column: `notes`. There is NO `agenda` column in the `hearings` table. The UI has two separate fields -- "Agenda" (`formData.agenda`) and "Notes" (`formData.notes`) -- but only `formData.notes` is sent in the update. Since users primarily edit the "Agenda" field (which is displayed more prominently), their changes are discarded.

Additionally, the `fullHearing` object dispatched to Redux (line 436) does not include `agenda` as a mapped field from the DB, so even after a successful save, the UI state would not reflect the `agenda` value properly.

## Fix

### File: `src/components/modals/HearingModal.tsx` (line ~498)

Change the `notes` field in the updates object to combine both `agenda` and `notes`, matching the create path logic (line 384 already does `notes: formData.notes || formData.agenda`):

```
notes: formData.agenda || formData.notes || undefined,
```

This ensures the Agenda content (the primary user-edited field) is persisted to the `notes` database column.

### File: `src/services/hearingsService.ts` (line ~420)

Add `agenda` mapping to the `fullHearing` object so the Redux state includes the agenda value after update:

```
agenda: existingHearing?.notes,  // DB 'notes' column maps to UI 'agenda'
```

This ensures the UI form correctly repopulates the Agenda field when re-opening a hearing after edit.

## Files Modified

| File | Change |
|------|--------|
| `src/components/modals/HearingModal.tsx` | Line 498: send `formData.agenda` as `notes` in the edit payload |
| `src/services/hearingsService.ts` | Line ~420: add `agenda` mapping from DB `notes` column in the fullHearing dispatch object |

## Why This Fixes It

- The `hearings` table has only a `notes` column (no `agenda` column)
- The create path already maps `formData.agenda` to `notes` correctly
- The edit path was sending `formData.notes` (which is often empty) instead of `formData.agenda` (which the user actually edits)
- After the fix, user edits to Agenda and Notes both persist to the same DB column and are correctly reflected on reload
