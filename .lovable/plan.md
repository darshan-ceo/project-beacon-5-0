

# Fix Hearing Edit -- PH Details Not Saved on Update

## Problem

When editing a hearing, only the `hearing_type` and core hearing fields (date, time) are persisted. **All PH (Personal Hearing) detail fields** -- PH Notice Ref No, PH Notice Date, Mode of Hearing, Place of Hearing, Attended By, and Additional Submissions -- are **never saved during edit** because the save call for the `hearing_ph_details` table is completely missing from the edit code path.

## Root Cause

In `HearingModal.tsx`, the `handleSave` function has two branches:

- **Create path (line ~396)**: Calls `hearingPhDetailsService.save()` after creating the hearing -- this works correctly.
- **Edit path (line ~483)**: Calls `hearingsService.updateHearing()` for core fields, but **never calls `hearingPhDetailsService.save()`** for the PH details. The PH form data is simply discarded on edit.

This is why:
- Hearing Type saves (it is on the main `hearings` table, handled by the service)
- PH Notice Ref, Date, Mode, Place, Attended By, Submissions do NOT save (they live in `hearing_ph_details` table, which is never written to on edit)

## Fix

### File: `src/components/modals/HearingModal.tsx`

Add a `hearingPhDetailsService.save()` call in the **edit** branch (after line 502, right after `hearingsService.updateHearing()`), mirroring the same logic already used in the create branch:

```typescript
// Save PH details if Personal Hearing (edit mode)
if (hearingType === 'Personal Hearing' && hearingData.id) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user?.id)
      .single();
    if (profile?.tenant_id) {
      await hearingPhDetailsService.save({
        tenant_id: profile.tenant_id,
        hearing_id: hearingData.id,
        case_id: formData.caseId || hearingData.case_id,
        ph_notice_ref_no: phFormData.ph_notice_ref_no,
        ph_notice_date: phFormData.ph_notice_date,
        hearing_mode: phFormData.hearing_mode,
        place_of_hearing: phFormData.place_of_hearing || null,
        attended_by: phFormData.attended_by || null,
        additional_submissions: phFormData.additional_submissions.filter(
          s => s.description.trim()
        ),
      });
    }
  } catch (phError) {
    console.error('[HearingModal] Failed to update PH details:', phError);
  }
}
```

The `hearingPhDetailsService.save()` method already uses **upsert** with `onConflict: 'hearing_id'`, so it will correctly insert or update the PH details row.

## Files Modified

| File | Change |
|------|--------|
| `src/components/modals/HearingModal.tsx` | Add `hearingPhDetailsService.save()` call in the edit branch after updating the main hearing record |

## Why This Is the Complete Fix

- The `hearing_ph_details` table uses upsert on `hearing_id`, so this single call handles both first-time creation and subsequent updates
- The PH form state (`phFormData`) is already correctly populated from the existing record on modal open (line 170-179)
- The user's edits to PH fields are tracked in `phFormData` state throughout the modal session
- No service or backend changes needed -- just the missing call in the edit code path

