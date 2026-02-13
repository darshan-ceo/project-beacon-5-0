
# Fix Hearing Edit Persistence -- Eliminate Double-Write Bug

## Root Cause

Every `UPDATE_HEARING` dispatch triggers TWO database writes:

1. **hearingsService.ts (line 403)**: The service explicitly calls `storage.update('hearings', id, updateData)` with properly computed `hearing_date`. This write is CORRECT.

2. **usePersistentDispatch.tsx (line 310)**: The dispatch interceptor sees `UPDATE_HEARING` and calls `storage.update('hearings', action.payload.id, action.payload)` AGAIN with the `fullHearing` object. The `normalizeForBackend` function rebuilds `hearing_date` from `fullHearing.time` (which may hold the OLD time value) instead of the already-correct `hearing_date`. This second write OVERWRITES the correct data.

This is confirmed by the network logs showing two consecutive PATCH requests to the same hearing record.

## Fix

### Option chosen: Skip redundant DB write in usePersistentDispatch for UPDATE_HEARING

Since `hearingsService.updateHearing()` already persists to the database before dispatching, the persistent dispatch interceptor should NOT write again. This is the same pattern other service-layer entities should follow.

### File: `src/hooks/usePersistentDispatch.tsx`

At line 309-310, change:
```
case 'UPDATE_HEARING':
  await storage.update('hearings', action.payload.id, action.payload);
  break;
```
to:
```
case 'UPDATE_HEARING':
  // Skip: hearingsService.updateHearing() already persists to DB before dispatching.
  // A redundant write here causes normalizeForBackend to rebuild hearing_date
  // from stale fields, overwriting the correct value.
  break;
```

This is the minimal, safest fix. The service layer is the single source of truth for DB writes, and the persistent dispatch should not duplicate that work for hearings.

## Why This Works

- The service's `storage.update()` correctly maps `date` + `start_time` to `hearing_date` in UTC
- The service's `storage.getById()` then fetches the updated record to build the complete dispatch payload
- The reducer correctly merges the updated fields into `state.hearings`
- Removing the redundant write eliminates the race condition where stale field mappings overwrite correct data

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/usePersistentDispatch.tsx` | Remove redundant `storage.update` for `UPDATE_HEARING` case (service already handles persistence) |
