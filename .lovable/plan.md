
# Data Visibility and Delete Permission Fixes for Manager Role

## Issues Confirmed

### Issue 1: Manager Sees All Cases (Cascading Visibility Bug)
**Root Cause**: The "Manager scoped case select" RLS policy contains a problematic clause:
```sql
OR ((client_id IS NOT NULL) AND can_user_view_client(auth.uid(), client_id))
```

This creates an unintended cascade:
1. Kuldip can see his manager Leena's case (upward visibility via `can_view_case_by_hierarchy`)
2. Leena's case is linked to client "Abc Pharma"
3. Therefore `can_user_view_client` grants Kuldip access to Abc Pharma
4. The policy then grants Kuldip access to ALL cases for Abc Pharma, including Manan's case

This violates the "Team Cases" restriction because Manan is NOT in Kuldip's hierarchy chain.

### Issue 2: Delete Button Visible for Manager
**Root Cause**: Dual mismatch between RBAC configuration and database policies:
1. Manager role does NOT have `cases.delete` permission in `role_permissions` table
2. BUT there IS a `"Manager scoped case delete"` RLS policy allowing database-level deletion
3. The UI uses `hasPermission('cases', 'delete')` which correctly returns FALSE
4. However, the Delete button still appears - suggesting the check isn't applied consistently

---

## Technical Findings

### Database Evidence

**Manager's role_permissions (cases module):**
- cases.create (allowed)
- cases.read (allowed) 
- cases.update (allowed)
- cases.delete NOT present

**RLS policies on cases table:**
- "Manager scoped case delete" EXISTS (allows deletion if data_scope conditions met)
- This policy should NOT exist if Manager role lacks delete permission

**Cascade visibility trace:**
```text
Kuldip (Manager) → reports to Leena (Partner)
↓
can_view_case_by_hierarchy(Kuldip, Leena, NULL) = TRUE (upward visibility)
↓
Leena has case GST/2025/003 linked to Abc Pharma client
↓
can_user_view_client(Kuldip, Abc Pharma) = TRUE
↓
Manager policy: "...OR can_user_view_client(client_id)..."
↓
Kuldip now sees ALL Abc Pharma cases including Manan's case
```

---

## Implementation Plan

### Phase 1: Fix Cascading Visibility in Manager Case Select Policy

**Remove the client-based cascade** from the Manager policy. Cases should only be visible through direct assignment, ownership, or hierarchy - NOT through client visibility.

```sql
-- Drop the problematic policy
DROP POLICY IF EXISTS "Manager scoped case select" ON cases;

-- Create fixed policy WITHOUT client cascade
CREATE POLICY "Manager scoped case select" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'manager')
  AND (
    -- 'All Cases' scope - full org access
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    -- 'Team Cases' scope: own + hierarchy (NO CLIENT CASCADE)
    (get_employee_data_scope(auth.uid()) = 'Team Cases' 
     AND (
       assigned_to = auth.uid() 
       OR owner_id = auth.uid() 
       OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)
     ))
    OR
    -- 'Own Cases' scope: only assigned or owned
    (get_employee_data_scope(auth.uid()) = 'Own Cases' 
     AND (assigned_to = auth.uid() OR owner_id = auth.uid()))
  )
);
```

### Phase 2: Fix Delete Permission Enforcement

**Option A (Recommended)**: Remove the Manager delete RLS policy entirely since Manager role doesn't have delete permission in RBAC:

```sql
DROP POLICY IF EXISTS "Manager scoped case delete" ON cases;
```

**Option B**: If you want Managers to be able to delete, add the permission to `role_permissions`:

```sql
INSERT INTO role_permissions (role, permission_key) 
VALUES ('manager', 'cases.delete')
ON CONFLICT DO NOTHING;
```

### Phase 3: Apply Same Fix to Related Policies (CA, Advocate)

Check and fix similar cascade issues in:
- "CA and Advocate view cases based on data_scope"
- "CA_Advocate view cases based on data_scope"

### Phase 4: Update Client-Side Logic

Ensure CaseModal.tsx correctly hides the Delete button:

```typescript
// Current code at line 59
const canDeleteCases = hasPermission('cases', 'delete');

// Verify the button is properly wrapped:
{mode === 'edit' && canDeleteCases && (
  <Button variant="destructive" onClick={handleDelete}>
    Delete Case
  </Button>
)}
```

---

## Expected Behavior After Fix

| User | Role | Data Scope | Before Fix | After Fix |
|------|------|------------|------------|-----------|
| Kuldip | Manager | Team Cases | Sees ALL cases (10) | Sees only Leena's cases + subordinates |
| Kuldip | Manager | Team Cases | Delete button visible | Delete button hidden |
| Manan Shah | Partner | Team Cases | Sees ALL cases | Sees only team cases |

---

## Testing Checklist

1. Log in as Kuldip → Case list should NOT include cases assigned to Manan
2. Log in as Kuldip → Verify Delete Case button is NOT visible
3. Log in as Admin → Verify full access retained
4. Verify no 500 errors in console after changes
5. Test case creation by Manager still works
