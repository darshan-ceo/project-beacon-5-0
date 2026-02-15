

# Move Client Selector to Top of Create New Case Form

## What Changes

The "Select Client" dropdown will be moved from its current position in Section 4 (Assignment) to the very top of the Create New Case form, before the "Case Identification" card. This makes client selection the first action a user takes when creating a case.

The existing `SearchableClientSelector` component already provides:
- Searchable dropdown (by name, email, phone, GSTIN)
- "Add New Client" shortcut button

No new components are needed -- just repositioning and minor styling.

## Visual Layout

```text
Before:
  [Case Identification]    <-- Section 1
  [Case Details]           <-- Section 2
  [Dates & Deadlines]      <-- Section 3
  [Assignment]             <-- Section 4 (Client selector lives here)
  [Financial Details]      <-- Section 5

After:
  [Select Client Name *]   <-- Prominent top-level selector (standalone, not inside a card)
  [Case Identification]    <-- Section 1
  [Case Details]           <-- Section 2
  [Dates & Deadlines]      <-- Section 3
  [Assignment]             <-- Section 4 (only Assigned To remains)
  [Financial Details]      <-- Section 5
```

## Technical Plan

### File: `src/components/cases/CaseForm.tsx`

1. **Add client selector at the top of the form** (before the Case Identification card, around line 115):
   - Render the `ClientSelector` / `SearchableClientSelector` as a standalone field with a label "Select Client Name" and required marker
   - Include the existing "Add New Client" shortcut
   - If `contextClientId` is provided, show the `ContextBadge` instead (existing behavior preserved)

2. **Remove client selector from Section 4 (Assignment)** (around lines 354-379):
   - Remove the client selector block from the Assignment card
   - Keep only the "Assigned To" `EmployeeSelector` in that section

3. **No changes to logic or data flow** -- same `formData.clientId`, same `onValueChange`, same `onAddNewClient` callback. Only the render position changes.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/cases/CaseForm.tsx` | Move client selector from Assignment section to top of form |

No database changes. Pure UI repositioning.
