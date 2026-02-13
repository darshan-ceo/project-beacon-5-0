

# Fix: Notification Deep-Linking for All Module Types

## Problem
The `NotificationItem.tsx` navigation code was updated correctly, but the **destination pages** don't support the deep-link patterns being used:

- **Tasks**: Already works -- `/tasks/{id}` route exists and opens the task detail page.
- **Cases**: Already works -- `CaseManagement.tsx` reads `?caseId=` from URL and auto-selects the case.
- **Hearings**: BROKEN -- Navigating to `/hearings/{hearingId}` matches the wildcard route (`/hearings/*`) but `HearingsPage.tsx` never reads the hearing ID from the URL. It only reads `caseId`, `courtId`, and filter params.
- **Documents**: No specific document detail route exists (acceptable as-is).

## Root Cause
`HearingsPage.tsx` does not support a `hearingId` URL parameter. When the notification navigates to `/hearings/{uuid}`, the page loads but doesn't know which hearing to open.

## Fix

### 1. Update NotificationItem.tsx -- Use query param for hearings
Change the hearing navigation from a path-based approach to a query param approach (consistent with how cases work):

```
/hearings?hearingId={id}&view=list
```

### 2. Update HearingsPage.tsx -- Read hearingId from URL and auto-open
Add logic to read the `hearingId` search param and automatically open that hearing in view mode when the page loads. This follows the exact same pattern `CaseManagement.tsx` uses for `caseId`:

- Read `hearingId` from `searchParams`
- Find the matching hearing in `state.hearings`
- Call `handleViewHearing()` to open the hearing detail drawer

### Files to Modify

| File | Change |
|------|--------|
| `src/components/notifications/NotificationItem.tsx` | Change hearing navigation to use `?hearingId=` query param |
| `src/pages/HearingsPage.tsx` | Add `hearingId` param reading + auto-open hearing in a useEffect |

### Technical Detail

In `HearingsPage.tsx`, add a useEffect similar to CaseManagement's pattern:

```typescript
useEffect(() => {
  const hearingId = searchParams.get('hearingId');
  if (hearingId) {
    const hearing = filteredHearings.find(h => h.id === hearingId)
      || state.hearings.find(h => h.id === hearingId);
    if (hearing) {
      handleViewHearing(hearing);
      // Clean up URL param after opening
      searchParams.delete('hearingId');
      setSearchParams(searchParams, { replace: true });
    }
  }
}, [state.hearings]);
```

This is a minimal 2-file change that follows the existing query-param deep-link pattern used by Cases.
