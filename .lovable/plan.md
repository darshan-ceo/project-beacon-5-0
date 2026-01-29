

# Plan: Fix Two-Way Task Follow-Up Notifications

## Problem Identified

The current notification logic only works **one-way**:

| Scenario | Current Behavior | Expected Behavior |
|----------|------------------|-------------------|
| Admin → Mahesh (assignee) | Mahesh gets notified ✅ | ✅ Correct |
| Mahesh (assignee) → Admin | **No notification** ❌ | Admin should be notified |

### Root Cause

In `taskMessagesService.ts`, the `notifyTaskAssignee()` function:

```typescript
// Line 159-162
if (!task.assigned_to || task.assigned_to === senderId) {
  return;  // When Mahesh sends, this exits early because he IS the assignee
}
```

The function only considers notifying the **assignee** but ignores notifying the **task creator** (`assigned_by`).

## Solution: Notify All Relevant Parties

### Logic Change

Update notification to work bi-directionally:

```text
IF sender IS the assignee:
   → Notify the task creator (assigned_by)
   
IF sender is NOT the assignee:
   → Notify the assignee (assigned_to)
```

### Implementation

**File: `src/services/taskMessagesService.ts`**

Update the `notifyTaskAssignee` method to:

1. Fetch both `assigned_to` AND `assigned_by` from the task
2. Determine the correct recipient based on who sent the message
3. Send notification to the appropriate party

```typescript
private async notifyTaskAssignee(
  taskId: string, 
  senderId: string, 
  senderName: string, 
  messagePreview: string
): Promise<void> {
  try {
    // Fetch task to get assignee AND creator
    const { data: task, error } = await supabase
      .from('tasks')
      .select('assigned_to, assigned_by, title')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      console.error('Error fetching task for notification:', error);
      return;
    }

    // Determine notification recipient:
    // - If sender is the assignee → notify the creator (assigned_by)
    // - If sender is not the assignee → notify the assignee
    let recipientId: string | null = null;
    
    if (task.assigned_to === senderId) {
      // Sender is the assignee, notify the task creator
      recipientId = task.assigned_by;
    } else {
      // Sender is not the assignee, notify the assignee
      recipientId = task.assigned_to;
    }

    // Don't notify if no recipient or sender is the recipient
    if (!recipientId || recipientId === senderId) {
      return;
    }

    // Create notification for the recipient
    await notificationSystemService.createNotification(
      'task_assigned',
      `New follow-up on: ${task.title}`,
      `${senderName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
      recipientId,
      {
        relatedEntityType: 'task',
        relatedEntityId: taskId,
        channels: ['in_app'],
        metadata: {
          taskId,
          senderId,
          senderName
        }
      }
    );
  } catch (error) {
    console.error('Error notifying task participant:', error);
  }
}
```

## How It Works Now

```text
Task: "xxxxxxxxxxxxxxxx"
├── assigned_by: Admin (906a6cbc-...)  ← Task creator
└── assigned_to: Mahesh (dfb45acf-...) ← Task worker

SCENARIO 1: Admin sends follow-up
├── senderId = Admin
├── task.assigned_to = Mahesh ≠ Admin
├── recipientId = Mahesh (assignee)
└── ✅ Mahesh gets notified

SCENARIO 2: Mahesh sends follow-up  
├── senderId = Mahesh
├── task.assigned_to = Mahesh = senderId
├── recipientId = Admin (assigned_by)
└── ✅ Admin gets notified
```

## Files Modified

| File | Change |
|------|--------|
| `src/services/taskMessagesService.ts` | Update `notifyTaskAssignee()` to also notify task creator |

## Testing Checklist

1. Login as Admin, send follow-up on task assigned to Mahesh
2. Verify Mahesh's notification bell shows the message
3. Login as Mahesh (Staff), send follow-up reply
4. Verify Admin's notification bell shows the message
5. Verify self-messages don't create notifications (sender ≠ recipient)

