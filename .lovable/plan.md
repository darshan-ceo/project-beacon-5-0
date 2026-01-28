

# Fix: Staff Role Cannot See Task Automation/Escalation Tabs Despite Having View Permission

## Problem Summary

When logged in as Staff, the Automation and Escalation tabs in Task Management are not visible even though the Staff role has "View" permission assigned in Access & Roles. The screenshots confirm:
- Staff role has **View** checked for Task Automation (1/2)
- Staff role has **View** checked for Task Escalation (1/2)
- Staff user (Mahesh) only sees: Board, Templates, Analytics, Insights, Collaboration tabs

## Root Cause Analysis

### Database Configuration (Correct)
The "View" checkbox in Access & Roles saves these permissions to the database:
```
role: staff → permission_key: tasks.automation.read
role: staff → permission_key: tasks.escalation.read
```

### Code Check (Incorrect)
**File:** `src/components/tasks/TaskManagement.tsx` (lines 120-122)
```typescript
const canAccessAutomation = hasPermission('tasks.automation', 'admin') || hasPermission('tasks.automation', 'manage');
const canAccessEscalation = hasPermission('tasks.escalation', 'admin') || hasPermission('tasks.escalation', 'manage');
const canAccessAI = hasPermission('tasks.ai', 'admin') || hasPermission('tasks.ai', 'manage');
```

The code only checks for `admin` or `manage` actions. It **never checks for `read`** which is what the "View" checkbox assigns.

### Permission Mapping
| UI Checkbox | Database Permission Key | Code Check Required |
|-------------|------------------------|---------------------|
| View | `tasks.automation.read` | `hasPermission(..., 'read')` ← **MISSING** |
| Manage | `tasks.automation.manage` | `hasPermission(..., 'manage')` ✓ |

---

## Solution

### Update Permission Checks in TaskManagement.tsx

Add `read` permission checks for tab visibility:

**File:** `src/components/tasks/TaskManagement.tsx`  
**Lines:** 120-122

**Before:**
```typescript
const canAccessAutomation = hasPermission('tasks.automation', 'admin') || hasPermission('tasks.automation', 'manage');
const canAccessEscalation = hasPermission('tasks.escalation', 'admin') || hasPermission('tasks.escalation', 'manage');
const canAccessAI = hasPermission('tasks.ai', 'admin') || hasPermission('tasks.ai', 'manage');
```

**After:**
```typescript
const canAccessAutomation = hasPermission('tasks.automation', 'read') || 
                            hasPermission('tasks.automation', 'admin') || 
                            hasPermission('tasks.automation', 'manage');
const canAccessEscalation = hasPermission('tasks.escalation', 'read') || 
                            hasPermission('tasks.escalation', 'admin') || 
                            hasPermission('tasks.escalation', 'manage');
const canAccessAI = hasPermission('tasks.ai', 'read') || 
                    hasPermission('tasks.ai', 'admin') || 
                    hasPermission('tasks.ai', 'manage');
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/tasks/TaskManagement.tsx` | Add `read` permission check to `canAccessAutomation`, `canAccessEscalation`, and `canAccessAI` (lines 120-122) |

---

## Technical Details

The `hasPermission` function checks if the user has a specific permission key in their effective permissions. The permission key format is `module.action` where:
- Module: `tasks.automation`, `tasks.escalation`, `tasks.ai`
- Action: `read` (View), `manage` (Manage), `admin` (Full control)

By adding the `read` check first, users with View-only permission will see the tab. The order doesn't affect functionality since any match returns `true`.

### Read-Only vs. Manage Mode (Future Enhancement)

For future consideration, users with only `read` permission could see the content in a read-only mode (view rules but not create/edit). This would require:
1. Adding separate `canManageAutomation` checks for edit/create buttons
2. Passing this prop to child components

---

## Validation Steps

After implementing the fix:
1. Login as Admin
2. Go to Access & Roles → Edit Staff role permissions
3. Confirm "View" is checked for Task Automation and Task Escalation
4. Save changes if needed
5. Login as Staff user (e.g., Mahesh)
6. Navigate to Task Management
7. **Verify**: Automation tab is now visible
8. **Verify**: Escalation tab is now visible
9. **Verify**: Tab contents load correctly

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Staff seeing automation rules | View permission is intentionally granted by Admin - expected behavior |
| Breaking Admin/Manager access | They have `manage` permission which is still checked |
| Edit capability for view-only users | Edit buttons should separately check for `manage` permission (minor follow-up) |

**Impact:** Low risk - this aligns code behavior with configured RBAC permissions in the database

