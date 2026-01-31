
# Fix Staff Role "Edit Task" Permission Issue

## ✅ COMPLETED

## Problem Statement (RESOLVED)

Mahesh with **Staff** role can see and click the "Edit Task" button, even though Staff role in the Access & Roles settings has:
- ✅ **Create** permission for tasks
- ❌ **Edit** permission for tasks (NOT granted)

### Root Cause Analysis

1. **Database correctly stores separate permissions**:
   - `tasks.create` - Staff has this ✓
   - `tasks.update` - Staff does NOT have this

2. **UI incorrectly conflates create and edit**:
   - All components check `hasPermission('tasks', 'write')` for both create AND edit buttons
   - The `supabasePermissionsResolver.mapActionToDatabaseActions('write')` returns `['create', 'update']`
   - If **either** permission exists, the check returns true
   - Since Staff has `tasks.create`, the `'write'` check passes, allowing edit button visibility

3. **Screenshot evidence confirms**:
   - Access & Roles shows Task Management: Create ✓, View ✓, Edit ✗, Delete ✗
   - But Staff user sees "Edit Task" button on task detail page

---

## Solution: Granular Permission Actions

### Approach
Add `'create'` and `'update'` as separate permission action types, allowing UI components to check them independently.

---

## Technical Changes

### File 1: `src/services/supabasePermissionsResolver.ts`

**Change**: Add 'create' and 'update' to the PermissionAction type and mapper

**Lines 14, 268-285**

```typescript
// Line 14 - Update type definition
export type PermissionAction = 'read' | 'write' | 'delete' | 'admin' | 'manage' | 'create' | 'update';

// Lines 268-285 - Update the mapper function
private mapActionToDatabaseActions(action: PermissionAction): string[] {
  switch (action) {
    case 'read':
      return ['read'];
    case 'create':           // NEW: Granular create check
      return ['create'];
    case 'update':           // NEW: Granular update check  
      return ['update'];
    case 'write':
      // write = create OR update (backward compatibility)
      return ['create', 'update'];
    case 'delete':
      return ['delete'];
    case 'admin':
      return ['manage', 'admin'];
    case 'manage':
      return ['manage'];
    default:
      return [action];
  }
}
```

### File 2: `src/hooks/useAdvancedRBAC.tsx`

**Change**: Add 'create' and 'update' to Permission action type

**Line 18**

```typescript
export interface Permission {
  module: string;
  action: 'read' | 'write' | 'delete' | 'admin' | 'manage' | 'create' | 'update';
}
```

### File 3: `src/components/tasks/TaskConversation.tsx`

**Change**: Use granular permission checks

**Lines 59-61**

```typescript
// RBAC permission checks - granular actions
const canDeleteTasks = hasPermission('tasks', 'delete');
const canCreateTasks = hasPermission('tasks', 'create');  // NEW
const canEditTasks = hasPermission('tasks', 'update');    // CHANGED from 'write'
```

### File 4: `src/components/tasks/TaskBoard.tsx`

**Change**: Use granular permission checks

**Lines 72-75**

```typescript
// RBAC permission flags - granular actions
const canCreateTasks = hasPermission('tasks', 'create');  // NEW
const canEditTasks = hasPermission('tasks', 'update');    // CHANGED from 'write'
const canDeleteTasks = hasPermission('tasks', 'delete');
```

**Note**: Need to update status change check to use 'update' permission as well (line 146)

### File 5: `src/components/tasks/TaskList.tsx`

**Change**: Use granular permission checks

**Lines 100-102**

```typescript
// RBAC permission checks - granular actions
const canDeleteTasks = hasPermission('tasks', 'delete');
const canCreateTasks = hasPermission('tasks', 'create');  // NEW
const canEditTasks = hasPermission('tasks', 'update');    // CHANGED from 'write'
```

### File 6: `src/components/cases/CaseTasksTab.tsx`

**Change**: Use granular permission checks for add vs edit

**Lines 178-213**

```typescript
// Navigate to create task with case context
const handleAddTask = () => {
  if (!hasPermission('tasks', 'create')) {  // CHANGED from 'write'
    toast({
      title: 'Permission Denied',
      description: "You don't have permission to create tasks.",
      variant: 'destructive',
    });
    return;
  }
  // ... rest unchanged
};

// Navigate to edit task
const handleEditTask = (taskId: string) => {
  if (!hasPermission('tasks', 'update')) {  // CHANGED from 'write'
    toast({
      title: 'Permission Denied',
      description: "You don't have permission to edit tasks.",
      variant: 'destructive',
    });
    return;
  }
  // ... rest unchanged
};
```

### File 7: `src/components/tasks/TaskManagement.tsx`

**Change**: Separate create permission check

**Lines 114-115**

```typescript
// RBAC permission checks - base module
const canDeleteTasks = hasPermission('tasks', 'delete');
const canCreateTasks = hasPermission('tasks', 'create');  // CHANGED from 'write'
const canEditTasks = hasPermission('tasks', 'update');    // NEW: for edit buttons
```

### File 8: `src/pages/CreateTask.tsx`

**Change**: Use specific create permission

**Line 63**

```typescript
// Check if user has permission to create tasks
const canCreateTasks = hasPermission('tasks', 'create');  // CHANGED from 'write'
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabasePermissionsResolver.ts` | Add 'create'/'update' to PermissionAction type and mapper |
| `useAdvancedRBAC.tsx` | Add 'create'/'update' to Permission interface |
| `TaskConversation.tsx` | Use 'update' for edit button check |
| `TaskBoard.tsx` | Use 'create'/'update' granularly |
| `TaskList.tsx` | Use 'create'/'update' granularly |
| `CaseTasksTab.tsx` | Use 'create' for add, 'update' for edit |
| `TaskManagement.tsx` | Add canEditTasks with 'update' check |
| `CreateTask.tsx` | Use 'create' for create permission |

---

## Expected Result After Fix

| User Role | tasks.create | tasks.update | Can Create | Can Edit |
|-----------|--------------|--------------|------------|----------|
| Staff     | ✓            | ✗            | ✓          | ✗        |
| Manager   | ✓            | ✓            | ✓          | ✓        |
| Admin     | ✓            | ✓            | ✓          | ✓        |

**Mahesh (Staff)** will:
- ✅ See "Create Task" buttons
- ✅ Be able to create new tasks
- ❌ NOT see "Edit Task" button (currently visible - BUG)
- ❌ NOT be able to edit existing tasks

---

## Testing Checklist

1. **Staff Role (Mahesh)**:
   - Can see and use "Create Task" button ✓
   - Cannot see "Edit Task" button on task detail page
   - Cannot edit tasks from task board dropdown
   - Cannot change task status via drag-drop (if that requires edit)

2. **Manager Role**:
   - Can see and use both "Create Task" and "Edit Task" buttons
   - Can edit tasks from all locations

3. **Admin Role**:
   - Full access to all task operations

4. **Backward Compatibility**:
   - Components still using `'write'` continue to work (OR check)
   - No breaking changes for other modules

---

## Additional Check: Missing Role Permissions

Based on database query, these task permissions exist:

| Permission Key | Purpose |
|----------------|---------|
| tasks.create | Create new tasks |
| tasks.read | View tasks |
| tasks.update | Edit existing tasks |
| tasks.delete | Delete tasks |
| tasks.templates.* | Template management |
| tasks.automation.* | Automation rules |
| tasks.escalation.* | Escalation matrix |
| tasks.ai.* | AI assistant |

All necessary permissions are already defined in the database. No new permissions need to be added.
