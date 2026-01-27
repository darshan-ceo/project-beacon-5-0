
# Fix: Officer Designation Not Displaying on Edit

## Root Cause Identified

The Officer Designation dropdown fails to display the stored value due to a **Radix UI Select timing/options mismatch issue**:

1. Modal renders Select with `value={formData.officerDesignation || ''}` 
2. Select options come from `getOfficersByJurisdiction(formData.taxJurisdiction)`
3. When `formData.taxJurisdiction` is `undefined`, this returns `[]` (empty array)
4. Radix Select has **no options to match** against the stored value
5. Select displays placeholder instead of the actual value

**Why Address Works But Officer Designation Doesn't:**
- Address was switched to `SimpleAddressForm` with plain text inputs (no matching required)
- Officer Designation uses a dropdown that requires option-value matching

## Solution: Always Provide Fallback Options

Modify `getOfficersByJurisdiction()` to return ALL officers when jurisdiction is undefined, ensuring the stored value always has a matching option to display.

### File Changes

**1. `src/types/officer-designation.ts`** - Update helper function

```typescript
// Line 106-111: Change getOfficersByJurisdiction to return all officers as fallback
export const getOfficersByJurisdiction = (jurisdiction: TaxJurisdiction | undefined): OfficerOption[] => {
  if (jurisdiction === 'CGST') return CGST_OFFICERS;
  if (jurisdiction === 'SGST') return SGST_OFFICERS;
  // CHANGE: Return combined officers list when no jurisdiction selected
  // This ensures stored values can always be displayed
  return [...CGST_OFFICERS, ...SGST_OFFICERS.filter(o => 
    !CGST_OFFICERS.some(c => c.value === o.value)
  )];
};
```

This returns a deduplicated combined list when no jurisdiction is selected, ensuring:
- `COMMISSIONER` (which exists in both lists) will have a matching option
- All other designations from both lists are included
- The stored value will always have an option to match against

**2. `src/components/modals/CourtModal.tsx`** - Add loading guard (Optional enhancement)

As an additional safeguard, add a check to ensure form data is hydrated before rendering the select:

```typescript
// Around line 520-540: Add conditional rendering
{/* Only render officer select after jurisdiction is determined or show stored value */}
{(formData.taxJurisdiction || formData.officerDesignation) && (
  <Select
    value={formData.officerDesignation || ''}
    onValueChange={(value) => setFormData(prev => ({ 
      ...prev, 
      officerDesignation: value as OfficerDesignation || undefined
    }))}
    disabled={mode === 'view' || !formData.taxJurisdiction}
  >
    <SelectTrigger>
      <SelectValue placeholder={formData.taxJurisdiction ? "Select officer designation" : "Select tax jurisdiction first"} />
    </SelectTrigger>
    <SelectContent>
      {getOfficersByJurisdiction(formData.taxJurisdiction).map(option => (
        <SelectItem key={option.value} value={option.value}>
          <span className="font-medium">{option.label}</span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

## Technical Details

### Why This Fix Works

1. **Radix Select Requirement**: The `value` prop MUST have a corresponding `<SelectItem value={...}>` in the DOM for the selection to display
2. **Empty Options = No Match**: When `getOfficersByJurisdiction(undefined)` returned `[]`, there were no options to match against
3. **Fallback Options Solution**: By always providing a complete list of officers as options, the stored value (e.g., `COMMISSIONER`) will always find a match

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| User might select invalid officer for jurisdiction | Dropdown is still disabled when `!formData.taxJurisdiction` - user cannot interact until jurisdiction is set |
| Performance impact from larger options list | Negligible - only adds ~10 extra options when no jurisdiction selected |
| Duplicate options | Deduplication logic prevents same officer appearing twice |

## Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `src/types/officer-designation.ts` | Return combined officers list instead of empty when jurisdiction is undefined | Ensures stored values always display |
| `src/components/modals/CourtModal.tsx` | Optional: Add render guard for officer select | Extra safety for hydration timing |

## Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Open court with SGST + Commissioner | Shows "Select officer designation" placeholder | Shows "Commissioner" |
| Open court with no jurisdiction set | Shows placeholder, can't see stored value | Shows stored value (read-only until jurisdiction set) |
| Change jurisdiction in edit mode | Resets officer correctly | Same - resets correctly |
| Create new court | No change | No change |
