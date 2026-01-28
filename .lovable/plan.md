
# Fix: Staff Role Cannot See Task Automation Tab Despite Having View Permission

## Problem Summary

When logging in as Staff, the Automation tab in Task Management is not visible even though the Staff role has "View Automation" permission assigned in Access & Roles. The RBAC configuration shows `tasks.automation.read` is assigned to Staff, but the code is not checking for `read` permission.

## Root Cause Analysis

### Database Configuration (Correct)
```
role: staff → permission_key: tasks.automation.read
```

### Code Check (Incorrect)
**File:** `src/components/tasks/TaskManagement.tsx` (line 120)
```typescript
const canAccessAutomation = hasPermission('tasks.automation', 'admin') || hasPermission('tasks.automation', 'manage');
```

The code only checks for `admin` or `manage` actions, but the Staff role has `read` action (View). The `read` permission is never checked, so the tab remains hidden.

### Permission Resolution Flow
1. `hasPermission('tasks.automation', 'admin')` → checks for `tasks.automation.manage` or `tasks.automation.admin`
2. `hasPermission('tasks.automation', 'manage')` → checks for `tasks.automation.manage`
3. Neither includes `tasks.automation.read` which Staff has

---

## Solution

### Fix the Permission Check in TaskManagement.tsx

Update the permission checks to include `read` action for viewing tabs:

**File:** `src/components/tasks/TaskManagement.tsx`  
**Lines:** 118-122

**Before:**
```typescript
// RBAC permission checks - sub-module tabs (granular access)
// Templates: Manager+ can access (read permission)
const canAccessTemplates = hasPermission('tasks.templates', 'read') || hasPermission('tasks', 'admin');
// Automation, Escalation, AI: Admin/Partner only (manage permission)
const canAccessAutomation = hasPermission('tasks.automation', 'admin') || hasPermission('tasks.automation', 'manage');
const canAccessEscalation = hasPermission('tasks.escalation', 'admin') || hasPermission('tasks.escalation', 'manage');
const canAccessAI = hasPermission('tasks.ai', 'admin') || hasPermission('tasks.ai', 'manage');
```

**After:**
```typescript
// RBAC permission checks - sub-module tabs (granular access)
// Templates: Manager+ can access (read permission)
const canAccessTemplates = hasPermission('tasks.templates', 'read') || hasPermission('tasks', 'admin');
// Automation, Escalation, AI: Check both view (read) and manage permissions
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

## Technical Details

### Permission Matrix Alignment

| UI Checkbox | Database Key | Code Check |
|-------------|--------------|------------|
| View | `tasks.automation.read` | `hasPermission(..., 'read')` |
| Manage | `tasks.automation.manage` | `hasPermission(..., 'manage')` or `hasPermission(..., 'admin')` |

The fix ensures the code respects both permission levels as configured in the Access & Roles UI.

### Optional: Read-Only Mode for View Permission

For future enhancement, users with only `read` permission could see the Automation tab in a read-only mode (view rules but not edit/create). This would require:
1. Adding a `canManageAutomation` check for edit/create buttons
2. Passing this as a prop to `TaskAutomation` component

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/tasks/TaskManagement.tsx` | Add `read` permission check for canAccessAutomation, canAccessEscalation, canAccessAI (lines 120-122) |

---

## Validation Steps

After fix:
1. Login as Admin → Assign Staff role the "View" permission for Task Automation in Access & Roles
2. Save changes
3. Login as Staff user
4. Navigate to Task Management
5. Verify Automation tab is now visible
6. Verify Automation tab contents are accessible

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Staff seeing sensitive automation rules | View permission is intentionally granted - this is expected behavior |
| Breaking existing admin access | Admin already has manage permission, no change needed |
| Future edit capability for view-only users | Edit buttons should also check for manage permission (minor follow-up) |

**Impact:** Low risk - this aligns code with configured RBAC permissions
