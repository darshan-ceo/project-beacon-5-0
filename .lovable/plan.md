

# Plan: Fix Notification System

## Problem Summary

The notification bell shows "No notifications - You're all caught up!" because:
1. **No notifications exist in the database** - the `notifications` table is empty
2. **Notifications are never being created** - key application events (task assignment, hearing creation, etc.) don't trigger notification creation
3. **RLS policy blocks cross-user notifications** - when User A creates a task for User B, User A cannot insert a notification for User B
4. **Missing automatic triggers** - no database triggers exist to create notifications on events

## Root Cause Analysis

### 1. Empty Notifications Table
The database query confirms zero rows in the notifications table. The system has no mechanism to populate it.

### 2. No Notification Creation on Key Events
Looking at `tasksService.create()`:
- Creates task in database ✓
- Logs to audit ✓
- **Does NOT create notification for assignee** ✗

Looking at `hearingsService.createHearing()`:
- Creates hearing in database ✓  
- Adds timeline entry ✓
- **Does NOT create notification for related users** ✗

### 3. RLS Policy Blocks Cross-User Inserts
Current INSERT policy: `auth.uid() = user_id`

When Manager creates task for Staff:
- Manager (auth.uid) ≠ Staff (user_id for notification)
- Insert BLOCKED by RLS

### 4. UserId Fallback Creates Mismatch
```typescript
// In AdminLayout.tsx line 60
const userId = user?.id || userProfile?.full_name || 'user';
```
If `user?.id` is undefined, it falls back to a name string, causing notification queries to fail silently.

---

## Implementation Plan

### 1. Fix RLS Policy for Notifications

Update the INSERT policy to allow users to create notifications for others within the same tenant:

```sql
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;

-- Create new policy allowing tenant-scoped inserts
CREATE POLICY "Users can insert notifications for same tenant" ON notifications
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );
```

This allows any authenticated user to create notifications for other users in their tenant.

### 2. Fix UserId in AdminLayout

Ensure we always pass a valid UUID to NotificationBell:

```typescript
// Before (buggy)
const userId = user?.id || userProfile?.full_name || 'user';

// After (fixed)
const userId = user?.id || '';

// And in the component - only render if userId is valid
{userId && <NotificationBell userId={userId} />}
```

### 3. Add Notification Creation to Task Assignment

Update `tasksService.create()` to send notification when task is assigned:

```typescript
// After successful task creation, notify assignee
if (persistedTask.assignedToId && persistedTask.assignedToId !== currentUserId) {
  await notificationSystemService.createNotification(
    'task_assigned',
    `New Task: ${persistedTask.title}`,
    `You have been assigned a new task for case ${persistedTask.caseNumber}. Due: ${persistedTask.dueDate}`,
    persistedTask.assignedToId,
    {
      relatedEntityType: 'task',
      relatedEntityId: persistedTask.id,
      channels: ['in_app'],
      metadata: { priority: persistedTask.priority, caseId: persistedTask.caseId }
    }
  );
}
```

### 4. Add Notification Creation to Hearing Scheduling

Update `hearingsService.createHearing()` to notify relevant users:

```typescript
// After hearing creation, notify case owner/assignee
const caseData = appState.cases.find(c => c.id === data.case_id);
if (caseData?.assignedToId) {
  await notificationSystemService.createNotification(
    'hearing_scheduled',
    `Hearing Scheduled: ${data.date}`,
    `A hearing has been scheduled for case ${caseData.caseNumber} on ${format(new Date(data.date), 'dd MMM yyyy')}`,
    caseData.assignedToId,
    {
      relatedEntityType: 'hearing',
      relatedEntityId: newHearing.id,
      channels: ['in_app'],
      metadata: { caseId: data.case_id, hearingDate: data.date }
    }
  );
}
```

### 5. Add Initial Notification Fetch in NotificationBell

Ensure notifications are loaded on mount:

```typescript
useEffect(() => {
  // Immediately fetch notifications on mount
  const loadInitial = async () => {
    if (userId) {
      const initial = await notificationSystemService.getNotifications(userId);
      setNotifications(initial);
      setUnreadCount(initial.filter(n => !n.read).length);
    }
  };
  loadInitial();
  
  // Then subscribe for updates...
}, [userId]);
```

---

## Files to Modify

| File | Change | Description |
|------|--------|-------------|
| Database Migration | Create | Update RLS policy for notifications to allow tenant-scoped inserts |
| `src/components/layout/AdminLayout.tsx` | Modify | Fix userId fallback and conditionally render NotificationBell |
| `src/services/tasksService.ts` | Modify | Add notification creation on task assignment |
| `src/services/hearingsService.ts` | Modify | Add notification creation on hearing scheduling |
| `src/components/notifications/NotificationBell.tsx` | Modify | Add immediate notification fetch on mount |
| `src/services/notificationSystemService.ts` | Modify | Add defensive check in createNotification for valid context |

---

## Testing Checklist

1. **RLS Policy**
   - Create a task as Manager for Staff
   - Verify notification appears in Staff's bell (not Manager's)
   
2. **Task Notification**
   - Assign task to another user
   - Switch to that user's account
   - Verify task notification appears with correct details

3. **Hearing Notification**
   - Schedule a hearing for a case
   - Verify case owner/assignee receives notification

4. **Bell Component**
   - Login as user with existing notifications
   - Verify count badge shows correct number
   - Click to open and see notification list

5. **Edge Cases**
   - Self-assignment (no notification needed)
   - Unassigned task (no notification)
   - Invalid userId handling

