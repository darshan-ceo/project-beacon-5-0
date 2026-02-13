

# Fix: Client Change in Case Not Persisting

## Problem

When editing a case and changing the Client from the dropdown, the updated client is shown in the Case Wrapper (list view) but the old client remains on the Case Detail page. The change is not actually saved to the database.

## Root Cause

In `src/components/modals/CaseModal.tsx`, the **edit path** (line 344-380) builds the `updatedCase` object by spreading `...caseData` (which contains the **old** `clientId`) but **never overrides** `clientId` with `formData.clientId`.

Compare:
- **Create path** (line 297): explicitly sets `clientId: formData.clientId` -- correct
- **Edit path** (line 344): uses `...caseData` but omits `clientId: formData.clientId` -- the bug

The case wrapper may temporarily show the correct name from local state, but the database still holds the old `clientId`, so reloading or viewing details shows the original client.

## Fix

### File: `src/components/modals/CaseModal.tsx` (line 344-380)

Add `clientId: formData.clientId` to the `updatedCase` object in the edit path, alongside the other fields already being set from `formData`.

This is a one-line addition after line 352 (after `title: formData.title`):

```
clientId: formData.clientId,
```

## Technical Details

| File | Change |
|------|--------|
| `src/components/modals/CaseModal.tsx` | Add `clientId: formData.clientId` to the edit-mode `updatedCase` object (around line 352) |

## Why This Fixes It

- The `clientId` from the form's Client dropdown will be included in the update payload
- `casesService.update` dispatches this to Redux and persists via `usePersistentDispatch`
- The `SupabaseAdapter` already maps `clientId` to `client_id` for the database
- The Case Detail page, Case Wrapper, and Client Portal queries will all reflect the correct client

This is a simple missing field -- the same pattern as all other fields that are already correctly included in the edit payload.
