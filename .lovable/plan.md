
# RBAC Access Control Enforcement Fix for Manager Role

## Issues Identified

### Issue 1: Client Groups Visible to Manager Without Permission
**Root Cause**: The route-to-module mapping in `useModulePermissions.ts` maps `/client-groups` → `'clients'`:
```typescript
'/client-groups': 'clients',  // Line 84
```
Since Manager has `clients.read` permission, the sidebar shows "Client Groups" even though Manager has NO permissions for the `client_groups` module in the database.

**Evidence**: Database query shows Manager has NO `client_groups.*` permissions, only `clients.*` permissions.

---

### Issue 2: Compliance Dashboard Visible to Manager Without Permission
**Root Cause**: Similar mapping issue - `/compliance` is mapped to `'dashboard'`:
```typescript
'/compliance': 'dashboard',  // Line 73
```
Since Manager has `dashboard.read` permission, the Compliance Dashboard appears in the sidebar even though Manager has NO `compliance.*` permissions in the database.

**Evidence**: Database query shows Manager has `dashboard.read` but NO `compliance.read` or `compliance.manage`.

---

### Issue 3: Document Delete Option Visible Without Permission
**Root Cause**: The DocumentManagement component correctly checks `hasPermission('documents', 'delete')` at line 127, and the UI gate at line 1471 uses `canDeleteDocuments`. The issue is that either:
1. RBAC enforcement is disabled (demo mode)
2. The permission check is not properly gating all delete buttons/menu items

**Evidence**: Database confirms Manager does NOT have `documents.delete` permission (only create, read, update).

---

## Technical Root Causes

### ROUTE_TO_RBAC_MODULE Mapping Issues (useModulePermissions.ts)
```typescript
// Current problematic mappings:
'/compliance': 'dashboard',      // Should be 'compliance'
'/client-groups': 'clients',     // Should be 'client_groups'
```

These mappings were designed for simplicity but violate the principle that each distinct permission module should map to its own RBAC module.

---

## Implementation Plan

### Phase 1: Fix Route-to-Module Mapping

**File**: `src/hooks/useModulePermissions.ts`

Update ROUTE_TO_RBAC_MODULE to use correct module names:

```typescript
// MONITOR section
'/': 'dashboard',
'/compliance': 'compliance',  // FIX: was 'dashboard', now correctly uses 'compliance'

// CLIENTS section  
'/clients': 'clients',
'/contacts': 'clients',
'/client-groups': 'client_groups',  // FIX: was 'clients', now correctly uses 'client_groups'
```

This ensures that:
- `/compliance` checks for `compliance.read` permission
- `/client-groups` checks for `client_groups.read` permission

---

### Phase 2: Verify Document Delete Permission Check

**File**: `src/components/documents/DocumentManagement.tsx`

The component already has correct permission checking at:
- Line 127: `const canDeleteDocuments = hasPermission('documents', 'delete');`
- Line 1471: `{canDeleteDocuments && (...)}`

However, I need to verify there are no other delete buttons that bypass this check. I'll audit the component for any delete actions without the `canDeleteDocuments` guard.

---

### Phase 3: Add Page-Level Access Protection

For defense-in-depth, add access denied checks at the page/component level:

**File**: `src/components/masters/ClientGroupMasters.tsx`

```typescript
// Add at top of component
const { hasPermission, isRbacReady, enforcementEnabled } = useRBAC();
const canViewClientGroups = hasPermission('client_groups', 'read');

// Add early return for unauthorized access
if (enforcementEnabled && isRbacReady && !canViewClientGroups) {
  return (
    <div className="flex items-center justify-center h-64 flex-col space-y-4">
      <Shield className="h-12 w-12 text-muted-foreground" />
      <div className="text-lg font-medium">Access Denied</div>
      <div className="text-sm text-muted-foreground">
        You do not have permission to access Client Groups.
      </div>
    </div>
  );
}
```

**File**: `src/pages/ComplianceDashboard.tsx`

Same pattern for Compliance Dashboard access protection.

---

### Phase 4: Update Legacy Role Arrays in Sidebar

**File**: `src/components/layout/Sidebar.tsx`

The legacy `roles` arrays in `sidebarSections` should NOT include 'Manager' for Client Groups:

```typescript
// Current (line 125):
{ icon: Building2, label: 'Client Groups', href: '/client-groups', roles: ['Admin', 'Partner', 'Partner/CA', 'Ca'] },
// This is already correct - Manager is not listed
```

However, the RBAC check takes priority, so the real fix is in the route mapping (Phase 1).

---

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `src/hooks/useModulePermissions.ts` | Update `/compliance` → `'compliance'`, `/client-groups` → `'client_groups'` | Fix sidebar visibility filtering |
| `src/components/masters/ClientGroupMasters.tsx` | Add page-level access check | Defense-in-depth protection |
| `src/pages/ComplianceDashboard.tsx` | Add page-level access check | Defense-in-depth protection |
| `src/components/documents/DocumentManagement.tsx` | Audit and verify all delete actions are gated | Ensure delete permission is consistently enforced |

---

## Expected Behavior After Fix

| User | Role | Module | Before Fix | After Fix |
|------|------|--------|------------|-----------|
| Kuldip | Manager | Client Groups | Visible in sidebar | Hidden from sidebar |
| Kuldip | Manager | Compliance Dashboard | Visible in sidebar | Hidden from sidebar |
| Kuldip | Manager | Document Delete | Delete option visible | Delete option hidden |

---

## Testing Checklist

1. Log in as Kuldip (Manager) → Verify "Client Groups" is NOT visible in sidebar
2. Log in as Kuldip (Manager) → Verify "Compliance Dashboard" is NOT visible in sidebar
3. Log in as Kuldip (Manager) → Navigate to Documents → Verify Delete option is NOT visible in document menu
4. Log in as Admin → Verify all modules are still accessible
5. Direct URL access to `/client-groups` as Manager → Should show "Access Denied"
6. Direct URL access to `/compliance` as Manager → Should show "Access Denied"
