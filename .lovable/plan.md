
# Add Task Sub-Module Permissions to Database and UI

## Problem Summary
The new granular Task Management permissions (`tasks.templates`, `tasks.automation`, `tasks.escalation`, `tasks.ai`) are not appearing in the Access & Roles UI because they were added to client-side code but never inserted into the database `permissions` table.

Your screenshot shows only the base `Tasks` module with 4 permissions (Create, Delete, View, Edit), but should show additional sub-module sections for Templates, Automation, Escalation, and AI Assistant.

---

## Solution Overview

### Step 1: Database Migration - Insert New Permissions
Add the missing task sub-module permissions to the `permissions` table:

| Permission Key | Module | Action | Description |
|----------------|--------|--------|-------------|
| `tasks.templates.read` | tasks.templates | read | View task templates |
| `tasks.templates.create` | tasks.templates | create | Create task templates |
| `tasks.templates.update` | tasks.templates | update | Edit task templates |
| `tasks.templates.delete` | tasks.templates | delete | Delete task templates |
| `tasks.automation.read` | tasks.automation | read | View task automation rules |
| `tasks.automation.manage` | tasks.automation | manage | Manage automation bundles |
| `tasks.escalation.read` | tasks.escalation | read | View escalation settings |
| `tasks.escalation.manage` | tasks.escalation | manage | Manage escalation matrix |
| `tasks.ai.read` | tasks.ai | read | View AI assistant settings |
| `tasks.ai.manage` | tasks.ai | manage | Configure AI assistant |

SQL Migration:
```sql
INSERT INTO permissions (key, module, action, description) VALUES
  ('tasks.templates.read', 'tasks.templates', 'read', 'View task templates'),
  ('tasks.templates.create', 'tasks.templates', 'create', 'Create task templates'),
  ('tasks.templates.update', 'tasks.templates', 'update', 'Edit task templates'),
  ('tasks.templates.delete', 'tasks.templates', 'delete', 'Delete task templates'),
  ('tasks.automation.read', 'tasks.automation', 'read', 'View task automation rules'),
  ('tasks.automation.manage', 'tasks.automation', 'manage', 'Manage automation bundles'),
  ('tasks.escalation.read', 'tasks.escalation', 'read', 'View escalation settings'),
  ('tasks.escalation.manage', 'tasks.escalation', 'manage', 'Manage escalation matrix'),
  ('tasks.ai.read', 'tasks.ai', 'read', 'View AI assistant settings'),
  ('tasks.ai.manage', 'tasks.ai', 'manage', 'Configure AI assistant')
ON CONFLICT (key) DO NOTHING;
```

### Step 2: Update RolePermissionEditor Module Labels
Add display names for the new sub-modules so they appear with proper titles:

```typescript
const MODULE_LABELS: Record<string, string> = {
  // ... existing modules ...
  tasks: 'Tasks',
  'tasks.templates': 'Task Templates',
  'tasks.automation': 'Task Automation',
  'tasks.escalation': 'Task Escalation',
  'tasks.ai': 'Task AI Assistant',
};
```

### Step 3: Seed Default Role Permissions
Insert default role-permission mappings for the new permissions:

**Admin/Partner** - Full access to all task sub-modules
**Manager** - Templates read/write, no automation/escalation/ai
**User/Staff** - No access to sub-modules (base tasks only)

SQL for default role permissions:
```sql
-- Admin gets all task sub-module permissions
INSERT INTO role_permissions (role, permission_key) VALUES
  ('admin', 'tasks.templates.read'),
  ('admin', 'tasks.templates.create'),
  ('admin', 'tasks.templates.update'),
  ('admin', 'tasks.templates.delete'),
  ('admin', 'tasks.automation.read'),
  ('admin', 'tasks.automation.manage'),
  ('admin', 'tasks.escalation.read'),
  ('admin', 'tasks.escalation.manage'),
  ('admin', 'tasks.ai.read'),
  ('admin', 'tasks.ai.manage')
ON CONFLICT DO NOTHING;

-- Partner gets same as admin
INSERT INTO role_permissions (role, permission_key) VALUES
  ('partner', 'tasks.templates.read'),
  ('partner', 'tasks.templates.create'),
  ('partner', 'tasks.templates.update'),
  ('partner', 'tasks.templates.delete'),
  ('partner', 'tasks.automation.read'),
  ('partner', 'tasks.automation.manage'),
  ('partner', 'tasks.escalation.read'),
  ('partner', 'tasks.escalation.manage'),
  ('partner', 'tasks.ai.read'),
  ('partner', 'tasks.ai.manage')
ON CONFLICT DO NOTHING;

-- Manager gets templates access only
INSERT INTO role_permissions (role, permission_key) VALUES
  ('manager', 'tasks.templates.read'),
  ('manager', 'tasks.templates.create'),
  ('manager', 'tasks.templates.update')
ON CONFLICT DO NOTHING;
```

### Step 4: Update TaskManagement.tsx Permission Checks
Align the permission check keys to match the database format:

```typescript
// Current (code-only format)
const canAccessAutomation = hasPermission('tasks.automation', 'admin');

// Updated (database-aligned format)
const canAccessAutomation = hasPermission('tasks.automation', 'manage');
const canAccessEscalation = hasPermission('tasks.escalation', 'manage');
const canAccessTemplates = hasPermission('tasks.templates', 'read');
const canAccessAI = hasPermission('tasks.ai', 'manage');
```

### Step 5: Update supabasePermissionsResolver Module Aliases
Ensure the resolver properly maps the new sub-module permissions:

```typescript
private static moduleAliases: Record<string, string> = {
  // ... existing aliases ...
  'tasks.templates': 'tasks.templates',
  'tasks.automation': 'tasks.automation',
  'tasks.escalation': 'tasks.escalation',
  'tasks.ai': 'tasks.ai',
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| Database Migration | Insert new permissions into `permissions` table |
| Database Migration | Insert default role_permissions for admin/partner/manager |
| `src/components/admin/RolePermissionEditor.tsx` | Add MODULE_LABELS for task sub-modules |
| `src/components/tasks/TaskManagement.tsx` | Update permission check action names |
| `src/services/supabasePermissionsResolver.ts` | Verify module alias mappings |

---

## Expected Result After Implementation

The Edit Permissions dialog will show:

```text
Tasks                     4/4
├─ Create  Delete  View  Edit

Task Templates            0/4
├─ Create  Delete  View  Edit

Task Automation           0/2
├─ View    Manage

Task Escalation           0/2
├─ View    Manage

Task AI Assistant         0/2
├─ View    Manage
```

- **Admin role**: All task sub-module permissions selected by default
- **Partner role**: All task sub-module permissions selected by default
- **Manager role**: Templates read/create/update only
- **User/Staff role**: Base tasks only, no sub-modules
- **Client role**: No task permissions

This aligns with the originally approved tiered access model:
- Standard Access (Board, Analytics, Insights, Collaboration): Available to all with base `tasks:read`
- Manager+ Access (Templates): Requires `tasks.templates:read`
- Admin/Partner Only (Automation, Escalation, AI): Requires `tasks.automation:manage`, `tasks.escalation:manage`, `tasks.ai:manage`
