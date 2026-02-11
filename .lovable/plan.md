

# Fix: Hearing Type Not Persisting to Database

## Root Cause

The `SupabaseAdapter.normalizeForBackend()` method (line 1766) uses a **whitelist** of valid hearing columns. `hearing_type` is **missing from this whitelist**, so it gets silently deleted before every INSERT and UPDATE operation. This is why the database always shows `General` (the column default) despite the UI correctly setting `hearing_type: 'Personal Hearing'`.

Several other hearing columns are also missing from the whitelist, which would cause similar silent data loss:
- `hearing_type`
- `stage_instance_id`
- `hearing_outcome`
- `hearing_purpose`
- `outcome_text`
- `judge_ids`
- `is_demo`

## Fix

**File**: `src/data/adapters/SupabaseAdapter.ts` (line 1766)

Update the `validHearingFields` array to include all actual database columns:

```typescript
// Before
const validHearingFields = ['id', 'case_id', 'hearing_date', 'next_hearing_date', 
  'status', 'notes', 'outcome', 'forum_id', 'authority_id', 'court_id', 
  'court_name', 'judge_name', 'created_at', 'updated_at', 'tenant_id'];

// After
const validHearingFields = ['id', 'case_id', 'hearing_date', 'next_hearing_date', 
  'status', 'notes', 'outcome', 'outcome_text', 'forum_id', 'authority_id', 
  'court_id', 'court_name', 'judge_name', 'judge_ids', 'hearing_type', 
  'hearing_purpose', 'hearing_outcome', 'stage_instance_id', 
  'created_at', 'updated_at', 'tenant_id', 'is_demo'];
```

This single-line change will:
1. Allow `hearing_type: 'Personal Hearing'` to persist to the database on create and update
2. Ensure the Edit Hearing modal correctly loads and displays the hearing type
3. Ensure PH-specific fields (PH Notice, Mode, Place, Attended By, Submissions) display correctly in edit/view mode since they depend on `hearing_type === 'Personal Hearing'`
4. Fix several other silently-dropped fields (`stage_instance_id`, `outcome_text`, etc.)

## Verification

After this fix:
- Creating a hearing with type "Personal Hearing" from Lifecycle will persist `hearing_type = 'Personal Hearing'` in the database
- Opening the same hearing from the Hearings module will show "Personal Hearing" (not "General") and display all PH detail fields
- Existing hearings with PH details in the `hearing_ph_details` table will also display correctly since their parent hearing will now retain the correct type on future edits

## Impact

- No database migration needed
- No UI component changes needed
- Only one file modified: `src/data/adapters/SupabaseAdapter.ts`
