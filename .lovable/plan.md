

# Fix: Hearing Date Validation Blocking Outcome Updates

## Problem Summary

When editing a scheduled hearing to record its outcome, users receive the error "Hearing date cannot be in the past" which prevents saving. This is a logical bug - when recording an outcome, the hearing date is naturally in the past (the hearing already happened).

**Screenshots confirm:**
- Hearing scheduled for January 7, 2026 (past date)
- User edits and changes outcome to "Closed"
- Validation error prevents save: "Hearing date cannot be in the past"

---

## Root Cause Analysis

### Current Validation Logic
**File:** `src/components/modals/HearingModal.tsx` (lines 221-232)

```typescript
// Phase 1: Validate past date using local midnight
const selectedLocalDate = new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate());
const todayLocalDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
if (selectedLocalDate < todayLocalDate) {
  toast({
    title: "Validation Error",
    description: "Hearing date cannot be in the past",
    variant: "destructive"
  });
  setIsSubmitting(false);
  return;
}
```

The validation runs unconditionally for BOTH create and edit modes, but:
- **Create mode:** Past date validation is correct - you shouldn't schedule a new hearing in the past
- **Edit mode:** Past date validation should be skipped when:
  - The hearing date hasn't been changed, OR
  - The user is recording an outcome (hearings naturally occur in the past before outcomes are recorded)

---

## Solution

### Fix 1: Skip Past Date Validation in Edit Mode When Date Unchanged

The validation should only apply when:
1. Creating a new hearing (mode === 'create'), OR
2. Editing a hearing AND changing the date to a different value

**File:** `src/components/modals/HearingModal.tsx`

**Before:**
```typescript
// Phase 1: Validate past date using local midnight
const selectedLocalDate = new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate());
const todayLocalDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
if (selectedLocalDate < todayLocalDate) {
  toast({
    title: "Validation Error",
    description: "Hearing date cannot be in the past",
    variant: "destructive"
  });
  setIsSubmitting(false);
  return;
}
```

**After:**
```typescript
// Phase 1: Validate past date using local midnight
// Only validate for new hearings OR when the date has been changed during edit
const selectedLocalDate = new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate());
const todayLocalDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

// Get the original hearing date for comparison
const originalHearingDate = hearingData ? new Date(hearingData.date) : null;
const originalLocalDate = originalHearingDate 
  ? new Date(originalHearingDate.getFullYear(), originalHearingDate.getMonth(), originalHearingDate.getDate())
  : null;

// Skip past date validation if:
// - We're in edit mode AND the date hasn't been changed
// Only block if: creating new hearing with past date OR changing existing date to a past date
const isDateChanged = !originalLocalDate || selectedLocalDate.getTime() !== originalLocalDate.getTime();

if (selectedLocalDate < todayLocalDate && (mode === 'create' || isDateChanged)) {
  toast({
    title: "Validation Error",
    description: "Hearing date cannot be in the past",
    variant: "destructive"
  });
  setIsSubmitting(false);
  return;
}
```

### Fix 2: Apply Same Logic to QuickEditHearing Component

**File:** `src/components/hearings/QuickEditHearing.tsx` (lines 39-51)

Same fix - skip past date validation if the date hasn't been changed from the original.

---

## Technical Details

### Validation Matrix

| Mode | Date Changed | Past Date | Action |
|------|--------------|-----------|--------|
| Create | N/A | Yes | ❌ Block with error |
| Create | N/A | No | ✅ Allow |
| Edit | No | Yes | ✅ Allow (recording outcome) |
| Edit | No | No | ✅ Allow |
| Edit | Yes | Yes | ❌ Block (can't reschedule to past) |
| Edit | Yes | No | ✅ Allow |

### Why This is the Correct Fix

1. **Business Logic:** Hearings happen in the past, then outcomes are recorded. This is the natural workflow.
2. **Rescheduling Protection:** Users still cannot reschedule a hearing TO a past date (only block when date is actively changed to a past value)
3. **Create Protection:** New hearings still cannot be scheduled in the past

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/modals/HearingModal.tsx` | Add date-changed check before past date validation (lines 221-232) |
| `src/components/hearings/QuickEditHearing.tsx` | Add date-changed check before past date validation (lines 39-51) |

---

## Validation Steps

After the fix:
1. Navigate to a case with a past scheduled hearing
2. Click "Edit Hearing"
3. Change the outcome to "Closed" or any other value
4. Add outcome notes
5. Click "Update Hearing"
6. **Verify:** Hearing saves successfully without validation error
7. **Verify:** Attempting to change the date to a past date still shows error

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Users accidentally keeping past dates | The original date is preserved, not changed |
| Rescheduling to past | Still blocked because date change is detected |
| Regression in create flow | Create mode explicitly checks `mode === 'create'` |

**Impact:** Low risk - this fix aligns the validation with the natural hearing lifecycle (schedule → attend → record outcome)

