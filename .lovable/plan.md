
# Fix Help & Knowledge Base Visibility + Add RBAC Module Descriptions

## Problem Summary

### Issue 1: Help & Knowledge Base Not Visible for Staff Role
The sidebar includes Staff in the `roles` array for Help, but the RBAC permission check fails because:
- The route `/help` maps to RBAC module `help` in `ROUTE_TO_RBAC_MODULE`
- There are **no `help` or `profile` permissions** in the database
- Staff role doesn't have `help.read` permission assigned
- Result: `hasRbacAccess('/help')` returns `false` → menu item filtered out

### Issue 2: Missing Module Descriptions in Access & Roles UI
The permission editor shows module names without context, making it unclear what "Compliance", "Statutory", or "GST" control.

---

## Solution Overview

### Part A: Fix Help & Profile Visibility

**Option 1 (Recommended): Bypass RBAC for Universal Access Routes**

Update `src/hooks/useModulePermissions.ts` to exclude support routes from RBAC checks:

```typescript
export const ROUTE_TO_RBAC_MODULE: Record<string, string> = {
  // MONITOR section - always visible
  '/': 'dashboard',
  '/compliance': 'dashboard',
  
  // ... other mappings ...
  
  // SUPPORT section - REMOVED from mapping (bypass RBAC)
  // '/help': 'help',      // Removed
  // '/profile': 'profile', // Removed
  
  // ... rest of mappings ...
};
```

This makes `/help` and `/profile` always accessible since `getRbacModuleForRoute()` returns `null`, and the sidebar logic allows items with no module mapping.

**Alternative Option 2: Add Help/Profile to Database**

If granular control over Help access is desired:

```sql
-- Insert help and profile permissions
INSERT INTO permissions (key, module, action, description) VALUES
  ('help.read', 'help', 'read', 'Access Help & Knowledge Base'),
  ('profile.read', 'profile', 'read', 'View and edit own user profile')
ON CONFLICT (key) DO NOTHING;

-- Grant to ALL roles
INSERT INTO role_permissions (role, permission_key) VALUES
  ('admin', 'help.read'), ('admin', 'profile.read'),
  ('partner', 'help.read'), ('partner', 'profile.read'),
  ('manager', 'help.read'), ('manager', 'profile.read'),
  ('advocate', 'help.read'), ('advocate', 'profile.read'),
  ('staff', 'help.read'), ('staff', 'profile.read'),
  ('ca', 'help.read'), ('ca', 'profile.read')
ON CONFLICT DO NOTHING;
```

**Recommendation**: Option 1 is cleaner - Help and Profile should always be accessible and don't need RBAC gatekeeping.

---

### Part B: Add Module Descriptions to Access & Roles UI

Update `src/components/admin/RolePermissionEditor.tsx` to include contextual descriptions and case studies for each module:

```typescript
const MODULE_METADATA: Record<string, { label: string; description: string; example: string }> = {
  cases: {
    label: 'Case Management',
    description: 'Legal matters from intake to resolution',
    example: 'Managing a GST appeal through all stages'
  },
  clients: {
    label: 'Clients',
    description: 'Client and contact information management',
    example: 'Adding new corporate clients with GSTIN'
  },
  compliance: {
    label: 'Compliance Dashboard',
    description: 'Track statutory deadline adherence across cases',
    example: 'Monitoring firm-wide SLA compliance rates'
  },
  courts: {
    label: 'Legal Authorities',
    description: 'Master data for tribunals, courts, and forums',
    example: 'Configuring GSTAT benches and HC jurisdictions'
  },
  gst: {
    label: 'GST Features',
    description: 'GST-specific case stages and workflows',
    example: 'Tracking GST cases from SCN to tribunal'
  },
  statutory: {
    label: 'Statutory Deadlines',
    description: 'Configure legal timeframe rules',
    example: 'Setting 90-day appeal window from order date'
  },
  documents: {
    label: 'Document Management',
    description: 'Store, organize, and share legal documents',
    example: 'Uploading and categorizing case evidence'
  },
  hearings: {
    label: 'Hearings',
    description: 'Schedule and track court/tribunal hearings',
    example: 'Managing hearing calendar with reminders'
  },
  tasks: {
    label: 'Task Management',
    description: 'Work assignments and team coordination',
    example: 'Creating drafting tasks with SLA tracking'
  },
  'tasks.templates': {
    label: 'Task Templates',
    description: 'Reusable task bundle definitions',
    example: 'Templates for standard case onboarding steps'
  },
  'tasks.automation': {
    label: 'Task Automation',
    description: 'Rules that create tasks automatically',
    example: 'Auto-generate tasks when case stage changes'
  },
  'tasks.escalation': {
    label: 'Task Escalation',
    description: 'SLA breach handling and notification chains',
    example: 'Auto-notify Partner when task is 2 days overdue'
  },
  'tasks.ai': {
    label: 'Task AI Assistant',
    description: 'AI-powered task suggestions and analysis',
    example: 'Get recommendations for next actions on a case'
  },
  reports: {
    label: 'Reports & Analytics',
    description: 'Generate performance and status reports',
    example: 'Monthly case aging report by attorney'
  },
  employees: {
    label: 'Employee Masters',
    description: 'Manage staff, roles, and team structure',
    example: 'Onboarding new team members'
  },
  judges: {
    label: 'Judge Masters',
    description: 'Maintain judge directory and preferences',
    example: 'Tracking judge writing styles and tendencies'
  },
  rbac: {
    label: 'Access & Roles',
    description: 'Permission management and role configuration',
    example: 'Creating custom roles for specialized staff'
  },
  settings: {
    label: 'System Settings',
    description: 'Application-wide configuration options',
    example: 'Setting firm branding and default values'
  },
  dashboard: {
    label: 'Dashboard',
    description: 'Overview widgets and quick metrics',
    example: 'Viewing today\'s tasks and upcoming hearings'
  },
  notifications: {
    label: 'Notifications',
    description: 'System alerts and reminders',
    example: 'Receiving deadline breach warnings'
  }
};
```

**UI Enhancement**: Show tooltips or expandable descriptions next to each module in the permission editor.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useModulePermissions.ts` | Remove `/help` and `/profile` from `ROUTE_TO_RBAC_MODULE` |
| `src/components/admin/RolePermissionEditor.tsx` | Add `MODULE_METADATA` with descriptions and examples; render tooltips in UI |

---

## Expected Results

1. **Help & Knowledge Base**: Visible in sidebar for ALL roles including Staff, Client, Clerk
2. **User Profile**: Visible for all roles (currently may also be affected)
3. **Permission Editor**: Shows clear descriptions like:
   
   ```
   ┌─────────────────────────────────────────────────────────────────┐
   │ ○ Compliance Dashboard                                    0/2  │
   │   Track statutory deadline adherence across cases              │
   │   Example: Monitoring firm-wide SLA compliance rates           │
   │   ├─ ○ View    ○ Manage                                        │
   └─────────────────────────────────────────────────────────────────┘
   ```

---

## Glossary Reference (For Users)

For convenience, here's the RBAC module terminology explained:

| Term | Definition |
|------|------------|
| **Compliance** | Dashboard showing deadline adherence rates and breach warnings across all cases |
| **Statutory Deadlines** | Configuration of legal timeframes (e.g., "Reply within 30 days of SCN") |
| **GST** | Goods & Services Tax specific features - case stages, workflows, tribunal navigation |
| **Cases** | Individual legal matters being managed |
| **Courts** (Legal Authorities) | Master data for forums - tribunals, high courts, commissioners |
