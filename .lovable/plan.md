

# Stage-Aware Personal Hearing as a Hearing Type

## Overview
Extend the existing Hearing entity with a `hearing_type` field and PH-specific detail fields. Personal Hearing (PH) is treated as a type of hearing, NOT a separate module. The existing "Schedule New Hearing" modal remains the single entry point -- it gains a "Hearing Type" dropdown that defaults based on the current lifecycle stage.

## Architecture Rule
- ONE Hearing entity, ONE `hearings` table, ONE `HearingModal`
- No separate `personal_hearings` table, no separate PH page or route
- PH-specific fields are stored in an additive extension table `hearing_ph_details` linked 1:1 via `hearing_id`

---

## Step 1: Database Migration -- `hearing_ph_details` Table

Additive extension table (does NOT modify the existing `hearings` table):

```text
hearing_ph_details
  id                      UUID PK DEFAULT gen_random_uuid()
  tenant_id               UUID NOT NULL
  hearing_id              UUID UNIQUE NOT NULL FK -> hearings(id) ON DELETE CASCADE
  case_id                 UUID NOT NULL FK -> cases(id)
  ph_notice_ref_no        TEXT NOT NULL
  ph_notice_date          DATE NOT NULL
  hearing_mode            TEXT DEFAULT 'Physical'   -- Physical / Virtual
  place_of_hearing        TEXT
  attended_by             TEXT
  additional_submissions  JSONB DEFAULT '[]'         -- [{description, doc_id}]
  created_at              TIMESTAMPTZ DEFAULT now()
  updated_at              TIMESTAMPTZ DEFAULT now()
```

Also add a `hearing_type` column to the existing `hearings` table:

```sql
ALTER TABLE hearings ADD COLUMN IF NOT EXISTS hearing_type VARCHAR DEFAULT 'General';
```

Valid values: `'Personal Hearing'`, `'Virtual Hearing'`, `'Final Hearing'`, `'Mention'`, `'General'`

RLS policies on `hearing_ph_details`: tenant-scoped read/write matching existing `hearings` policies.

## Step 2: Update Hearing Types

**`src/types/hearings.ts`** -- Add:

```typescript
export type HearingType = 'Personal Hearing' | 'Virtual Hearing' | 'Final Hearing' | 'Mention' | 'General';
```

Add `hearing_type` to the `Hearing` interface and `HearingFormData` interface.

**`src/types/hearingPhDetails.ts`** -- New file:

```typescript
export interface HearingPhDetails {
  id: string;
  tenant_id: string;
  hearing_id: string;
  case_id: string;
  ph_notice_ref_no: string;
  ph_notice_date: string;
  hearing_mode: 'Physical' | 'Virtual';
  place_of_hearing: string | null;
  attended_by: string | null;
  additional_submissions: { description: string; doc_id: string | null }[];
}
```

## Step 3: New Service -- `hearingPhDetailsService.ts`

Location: `src/services/hearingPhDetailsService.ts`

Methods:
- `getByHearingId(hearingId)` -- fetch PH details for a hearing
- `save(data)` -- upsert into `hearing_ph_details`
- `deleteByHearingId(hearingId)` -- remove PH details if type changes away from PH

## Step 4: Modify `HearingModal.tsx` -- Type-Driven Form

Changes to the existing hearing modal (no new modal or page):

1. **Add `hearing_type` to form state** -- New field defaulting based on stage context
2. **Add "Hearing Type" dropdown** in Section 2 (Schedule Information), before Date/Time:
   - Values: Personal Hearing, Virtual Hearing, Final Hearing, Mention, General
   - Default: `'Personal Hearing'` when stage = Assessment (index 0), `'General'` otherwise
3. **Conditionally show PH-specific section** (new Card) when `hearing_type === 'Personal Hearing'`:
   - PH Notice Reference Number (required)
   - PH Notice Date (required)
   - Mode of Hearing (Physical / Virtual)
   - Place of Hearing
   - Attended By
4. **Conditionally show Additional Submissions section** when `hearing_type === 'Personal Hearing'`:
   - Repeatable rows: description text + optional document upload
   - Reuses existing `HearingDocumentUpload` pattern
5. **On submit**: After `hearingsService.createHearing()`, if type is PH, also save to `hearing_ph_details` via the new service
6. **On edit/view**: Load PH details if `hearing_type === 'Personal Hearing'` and populate the fields

### Stage-Aware Default Logic

The `HearingModal` receives `stageInstanceId` already. We add a new prop `defaultHearingType` (optional). In `CaseLifecycleFlow.tsx`, when opening the modal:

```typescript
// Determine default hearing type based on stage
const stageIndex = lifecycleStages.findIndex(
  s => s.id === normalizeStage(selectedCase?.currentStage)
);
const defaultType = stageIndex === 0 ? 'Personal Hearing' : 'General';
```

Pass this as a prop. The user can still change the type -- it's a default, not a lock.

## Step 5: Modify `CaseLifecycleFlow.tsx`

Replace the four `() => setShowHearingModal(true)` calls (lines 756, 775, 795, 1038) with a handler that computes the default hearing type:

```typescript
const handleScheduleHearing = useCallback(() => {
  const stageIndex = lifecycleStages.findIndex(
    s => s.id === normalizeStage(selectedCase?.currentStage)
  );
  setDefaultHearingType(stageIndex === 0 ? 'Personal Hearing' : 'General');
  setShowHearingModal(true);
}, [selectedCase]);
```

Add `defaultHearingType` state and pass it to `HearingModal`.

## Step 6: Update `hearingsService.createHearing()`

Add `hearing_type` to the `hearingData` object sent to storage:

```typescript
const hearingData = {
  ...existingFields,
  hearing_type: data.hearing_type || 'General',
};
```

No other changes to the service -- timeline, automation, notifications all work as before since they operate on the single `hearings` entity.

## Step 7: Lifecycle Automation

No changes needed. The existing `hearingsService.createHearing()` already:
- Creates timeline entry ("Hearing Scheduled")
- Triggers task bundle automation
- Sends notifications
- Updates stage progress

All of this works identically regardless of hearing type.

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| New migration SQL | Create | `hearing_ph_details` table + `hearing_type` column on `hearings` |
| `src/types/hearings.ts` | Edit | Add `HearingType` type and `hearing_type` field |
| `src/types/hearingPhDetails.ts` | Create | PH details interface |
| `src/services/hearingPhDetailsService.ts` | Create | CRUD for PH detail fields |
| `src/services/hearingsService.ts` | Edit | Include `hearing_type` in create/update |
| `src/components/modals/HearingModal.tsx` | Edit | Add type dropdown + conditional PH fields |
| `src/components/cases/CaseLifecycleFlow.tsx` | Edit | Stage-aware default type when opening modal |

## Zero-Regression Guarantee

- Existing `hearings` table is not modified destructively -- only one additive column (`hearing_type` with default `'General'`)
- Existing `HearingModal` remains the single entry point -- enhanced, not replaced
- All existing hearings continue to work with `hearing_type = 'General'` (default)
- No new routes, no new pages, no separate PH workflow
- Dashboards, timelines, reports, calendar views are unaffected -- they read from the same `hearings` table
- Button label everywhere remains "Schedule Hearing" / "Add Hearing"

