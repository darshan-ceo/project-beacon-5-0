
# Deep Investigation Results: Officer Designation & Address Fields Not Persisting

## Summary of Investigation

After extensive code analysis, I've traced the complete data flow for Legal Forum (Courts) and identified **3 critical root causes** why Officer Designation and Address fields appear to save but don't display correctly on subsequent views.

---

## Evidence: Database vs UI Comparison

**Database State (verified via SQL query):**
```
id: a6e94a58-54a8-47b3-aa7c-5020a4c81d0a
name: Test High Court
tax_jurisdiction: CGST
officer_designation: PRINCIPAL_COMMISSIONER
address: {"line1":"A1","line2":"A2","locality":"a3","cityId":"GJ006",...}
```

**UI State:** Shows "Select officer designation" and empty address fields despite database having correct data.

This confirms your observation: **data IS being saved to Supabase correctly, but UI fails to display it on reload**.

---

## Root Cause Analysis

### Root Cause 1: Realtime Sync Overwrites Complete Data with Partial Payload

**Location:** `src/hooks/useRealtimeSync.ts` (lines 628-646)

**Problem:** When courtsService.update() saves data successfully, Supabase fires a realtime UPDATE event. The realtime handler dispatches a **partial payload** that overwrites the full state:

```typescript
// Realtime handler (PROBLEMATIC)
rawDispatch({ 
  type: 'UPDATE_COURT', 
  payload: {
    id: courtData.id,
    name: courtData.name,
    // ... other fields mapped ...
    taxJurisdiction: courtData.tax_jurisdiction,
    officerDesignation: courtData.officer_designation,
    // MISSING: address is passed as raw string, not parsed
    address: courtData.address,  // Raw JSON string from DB
    // MISSING: activeCases, avgHearingTime, digitalFiling...
  } as any 
});
```

**Issue 1:** The `address` field comes from DB as a JSON string but isn't parsed. When spread over existing state, it replaces parsed address objects with raw strings.

**Issue 2:** Missing fields like `activeCases`, `workingDays`, etc. become `undefined` after spread merge.

---

### Root Cause 2: Service Layer Doesn't Skip Realtime-Triggered Dispatches

**Location:** `src/services/courtsService.ts` (lines 101-164) and `src/hooks/useRealtimeSync.ts`

**Problem Flow:**

```text
1. User clicks "Update Court"
2. courtsService.update() persists to Supabase
3. courtsService.update() dispatches UPDATE_COURT with FULL data
4. Supabase fires realtime UPDATE event
5. useRealtimeSync receives event
6. useRealtimeSync dispatches UPDATE_COURT with PARTIAL data
7. AppStateContext reducer merges {...existingCourt, ...partialPayload}
8. Fields not in partial payload become undefined
9. UI renders with missing officer designation and broken address
```

Per project memory `service-layer-persistence-and-sync-policy`:
> "Real-time sync handlers should ignore UPDATE events for entities that handle their own persistence to prevent partial payloads from overwriting complete UI state."

This policy isn't being followed for courts.

---

### Root Cause 3: Address Displayed as String Instead of Parsed Object

**Location:** `src/components/modals/CourtModal.tsx` (lines 158-182)

**Problem:** The modal's useEffect correctly parses JSON address strings when `courtData.address` is a string. However, if the realtime sync overwrites `courtData.address` with an unparsed JSON string, and the component doesn't remount, the parsed address state is lost.

The modal relies on `courtData` prop changes, but the prop is the same object reference (same court ID) with different content, which may not trigger re-hydration properly.

---

## Solution Plan

### Fix 1: Skip Court UPDATE Events in Realtime Sync

Since `courtsService` handles its own persistence and dispatches a complete payload, realtime sync should **not** dispatch UPDATE_COURT events.

**File:** `src/hooks/useRealtimeSync.ts`

**Change:** Add guard to skip UPDATE events for courts:

```typescript
} else if (payload.eventType === 'UPDATE' && payload.new) {
  // SKIP: courtsService handles UPDATE persistence and dispatches
  // complete payload. Realtime would overwrite with partial data.
  console.log('[Realtime] Courts UPDATE skipped - handled by courtsService');
}
```

---

### Fix 2: Parse Address in List Mapping (DataInitializer)

Ensure address is always parsed during initial data load so UI never receives raw JSON strings.

**File:** `src/components/data/DataInitializer.tsx` (already done per schema version 11)

**Verify:** The current parsing logic at lines 504-529 correctly handles this. No change needed here.

---

### Fix 3: Add Address Parsing Fallback in Realtime Sync (Defense in Depth)

If realtime sync ever processes courts, parse the address field before dispatch.

**File:** `src/hooks/useRealtimeSync.ts`

```typescript
// Parse address if it's a JSON string
let parsedAddress = courtData.address;
if (typeof courtData.address === 'string' && courtData.address.trim().startsWith('{')) {
  try {
    parsedAddress = JSON.parse(courtData.address);
  } catch {
    // Keep as string if parse fails
  }
}
```

---

### Fix 4: Ensure Modal Re-Hydrates on courtData Changes

Add proper key-based isolation to force remount when editing different courts.

**File:** `src/components/masters/CourtMasters.tsx`

```typescript
<CourtModal
  key={`${courtModal.court?.id || 'new'}-${courtModal.mode}`}
  isOpen={courtModal.isOpen}
  onClose={() => setCourtModal({ isOpen: false, mode: 'create', court: null })}
  court={courtModal.court}
  mode={courtModal.mode}
/>
```

This matches the documented pattern in `modal-isolation-key-pattern` memory.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useRealtimeSync.ts` | Skip UPDATE_COURT dispatch (lines 628-646) |
| `src/components/masters/CourtMasters.tsx` | Add key prop to CourtModal for isolation |

---

## Why Only These 2 Fields?

Other fields like `name`, `jurisdiction`, `city` work because:
1. They're simple strings that merge correctly
2. They're always present in realtime payload

Officer Designation and Address fail because:
1. **officerDesignation**: Gets overwritten by undefined when realtime payload merges
2. **address**: Stored as JSON string in DB, but UI expects parsed object. Realtime sends raw string which breaks AddressForm component

---

## Expected Results After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Save Legal Forum with Officer Designation | Shows in DB, disappears in UI after reload | Persists correctly |
| Save Legal Forum with Address | Shows in DB, address fields empty in UI | Address displays correctly |
| Edit Legal Forum | Fields may be stale from previous edit | Clean hydration via key isolation |

---

## Technical Details

### Data Flow After Fix

```text
1. User clicks "Update Court"
2. courtsService.update() persists to Supabase ✓
3. courtsService.update() dispatches UPDATE_COURT with FULL data ✓
4. Supabase fires realtime UPDATE event
5. useRealtimeSync receives event
6. useRealtimeSync SKIPS dispatch (courts handled by service) ✓ NEW
7. AppStateContext retains FULL data from step 3 ✓
8. UI renders correctly with all fields ✓
```

### Risk Assessment

- **Low risk**: Skipping realtime UPDATE for courts means multi-client sync won't auto-update. However, INSERT and DELETE events still work for new/removed courts.
- **Mitigation**: If multi-client editing is required later, implement a refresh button or periodic polling specifically for courts.
