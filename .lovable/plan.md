

# Fix: Hearing Type Persistence and Lifecycle Hearing Actions

## Issues Identified

### Issue 1: Hearing Type defaults to "General" in Hearings Module
In `HearingScheduler.tsx` (line 205), the hearing list maps `h.type` (a legacy field with values like 'Preliminary', 'Final') instead of `h.hearing_type` (the actual database field storing 'Personal Hearing', 'General', etc.). This means even though `hearing_type: 'Personal Hearing'` is correctly saved to the database, the Hearings module list view ignores it.

**Root cause**: `type: (h.type === 'Preliminary' ? 'Final' : h.type)` -- uses legacy `type` field, not `hearing_type`.

### Issue 2: "Add Outcome" button and side arrow not clickable in Lifecycle Hearings
In `CaseLifecycleFlow.tsx` (lines 940-947), the `StageHearingsPanel` component is rendered without `onViewHearing`, `onRecordOutcome`, or `onAdjournHearing` callback props. These are required by the panel's buttons but are passed as `undefined`, causing clicks to silently fail (calling `undefined(hearing)` throws an error).

---

## Fix 1: Map `hearing_type` in HearingScheduler

**File**: `src/components/cases/HearingScheduler.tsx` (line 205)

Change the hearing list mapping to use `hearing_type` from the database instead of the legacy `type` field:

```typescript
// Before
type: (h.type === 'Preliminary' ? 'Final' : h.type) as 'Adjourned' | 'Final' | 'Argued' || 'Final',

// After  
type: (h as any).hearing_type || h.type || 'General',
```

This ensures "Personal Hearing" and other hearing types display correctly in the Hearings module list.

## Fix 2: Wire up Hearing Action Callbacks in CaseLifecycleFlow

**File**: `src/components/cases/CaseLifecycleFlow.tsx` (lines 940-947)

Add state and handlers for viewing hearings and recording outcomes:

1. Add a state variable to track the hearing being viewed/edited:
   ```typescript
   const [viewingHearing, setViewingHearing] = useState<Hearing | null>(null);
   const [hearingModalMode, setHearingModalMode] = useState<'create' | 'edit' | 'view'>('create');
   ```

2. Pass the missing callback props to `StageHearingsPanel`:
   ```typescript
   <StageHearingsPanel
     hearings={stageHearings}
     stageInstanceId={effectiveStageInstanceId}
     caseId={selectedCase.id}
     onScheduleHearing={...}
     onViewHearing={(hearing) => {
       setViewingHearing(hearing);
       setHearingModalMode('view');
       setShowHearingModal(true);
     }}
     onRecordOutcome={(hearing) => {
       setViewingHearing(hearing);
       setHearingModalMode('edit');
       setShowHearingModal(true);
     }}
     onAdjournHearing={(hearing) => {
       setViewingHearing(hearing);
       setHearingModalMode('edit');
       setShowHearingModal(true);
     }}
     isReadOnly={isViewingHistorical}
   />
   ```

3. Update the `HearingModal` usage to support both create and view/edit modes:
   ```typescript
   <HearingModal
     isOpen={showHearingModal}
     onClose={() => {
       setShowHearingModal(false);
       setViewingHearing(null);
       setHearingModalMode('create');
       refreshWorkflow();
     }}
     mode={hearingModalMode}
     hearing={viewingHearing}
     contextCaseId={selectedCase?.id}
     stageInstanceId={stageInstanceId}
     defaultHearingType={defaultHearingType}
   />
   ```

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/cases/HearingScheduler.tsx` | Map `hearing_type` instead of legacy `type` in list view |
| `src/components/cases/CaseLifecycleFlow.tsx` | Add `viewingHearing` state, wire `onViewHearing`, `onRecordOutcome`, `onAdjournHearing` callbacks, update HearingModal to support view/edit modes |

## What This Does NOT Change

- Hearing creation flow (unchanged)
- PH details persistence (already working correctly)
- Database schema (no migration needed)
- Other modules (HearingCalendar, Dashboard, etc.)
