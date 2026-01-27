

# Fix: Task Sub-Module RBAC Enforcement for Action Buttons

## Problem Summary

Staff role has only "View" (`tasks.templates.read`) permission for Task Templates, but the UI shows Edit, Clone, Create Template, and Delete buttons. The same issue exists in Automation, Escalation, and AI Assistant sub-modules - tab access is controlled but individual action buttons are not permission-gated.

## Root Cause Analysis

| Component | Tab Access Control | Button Permission Control |
|-----------|-------------------|---------------------------|
| TaskManagement.tsx | Correctly checks `hasPermission('tasks.templates', 'read')` | N/A (parent) |
| TaskTemplates.tsx | N/A (child) | **MISSING** - No RBAC checks |
| TaskAutomation.tsx | N/A (child) | **MISSING** - No RBAC checks |
| EscalationMatrix.tsx | N/A (child) | **MISSING** - No RBAC checks |
| AITaskAssistant.tsx | N/A (child) | **MISSING** - No RBAC checks |

## Database Permissions (Reference)

Staff role permissions for task sub-modules:
- `tasks.templates.read` - Has this ONLY
- `tasks.templates.create` - Does NOT have
- `tasks.templates.update` - Does NOT have  
- `tasks.templates.delete` - Does NOT have
- `tasks.automation.*` - Does NOT have any
- `tasks.escalation.*` - Does NOT have any
- `tasks.ai.*` - Does NOT have any

## Solution

Add RBAC permission checks to each task sub-module component to conditionally render or disable action buttons.

---

## Files to Modify

### 1. TaskTemplates.tsx

Import RBAC hook and add permission checks:

```typescript
// Add imports
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

// Inside component
const { hasPermission } = useAdvancedRBAC();
const canCreateTemplate = hasPermission('tasks.templates', 'write');
const canEditTemplate = hasPermission('tasks.templates', 'write');
const canDeleteTemplate = hasPermission('tasks.templates', 'delete');
```

**Changes needed:**

1. **Create Template button** (header) - Conditionally render based on `canCreateTemplate`
2. **Edit button** (TemplateCard) - Conditionally render based on `canEditTemplate`
3. **Clone button** (TemplateCard) - Conditionally render based on `canCreateTemplate` (clone creates new)
4. **Delete button** (TemplateCard) - Conditionally render based on `canDeleteTemplate`

### 2. TaskAutomation.tsx

Import RBAC hook and add permission checks:

```typescript
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

const { hasPermission } = useAdvancedRBAC();
const canManageAutomation = hasPermission('tasks.automation', 'admin') || 
                            hasPermission('tasks.automation', 'manage');
```

**Changes needed:**

1. **Create Bundle button** - Conditionally render based on `canManageAutomation`
2. **Edit bundle button** - Conditionally render based on `canManageAutomation`
3. **Delete bundle button** - Conditionally render based on `canManageAutomation`

### 3. EscalationMatrix.tsx

Import RBAC hook and add permission checks:

```typescript
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

const { hasPermission } = useAdvancedRBAC();
const canManageEscalation = hasPermission('tasks.escalation', 'admin') || 
                            hasPermission('tasks.escalation', 'manage');
```

**Changes needed:**

1. **Configure Rules button** - Conditionally render based on `canManageEscalation`
2. **Create/Edit rule buttons** - Conditionally render based on `canManageEscalation`

### 4. AITaskAssistant.tsx

Import RBAC hook and add permission checks:

```typescript
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';

const { hasPermission } = useAdvancedRBAC();
const canManageAI = hasPermission('tasks.ai', 'admin') || 
                    hasPermission('tasks.ai', 'manage');
```

**Changes needed:**

1. **Configure API button** - Conditionally render based on `canManageAI`
2. **Settings tab** - Conditionally render based on `canManageAI`

---

## Permission Mapping

| UI Action | Database Permission Key | RBAC Action |
|-----------|------------------------|-------------|
| Create Template | `tasks.templates.create` | `write` |
| Edit Template | `tasks.templates.update` | `write` |
| Delete Template | `tasks.templates.delete` | `delete` |
| Clone Template | `tasks.templates.create` | `write` |
| Manage Automation | `tasks.automation.manage` | `admin`/`manage` |
| Manage Escalation | `tasks.escalation.manage` | `admin`/`manage` |
| Configure AI | `tasks.ai.manage` | `admin`/`manage` |

---

## Expected Behavior After Fix

| Role | Templates Tab | Create/Edit/Delete Buttons |
|------|--------------|---------------------------|
| Staff | Visible (read) | **Hidden** |
| Manager | Visible | Create/Edit visible |
| Admin/Partner | Visible | All buttons visible |

| Role | Automation Tab | Create/Edit/Delete |
|------|---------------|-------------------|
| Staff | Hidden | N/A |
| Manager | Hidden | N/A |
| Admin/Partner | Visible | All visible |

---

## Testing Checklist

After implementation:

1. **Staff user testing:**
   - Login as Staff
   - Navigate to Task Management > Templates tab
   - Verify: Can see templates (read only)
   - Verify: "Create Template" button is hidden
   - Verify: Edit, Clone, Delete buttons are hidden on cards
   - Verify: Automation, Escalation, AI tabs are not accessible

2. **Manager user testing:**
   - Login as Manager
   - Navigate to Templates tab
   - Verify: Create, Edit buttons visible
   - Verify: Automation/Escalation/AI tabs hidden (Manager doesn't have manage permission)

3. **Admin/Partner testing:**
   - All tabs visible
   - All action buttons visible

4. **Permission change testing:**
   - Assign `tasks.templates.create` to Staff via Access & Roles
   - Refresh page
   - Verify: Create Template button now visible for Staff

