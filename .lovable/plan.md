
# Task Management Sub-Tab Role-Based Access Control

## Current State
The Task Management module has 8 sub-tabs that are currently accessible to anyone with the `tasks` RBAC permission. Based on the screenshots and code analysis, several tabs contain critical configuration settings that should be restricted to admin-level users.

## Tab Analysis and Access Recommendations

### Tier 1: Standard Access (All Task Users)
These tabs support daily task operations and should be accessible to everyone with `tasks:read` permission:

| Tab | Reason for Standard Access |
|-----|---------------------------|
| **Board** | Core daily task viewing, status updates, drag-drop operations |
| **Analytics** | Read-only performance metrics that help employees track their work |
| **Insights** | AI-generated recommendations are advisory, not configuration |
| **Collaboration** | Team communication and activity viewing supports daily workflow |

### Tier 2: Manager Access (Manager, Partner, Admin)
These tabs involve workflow setup but have limited blast radius:

| Tab | Reason for Manager Access |
|-----|--------------------------|
| **Templates** | Creating task templates affects standardization but is reversible and scoped |

### Tier 3: Admin Access Only (Admin, Partner)
These tabs contain critical system configuration that affects all users:

| Tab | Reason for Admin Restriction |
|-----|------------------------------|
| **Automation** | Creates automatic task bundles triggered by case stages - misconfiguration can flood the system with unwanted tasks |
| **Escalation** | Configures SLA breach handling and escalation chains - affects compliance and notifications |
| **AI Assistant** | Requires API key configuration (Perplexity) - security-sensitive external integration |

---

## Implementation Approach

### Step 1: Add Granular Task Permissions
Add new sub-module permissions to the RBAC permission matrix:

```
tasks.templates   → Templates tab access
tasks.automation  → Automation tab access  
tasks.escalation  → Escalation tab access
tasks.ai          → AI Assistant tab access
```

### Step 2: Update rbacService.ts
Add the new permissions to the available permissions list:

```typescript
// Task sub-module permissions
{ module: 'tasks.templates', action: 'read' },
{ module: 'tasks.templates', action: 'write' },
{ module: 'tasks.automation', action: 'admin' },
{ module: 'tasks.escalation', action: 'admin' },
{ module: 'tasks.ai', action: 'admin' },
```

### Step 3: Update Role Definitions
Configure default permissions per role:

| Role | Board | Templates | Automation | Escalation | Analytics | Insights | AI Assistant | Collaboration |
|------|-------|-----------|------------|------------|-----------|----------|--------------|---------------|
| **Admin** | Read/Write | Admin | Admin | Admin | Read | Read | Admin | Read/Write |
| **Partner** | Read/Write | Admin | Admin | Admin | Read | Read | Admin | Read/Write |
| **Manager** | Read/Write | Write | - | - | Read | Read | - | Read/Write |
| **Advocate** | Read/Write | Read | - | - | Read | Read | - | Read |
| **Staff** | Read | - | - | - | - | - | - | Read |
| **Client** | - | - | - | - | - | - | - | - |

### Step 4: Update TaskManagement.tsx
Wrap restricted tabs with permission checks:

```typescript
import { useAdvancedRBAC, ProtectedComponent } from '@/hooks/useAdvancedRBAC';

// In the component:
const { hasPermission } = useAdvancedRBAC();

const canAccessAutomation = hasPermission('tasks.automation', 'admin');
const canAccessEscalation = hasPermission('tasks.escalation', 'admin');
const canAccessTemplates = hasPermission('tasks.templates', 'read');
const canAccessAI = hasPermission('tasks.ai', 'admin');

// In TabsList - conditionally render tabs:
<TabsTrigger value="board">Board</TabsTrigger>
{canAccessAutomation && (
  <TabsTrigger value="automation">Automation</TabsTrigger>
)}
{canAccessEscalation && (
  <TabsTrigger value="escalation">Escalation</TabsTrigger>
)}
{canAccessTemplates && (
  <TabsTrigger value="templates">Templates</TabsTrigger>
)}
<TabsTrigger value="analytics">Analytics</TabsTrigger>
<TabsTrigger value="insights">Insights</TabsTrigger>
{canAccessAI && (
  <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
)}
<TabsTrigger value="collaboration">Collaboration</TabsTrigger>

// Also protect the TabsContent to prevent URL parameter bypass
```

### Step 5: Handle Default Tab Selection
If a user's current tab becomes restricted, redirect to the first available tab:

```typescript
useEffect(() => {
  const restrictedTabs = {
    automation: canAccessAutomation,
    escalation: canAccessEscalation,
    templates: canAccessTemplates,
    'ai-assistant': canAccessAI
  };
  
  if (activeTab in restrictedTabs && !restrictedTabs[activeTab]) {
    setActiveTab('board');
  }
}, [activeTab, canAccessAutomation, canAccessEscalation, canAccessTemplates, canAccessAI]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/rbacService.ts` | Add `tasks.templates`, `tasks.automation`, `tasks.escalation`, `tasks.ai` permissions |
| `src/hooks/useAdvancedRBAC.tsx` | No changes needed - uses existing permission checking |
| `src/components/tasks/TaskManagement.tsx` | Add permission checks for tab visibility and content protection |
| `src/services/supabasePermissionsResolver.ts` | Add permission mappings for new sub-modules |

---

## Access & Roles UI Update

Add the new task sub-permissions to the RBAC configuration interface so administrators can customize:

```
TASKS MODULE
├─ tasks (base module)
│   ├─ read  - View task board and list
│   ├─ write - Create/edit tasks
│   ├─ delete - Remove tasks
│   └─ admin - Full task management
├─ tasks.templates
│   ├─ read  - View templates
│   └─ write - Create/edit templates
├─ tasks.automation
│   └─ admin - Configure automation bundles
├─ tasks.escalation
│   └─ admin - Configure escalation matrix
└─ tasks.ai
    └─ admin - Configure AI assistant
```

---

## Summary

This implementation ensures:
1. **Security**: Critical configuration tabs (Automation, Escalation, AI) are admin-only
2. **Usability**: Standard users can still view analytics and collaborate
3. **Flexibility**: Managers can manage templates without full admin access
4. **Governance**: All access is auditable through RBAC system
5. **Fail-safe**: URL parameter bypass is prevented by protecting TabsContent
