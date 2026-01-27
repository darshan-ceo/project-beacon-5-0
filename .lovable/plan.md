
# Fix RBAC Enforcement: Staff Incorrectly Accessing System Settings

## Problem Analysis

User "Mahesh" with **Staff** role can view and access System Settings despite having **0/2 permissions** assigned in the Access & Roles configuration.

### Evidence from Database:

| Role | Settings Permissions |
|------|---------------------|
| Admin | `settings.read`, `settings.update` ✅ |
| Advocate | `settings.read`, `settings.update` ✅ |
| Client | `settings.read`, `settings.update` ✅ (likely a misconfiguration) |
| **Staff** | **NONE** ❌ |
| Manager | **NONE** ❌ |
| Partner | **NONE** ❌ (should be granted) |
| CA | **NONE** ❌ |

### Root Causes Identified

**Cause 1: Sidebar shows menu during RBAC loading**
In `Sidebar.tsx` line 286, `hasRbacAccess()` returns `true` when `!isRbacReady`, allowing all menu items to show before permissions are loaded.

**Cause 2: No page-level access control**
`GlobalParameters.tsx` (System Settings page) has no RBAC check. The route only uses `ProtectedRoute` which checks authentication, not permissions.

**Cause 3: Missing role-based database permissions**
Several roles that SHOULD have Settings access (Partner) don't have database permissions, while Client role incorrectly has full settings access.

---

## Solution

### Part 1: Fix Sidebar RBAC Loading Behavior

Update `hasRbacAccess()` in `Sidebar.tsx` to be restrictive during loading (fail-closed):

```typescript
const hasRbacAccess = (href: string): boolean => {
  if (!enforcementEnabled) return true;
  
  // CHANGED: Be restrictive during loading (fail-closed security)
  if (!isRbacReady) return false;  // Was: return true
  
  const rbacModule = getRbacModuleForRoute(href);
  if (!rbacModule) return true;
  
  return hasPermission(rbacModule, 'read');
};
```

### Part 2: Add Page-Level Access Control to System Settings

Wrap `GlobalParameters` component with permission check:

```typescript
// In GlobalParameters.tsx - add at the top of the component
const { hasPermission, isRbacReady } = useRBAC();

// Check settings permission
if (isRbacReady && !hasPermission('settings', 'read')) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to view System Settings.
        </p>
      </div>
    </div>
  );
}
```

### Part 3: Fix Database Role Permissions

Database migration to correct role assignments:

```sql
-- Remove incorrect Client settings permissions
DELETE FROM role_permissions 
WHERE role = 'client' AND permission_key LIKE 'settings%';

-- Add Partner settings permissions (they should have access)
INSERT INTO role_permissions (role, permission_key) VALUES
  ('partner', 'settings.read'),
  ('partner', 'settings.update')
ON CONFLICT DO NOTHING;

-- Optionally add Manager read-only access
INSERT INTO role_permissions (role, permission_key) VALUES
  ('manager', 'settings.read')
ON CONFLICT DO NOTHING;
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/Sidebar.tsx` | Change `hasRbacAccess()` to return `false` during loading |
| `src/components/admin/GlobalParameters.tsx` | Add page-level RBAC check with access denied fallback |
| Database migration | Fix Client/Partner/Manager settings permissions |

---

## Expected Results After Fix

| Role | Sidebar Shows Settings | Can Access /settings Page |
|------|----------------------|--------------------------|
| Admin | ✅ Yes | ✅ Yes |
| Partner | ✅ Yes | ✅ Yes |
| Advocate | ✅ Yes | ✅ Yes |
| Manager | ✅ Yes (read-only) | ✅ Yes (read-only) |
| **Staff** | ❌ No | ❌ Access Denied |
| CA | ❌ No | ❌ Access Denied |
| Clerk | ❌ No | ❌ Access Denied |
| Client | ❌ No | ❌ Access Denied |

---

## Security Model Summary

The fix implements defense-in-depth:

1. **Layer 1 - Sidebar**: Hides menu items user cannot access (fail-closed during load)
2. **Layer 2 - Page Component**: Shows "Access Denied" if permission check fails
3. **Layer 3 - Database**: Correct permission assignments in `role_permissions` table

All three layers must agree for access to be granted, ensuring security even if one layer has a bug.
