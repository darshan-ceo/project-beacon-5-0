

# Fix: Judge Address Goes Blank When City Selected

## Problem Summary

When a Judge record with a city selected is opened for editing, the address fields go blank immediately after loading. Console logs confirm:
```
📍 [AddressForm] Value received: {"cityId":"HR002","cityName":"Faridabad",...}  
📍 [AddressForm] Value received: {"cityId":"","cityName":"",...}  ← Immediately reset!
```

---

## Root Cause Analysis

The bug is a **race condition during form hydration**. Here's the sequence:

1. **JudgeForm initial render**: `formData.address = undefined`
2. **UnifiedAddressForm** receives `value={formData.address || {}}` → passes `{}`
3. **useMemo in UnifiedAddressForm** normalizes `{}` → returns `EMPTY_ADDRESS`
4. **AddressForm** renders with empty normalized value
5. **useEffect** runs `populateFormFromJudge()` → sets correct address data
6. **Race condition**: AddressForm's internal state initialization with empty data races with the correct data

The issue is that `formData.address || {}` passes an empty object on the FIRST render before hydration completes, and this empty object triggers normalization that produces blank values.

---

## Solution

### Fix 1: Defer Address Form Rendering Until Hydration Complete

Add a hydration guard to ensure the UnifiedAddressForm only renders AFTER `populateFormFromJudge` has completed.

**File:** `src/components/masters/judges/JudgeForm.tsx`

Add a `formReady` state that becomes true after initial data is populated:

```typescript
// Add state to track if form is ready
const [formReady, setFormReady] = useState(!initialData); // Ready immediately if no initial data

useEffect(() => {
  loadSpecializations();
  if (initialData) {
    populateFormFromJudge(initialData);
    setFormReady(true); // Mark as ready after population
  }
}, [initialData]);
```

Then in the Address section, conditionally render:

```typescript
<CardContent>
  {formReady ? (
    <UnifiedAddressForm
      value={formData.address || {}}
      onChange={(address: UnifiedAddress) => setFormData(prev => ({ ...prev, address: address as unknown as EnhancedAddressData }))}
      module="judge"
      mode={isReadOnly ? 'view' : 'edit'}
      required={false}
    />
  ) : (
    <div className="text-sm text-muted-foreground">Loading address...</div>
  )}
</CardContent>
```

### Fix 2: Initialize formData.address from initialData in useState

**Alternative/Complementary Fix** - Initialize the form state with initial data if available:

```typescript
const [formData, setFormData] = useState<JudgeFormData>(() => {
  if (initialData) {
    return {
      name: initialData.name || '',
      designation: initialData.designation || '',
      status: initialData.status || 'Active',
      courtId: initialData.courtId || '',
      // ... other fields
      address: (initialData as any).address,
      // ... rest
    };
  }
  return {
    name: '',
    designation: '',
    status: 'Active',
    // ... default empty state
  };
});
```

---

## Recommended Approach: Fix 1 (Hydration Guard)

The hydration guard pattern is cleaner because:
- Follows the established `modal-isolation-key-pattern` memory 
- Prevents any race conditions during async data loading
- Is more defensive and works even if initialData changes

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/masters/judges/JudgeForm.tsx` | Add `formReady` state and conditional rendering for address form |

---

## Validation Steps

1. Open an existing Judge record that has address with city selected
2. Verify address fields are populated correctly (not blank)
3. Verify city dropdown shows the correct city
4. Modify address and save
5. Reopen and verify changes persisted

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Brief loading flash | Minimal - hydration is fast |
| Breaking existing flow | None - only delays render, doesn't change data flow |
| Rollback difficulty | Simple - remove formReady state and conditional |

**Safety Level:** Fully Safe

