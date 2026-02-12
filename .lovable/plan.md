
# Add View + Edit Buttons Across All Lifecycle Sections

## Problem
After saving data in any section (Notice, Reply, Hearings, Stage Closure), there is no way to edit that data. The Reply and Hearings panels lack Edit buttons entirely, and the global "Edit Stage" button in the historical banner is not sufficient for per-record editing. Users need consistent View + Edit functionality on every record, both before and after stage closure.

## Current State

| Section | View Button | Edit Button | Status |
|---------|------------|-------------|--------|
| Notice | Yes | Yes (but hidden when isReadOnly) | Partially working |
| Reply | No | No | Missing entirely |
| Hearings | Chevron (view) | No (only Outcome/Adjourn) | Missing Edit |
| Stage Closure | N/A (inline form) | No toggle | Missing Edit toggle |

## Solution

### 1. StageRepliesPanel.tsx -- Add Edit Button Per Reply

Add an `onEditReply` callback prop. For each reply card, add an "Edit" button (gated by `!isReadOnly`) that invokes this callback. The parent (`CaseLifecycleFlow`) will handle opening the correct editor:
- Pre-appeal stages: open FileReplyModal in edit mode
- Appeal stages: navigate to StructuredReplyPage with the reply ID

Also add a "View" button for read-only inspection of reply details.

### 2. StageHearingsPanel.tsx -- Add Edit Button Per Hearing

Add an explicit "Edit" button alongside the existing "View" chevron for each hearing record, gated by `!isReadOnly`. This will use the existing `onRecordOutcome` or a new `onEditHearing` callback to open the HearingModal in edit mode.

### 3. CaseLifecycleFlow.tsx -- Wire Up Edit Handlers

- Add `handleEditReply` callback that determines whether to use the FileReplyModal (pre-appeal) or navigate to StructuredReplyPage (appeal stages) with the reply data pre-loaded for editing.
- Pass `onEditReply` to StageRepliesPanel and StageNoticesPanel (for inline reply editing).
- Add `onEditHearing` handler that opens HearingModal in edit mode for a selected hearing.
- Pass `onEditHearing` to StageHearingsPanel.

### 4. StageClosurePanel.tsx -- Add View/Edit Toggle

When closure data has been previously saved (loaded from DB), default the panel to a read-only display with an "Edit" button. Clicking Edit switches the form to editable mode. This applies both for closed and active stages. The save/close buttons appear only in edit mode.

### 5. Ensure isReadOnly Logic Covers All Scenarios

The existing `isReadOnly={isViewingHistorical && !isEditingHistorical}` logic at the parent level is correct. The key missing pieces are the per-record Edit/View buttons inside the child panels, which this plan adds.

## Technical Details

### StageRepliesPanel.tsx Changes
```
interface StageRepliesPanelProps {
  // ... existing props
  onEditReply?: (reply: StageReply) => void;  // NEW
  onViewReply?: (reply: StageReply) => void;  // NEW
}
```
Add Edit and View buttons in each reply card's action area, mirroring the notice panel pattern.

### StageHearingsPanel.tsx Changes
```
interface StageHearingsPanelProps {
  // ... existing props
  onEditHearing?: (hearing: Hearing) => void;  // NEW
}
```
Add an "Edit" button next to the existing view chevron, gated by `!isReadOnly`.

### CaseLifecycleFlow.tsx Changes
- New `handleEditReply` callback: determines pre-appeal vs appeal, opens correct editor
- New `handleEditHearing` callback: sets viewingHearing + edit mode, opens HearingModal
- Pass these as props to the respective panels

### StageClosurePanel.tsx Changes
- Add internal `isEditMode` state, defaults to `false` when existing data is loaded
- When `isEditMode` is false: render form fields as static text with an "Edit" button
- When `isEditMode` is true: render editable form with Save/Close buttons (current behavior)
- For new closures (no existing data), default to edit mode

## Files Modified

| File | Change |
|------|--------|
| `src/components/lifecycle/StageRepliesPanel.tsx` | Add Edit + View buttons per reply |
| `src/components/lifecycle/StageHearingsPanel.tsx` | Add Edit button per hearing |
| `src/components/lifecycle/StageClosurePanel.tsx` | Add View/Edit mode toggle for saved closure data |
| `src/components/cases/CaseLifecycleFlow.tsx` | Wire handleEditReply, handleEditHearing; pass to panels |
