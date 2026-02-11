
# Simplify Client Groups: Remove Standalone Page, Keep Inline

## Overview

Client Groups is too minor for a dedicated sidebar item and full page. The inline "Create New Group" option already exists inside the Client creation/edit modal. This plan removes the standalone page/route/sidebar entry while preserving all group management capabilities within the client workflow.

## What Changes

### 1. Remove "Client Groups" from Sidebar
**File: `src/components/layout/Sidebar.tsx`**
- Delete the `{ icon: Building2, label: 'Client Groups', href: '/client-groups', ... }` entry from the CLIENTS section

### 2. Remove the `/client-groups` Route
**File: `src/App.tsx`**
- Remove the `<Route path="/client-groups" ...>` block (lines 203-209)
- Remove the `ClientGroupMasters` import if no longer used

### 3. Keep Everything Else As-Is
- The `ClientGroupModal` already works inline inside the Client Modal (with "+ Create New" in the group dropdown) -- no changes needed
- The `ClientGroupMasters.tsx` page file and `clientGroupsService.ts` are retained (not deleted) since the modal and service are reused by the inline flow
- Global Search references to "Client Groups" remain functional for finding grouped clients
- RBAC permission for `client-groups` stays in `RolePermissionEditor.tsx` (controls who can create groups inline)

## What Users Get

- Cleaner sidebar with one fewer low-value item
- Group selection + creation stays right where it matters: inside the Client form
- No functionality is lost -- groups can still be created, selected, and managed during client creation/editing

## Technical Details

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Remove "Client Groups" sidebar item |
| `src/App.tsx` | Remove `/client-groups` route and unused import |

Only 2 files modified, ~10 lines removed total.
