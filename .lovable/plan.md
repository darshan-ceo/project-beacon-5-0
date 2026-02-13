

# Fix Task Creation Notifications + Enhanced Notification Management UI

## Issues Found

### Issue 1: Task Creation Does NOT Trigger Notifications
**Root Cause:** `CreateTask.tsx` (line 281) performs a direct Supabase insert to the `tasks` table and **never calls** `notificationSystemService.createNotification()`. The notification logic exists in `tasksService.createTask()` (line 138), but `CreateTask.tsx` bypasses it entirely.

**Fix:** After the successful task insert in `CreateTask.tsx`, add a call to `notificationSystemService.createNotification()` to notify the assignee -- mirroring the same logic that exists in `tasksService.ts`.

### Issue 2: Receiver-Side Notification Toast Shows on Sender's Screen
The current `createNotification` method (line 223 in `notificationSystemService.ts`) shows a toast saying "Notification sent to assignee" on the **sender's** screen. This is the popup you see when replying. However, the **receiver** doesn't see a toast -- they only see the bell icon update via realtime. This is working as designed but can be improved.

### Issue 3: No Dedicated Notification Management UI
Currently, notifications are only accessible via the bell icon popover -- a simple scrollable list. There are no tabs for Today/Past/Unread, no filtering, and no bulk management.

---

## Current Notification Types Supported

| Type | Triggered By | Working? |
|------|-------------|----------|
| `hearing_scheduled` | Hearing created/updated | Yes |
| `hearing_reminder` | Scheduled reminders | Yes |
| `hearing_updated` | Hearing changes | Yes |
| `hearing_outcome` | Hearing result recorded | Partial |
| `task_assigned` | Task creation + follow-ups | **Broken for creation** |
| `task_due` | Deadline approaching | Yes |
| `document_shared` | Portal document upload | Yes (just fixed) |
| `case_update` | Case changes | Not implemented |
| `system` | System messages | Available but unused |
| `statutory_deadline_*` | Deadline tracking | Yes |

## Proposed Additional Notification Types for GST Litigation CRM

| Notification Type | Trigger | Recipient |
|------------------|---------|-----------|
| `case_created` | New case registered | Assigned employee |
| `case_stage_changed` | Case moves to next stage | Case assignee + manager |
| `case_reassigned` | Case assigned to different person | New assignee |
| `hearing_outcome` | Hearing result recorded | Case assignee |
| `client_message` | Client sends message via portal | Case assignee |
| `task_overdue` | Task passes due date | Assignee + manager |
| `task_completed` | Task marked complete | Task creator |
| `document_uploaded` | Any document uploaded (admin side) | Case assignee |
| `bulk_import_complete` | Data import finishes | Initiating user |
| `escalation_triggered` | Task auto-escalated | Escalation target |

---

## Implementation Plan

### Step 1: Fix Task Creation Notification in CreateTask.tsx

Add notification call after task insert succeeds (around line 340 in `CreateTask.tsx`):

```typescript
// After dispatch and before navigate
if (formData.assignedTo && formData.assignedTo !== user.id) {
  try {
    await notificationSystemService.createNotification(
      'task_assigned',
      `New Task: ${formData.title}`,
      `You have been assigned a new task${effectiveCaseNumber ? ` for case ${effectiveCaseNumber}` : ''}. ${formData.dueDate ? `Due: ${format(formData.dueDate, 'dd MMM yyyy')}` : ''}`,
      formData.assignedTo,
      {
        relatedEntityType: 'task',
        relatedEntityId: taskData.id,
        channels: ['in_app'],
        metadata: { priority: formData.priority, caseId: effectiveCaseId, assignedBy: user.id }
      }
    );
  } catch (e) {
    console.warn('[CreateTask] Notification failed:', e);
  }
}
```

### Step 2: Add New Notification Types

Update `src/types/notification.ts` to include additional types:

- `case_created`
- `case_stage_changed`  
- `case_reassigned`
- `task_completed`
- `task_overdue`
- `client_message`

### Step 3: Enhanced Notification Management UI

Replace the simple popover list with a tabbed notification panel:

**New component: `NotificationPanel.tsx`**

Tabs:
- **Unread** -- Shows only unread notifications (default tab)
- **Today** -- All notifications from today
- **All** -- Complete notification history with date grouping
- **Settings** -- Link to notification preferences

Features:
- Date-grouped sections ("Today", "Yesterday", "This Week", "Older")
- Bulk actions: Mark selected as read, delete selected
- Filter by type (hearing, task, document, case)
- Notification sound option using Web Audio API (short chime on new notification)
- Empty states per tab

### Step 4: Notification Sound

Add optional notification sound in `NotificationBell.tsx`:
- Play a brief chime when `unreadCount` increases
- Use Web Audio API (no external sound files needed)
- Respect user preference (can be toggled off in notification settings)

### Step 5: Database Migration for New Notification Types

No schema changes needed -- the `type` column on `notifications` is a `text` field, so new types are supported automatically. The `NotificationType` TypeScript union just needs updating.

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/pages/CreateTask.tsx` | Add notification call after task creation |
| `src/types/notification.ts` | Add new notification types |
| `src/components/notifications/NotificationList.tsx` | Add tabs (Unread/Today/All), date grouping, filters, bulk actions |
| `src/components/notifications/NotificationBell.tsx` | Add notification sound on new unread |
| `src/components/notifications/NotificationList.tsx` | Update icon/color mappings for new types |

