
# Fix: Judge Edit Form Data Retention and Display Issues

## Problem Summary

The user has reported four issues with the Judge Edit functionality:

1. **Missing field capture during edit**: Qualifications & Experience, Tenure Details, Contact Information, and Address Information are not being retained/persisted during updates
2. **Created by / Updated By shows "Unknown"**: The Record Information section always displays "Unknown" for user attribution
3. **Years of Service is fixed at 26 years**: The calculation appears stuck instead of dynamically computing
4. **Edit and View screens are the same**: There's no visual distinction between edit and view modes

---

## Root Cause Analysis

### Issue 1: Phase 1 Fields Not Persisted During Update

**Location**: `src/services/judgesService.ts` lines 168-190

The `update` method only handles the original judge fields and **completely omits** Phase 1 fields:
- `memberType`
- `authorityLevel`  
- `qualifications`
- `tenureDetails`
- `address`

These fields exist in the CREATE method (lines 113-122) but are missing from UPDATE.

**Evidence**: Database query shows all Phase 1 fields are null/empty even after edit attempts.

### Issue 2: Created By/Updated By Shows "Unknown"

**Problem 1**: Database column `updated_by` does not exist (only `created_by` exists)
**Problem 2**: `created_by` stores a UUID, but the form displays it directly without resolving the user name
**Problem 3**: The `list()` and `getById()` methods don't include `createdBy`, `updatedBy`, `createdAt`, `updatedAt` in the returned Judge object

**Location**: 
- `JudgeForm.tsx` lines 1062-1063: Display code expects `createdBy`/`updatedBy` as names
- `judgesService.ts` lines 284-306: `list()` doesn't map Phase 1 fields or audit fields
- `judgesService.ts` lines 323-345: `getById()` same issue

### Issue 3: Years of Service Fixed at 26 Years

**Root Cause**: The form's `calculateYearsOfService()` function is correct (lines 252-257), BUT when data is loaded during edit:
1. The `appointmentDate` in the database is `null` for existing records
2. When null, the calculation defaults to 0
3. The "26 years" comes from previously saved static `years_of_service` database column (not recalculated)

**Additionally**: The UPDATE method (line 159-165) only recalculates if `updates.appointmentDate` is truthy, but the data flow from JudgeForm passes Date objects that may not trigger this.

### Issue 4: Edit and View Screens Are Same

**Root Cause**: The `isReadOnly` flag is set correctly (`mode === 'view'`), BUT:
1. All form inputs respect `disabled={isReadOnly}` 
2. The footer correctly hides submit button for view mode
3. **The visual appearance is identical** - both modes use the same styling

**Missing differentiation**:
- No "read-only" visual indicator (e.g., grayed background, lock icon)
- Delete button appears in edit mode but not handled distinctly in view
- Form title says "Judge Details" for view but appearance is identical to edit

---

## Solution Plan

### Part 1: Fix Phase 1 Field Persistence During Update

**File**: `src/services/judgesService.ts`

Update the `update()` method to include all Phase 1 fields:

```typescript
// In update method (around line 168-190), add:
...(updates.memberType !== undefined && { member_type: updates.memberType }),
...(updates.authorityLevel !== undefined && { authority_level: updates.authorityLevel }),
...(updates.qualifications && { qualifications: JSON.stringify(updates.qualifications) }),
...(updates.tenureDetails && { 
  tenure_details: JSON.stringify({
    tenureStartDate: formatDateFieldSafe(updates.tenureDetails.tenureStartDate),
    tenureEndDate: formatDateFieldSafe(updates.tenureDetails.tenureEndDate),
    maxTenureYears: updates.tenureDetails.maxTenureYears,
    extensionGranted: updates.tenureDetails.extensionGranted,
    ageLimit: updates.tenureDetails.ageLimit
  })
}),
...(updates.address && { address: JSON.stringify(updates.address) }),
```

Also update `list()` and `getById()` methods to include Phase 1 fields in the returned object.

### Part 2: Add Database Column for updated_by and address

**Database Migration**: Add missing columns

```sql
ALTER TABLE public.judges 
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS address jsonb DEFAULT '{}';
```

### Part 3: Resolve Created By/Updated By to User Names

**File**: `src/services/judgesService.ts`

Update `list()` and `getById()` to JOIN with profiles table:

```typescript
// In list() - use Supabase select with join
const { data: judges } = await supabase
  .from('judges')
  .select(`
    *,
    created_by_profile:profiles!created_by(full_name),
    updated_by_profile:profiles!updated_by(full_name)
  `);

// Map to include resolved names
createdByName: j.created_by_profile?.full_name || 'Unknown',
updatedByName: j.updated_by_profile?.full_name || 'Unknown',
```

**File**: `src/components/masters/judges/JudgeForm.tsx`

Update display (lines 1062-1063) to use resolved names:

```typescript
<div>Created by: {initialData?.createdByName || 'Unknown'}</div>
<div>Updated by: {initialData?.updatedByName || 'Unknown'}</div>
```

### Part 4: Fix Years of Service Dynamic Calculation

**File**: `src/services/judgesService.ts`

1. In `update()`, always recalculate years of service from the database's `appointment_date`:

```typescript
// After fetching existingJudge
const appointmentDate = existingJudge?.appointment_date;
const yearsOfService = appointmentDate 
  ? Math.floor((Date.now() - new Date(appointmentDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  : 0;
```

2. In `list()` and `getById()`, calculate dynamically:

```typescript
yearsOfService: j.appointment_date 
  ? Math.floor((Date.now() - new Date(j.appointment_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  : 0,
```

### Part 5: Differentiate Edit vs View Mode Visually

**File**: `src/components/masters/judges/JudgeForm.tsx`

Add visual distinction for view mode:

1. Add a banner for view mode:
```tsx
{mode === 'view' && (
  <div className="bg-muted border rounded-md p-3 mb-4 flex items-center gap-2">
    <Eye className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm text-muted-foreground">
      Viewing judge details (read-only)
    </span>
  </div>
)}
```

2. Apply subtle styling to disabled fields:
```tsx
className={cn(
  "...",
  isReadOnly && "bg-muted/50 cursor-not-allowed"
)}
```

**File**: `src/components/modals/JudgeModal.tsx`

Update footer handling:
- For view mode, show only "Close" button
- Hide Delete button entirely in view mode

---

## Technical Details

### Data Flow After Fix

```
JudgeMasters (click edit)
    ↓
JudgeModal (mode='edit')
    ↓
JudgeForm.populateFormFromJudge (loads all fields including Phase 1)
    ↓
User makes changes
    ↓
JudgeForm.handleSubmit (validates & calls onSubmit)
    ↓
JudgeModal.handleFormSubmit (prepares payload)
    ↓
judgesService.update (NOW includes Phase 1 fields + updated_by)
    ↓
Database updated with all fields
    ↓
Re-fetch with profile JOINs for display names
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/services/judgesService.ts` | Add Phase 1 fields to update(), list(), getById(); Add profile JOINs; Fix years calculation |
| `src/components/masters/judges/JudgeForm.tsx` | Add view mode banner; Update record info display |
| `src/components/modals/JudgeModal.tsx` | Prepare complete edit payload with Phase 1 fields |
| `src/contexts/AppStateContext.tsx` | Add createdByName, updatedByName to Judge interface |
| **Database Migration** | Add updated_by and address columns |

---

## Expected Results After Fix

| Issue | Before | After |
|-------|--------|-------|
| Qualifications not saved | Data lost on edit | All Phase 1 fields persist correctly |
| Created/Updated By "Unknown" | Shows "Unknown" | Shows actual user name (e.g., "Darshan Sanghavi") |
| Years of Service stuck | Fixed at 26 years | Dynamically calculated from appointment date |
| Edit/View identical | No visual difference | View mode has read-only banner, grayed fields, Close-only button |

---

## Validation Checklist

After implementation:
1. Create new judge with Phase 1 fields → All fields saved
2. Edit existing judge → All fields load correctly in form
3. Update Phase 1 fields → Changes persist to database
4. Check Record Information → Shows actual user names
5. Change appointment date → Years of Service recalculates
6. Open in View mode → Read-only banner visible, fields grayed, only Close button
7. Open in Edit mode → Normal editable fields, Submit + Delete buttons visible
