

# Fix: Notification Click Opens Specific Record

## Problem
When clicking a notification, users are redirected to generic module listing pages instead of the specific record. For example, clicking a hearing notification goes to `/hearings/calendar` instead of the specific hearing.

## Current vs Expected Navigation

| Entity Type | Current Navigation | Fixed Navigation |
|-------------|-------------------|-----------------|
| Task | `/tasks/{taskId}` (already correct) | No change needed |
| Case | `/cases` (generic listing) | `/cases?caseId={caseId}` (opens specific case) |
| Hearing | `/hearings/calendar` (generic calendar) | `/hearings/{hearingId}` (opens specific hearing) |
| Document | `/documents` (generic listing) | `/documents` with case context if available |

## What Changes

### Single file edit: `src/components/notifications/NotificationItem.tsx`

Update the `handleClick` switch statement (lines 28-33) to use the `related_entity_id` for all entity types:

```typescript
switch (notification.related_entity_type) {
  case 'hearing':
    navigate(`/hearings/${notification.related_entity_id}`);
    break;
  case 'case':
    navigate(`/cases?caseId=${notification.related_entity_id}`);
    break;
  case 'task':
    navigate(`/tasks/${notification.related_entity_id}`);
    break;
  case 'document':
    navigate('/documents');
    break;
}
```

### Why this works
- **Cases** already support `?caseId=` query param to auto-select a specific case (used throughout the app in 10+ places)
- **Hearings** have a `/hearings/{id}` route that opens the hearing drawer/detail view
- **Tasks** already navigate correctly to `/tasks/{id}`
- **Documents** stay as generic navigation since document notifications (portal uploads) don't have a direct document detail page

This is a minimal, single-file change that follows existing navigation patterns already used across the application.
