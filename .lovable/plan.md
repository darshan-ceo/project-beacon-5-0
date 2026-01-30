
# Data Scope Enforcement Fix for Partner/Manager Roles

## Executive Summary

The user's concern is valid: **"Team Cases" is correctly configured but ignored for Partner and Manager roles**. The system has multiple override mechanisms that grant "All Cases" access to Partners regardless of their Employee Master settings.

---

## Root Cause (3 Layers of Override)

### Layer 1: RLS Policies (Database)
Policies grant Partners unrestricted access without checking `data_scope`:
```sql
-- "Admins view all cases" and "Admin_Partner full case access"
-- These grant access to ALL cases when role = partner/admin
```

### Layer 2: SQL Function Override
The `can_user_view_case()` function immediately returns TRUE for partners:
```sql
IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
  RETURN TRUE;  -- Ignores data_scope entirely
END IF;
```

### Layer 3: Client-Side Override
In `hierarchyService.ts` (line 259-261):
```typescript
const isPartnerOrAdmin = role === 'Partner' || role === 'Admin';
const effectiveScope = isPartnerOrAdmin ? 'All Cases' : dataScope;
```

---

## Business Requirements Clarification

| User | Role | Desired Scope | Current Behavior | Expected Behavior |
|------|------|---------------|------------------|-------------------|
| Manan Shah | Partner | Team Cases | Sees ALL cases | See only team cases |
| Leena Sanghavi | Partner | Team Cases | Sees ALL cases | See only team cases |
| Nitesh Jain | Partner | All Cases | Sees ALL cases | See ALL cases (correct) |
| Kuldip | Manager | Team Cases | TBD - check RLS | See only team cases |

The client requirement is clear: **Partners should respect their configured `data_scope`**. The current hardcoded override was a design decision that must be changed.

---

## Implementation Plan

### Phase 1: Fix Client-Side Logic (hierarchyService.ts)

Remove the Partner/Admin override so `data_scope` is always respected:

**Current Code (lines 259-261):**
```typescript
// Admin/Partner override - they always get 'All Cases' access
const isPartnerOrAdmin = role === 'Partner' || role === 'Admin';
const effectiveScope = isPartnerOrAdmin ? 'All Cases' : dataScope;
```

**New Code:**
```typescript
// CRITICAL FIX: Respect data_scope for ALL roles including Partner
// Only Admin role gets unconditional 'All Cases' access
// Partners now respect their configured data_scope setting
const isAdmin = role === 'Admin';
const effectiveScope = isAdmin ? 'All Cases' : dataScope;
```

**Files affected:** `src/services/hierarchyService.ts`

---

### Phase 2: Update RLS Policies (Database Migration)

Create new policies that check `data_scope` for Partners instead of granting blanket access.

**SQL Migration:**
```sql
-- Drop blanket partner access policies
DROP POLICY IF EXISTS "Admin_Partner full case access" ON cases;
DROP POLICY IF EXISTS "Admins view all cases" ON cases;

-- Create data_scope aware policy for Partners
CREATE POLICY "Partner view cases based on data_scope" ON cases
FOR SELECT TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'partner')
  AND (
    -- 'All Cases' scope - full org access
    get_employee_data_scope(auth.uid()) = 'All Cases'
    OR
    -- 'Team Cases' scope: own + hierarchy
    (get_employee_data_scope(auth.uid()) = 'Team Cases' 
     AND (assigned_to = auth.uid() 
          OR owner_id = auth.uid() 
          OR can_view_case_by_hierarchy(auth.uid(), assigned_to, owner_id)))
    OR
    -- 'Own Cases' scope: only assigned or owned
    (get_employee_data_scope(auth.uid()) = 'Own Cases' 
     AND (assigned_to = auth.uid() OR owner_id = auth.uid()))
  )
);

-- Keep Admin full access (they are system administrators)
CREATE POLICY "Admin full case access" ON cases
FOR ALL TO authenticated
USING (
  tenant_id = get_user_tenant_id() 
  AND has_role(auth.uid(), 'admin')
);
```

---

### Phase 3: Fix `can_user_view_case()` Function

Update the function to respect `data_scope` for Partners:

**Current Code:**
```sql
IF has_role(_user_id, 'admin') OR has_role(_user_id, 'partner') THEN
  RETURN TRUE;
END IF;
```

**New Code:**
```sql
-- Admin always gets full access (system admin)
IF has_role(_user_id, 'admin') THEN
  RETURN TRUE;
END IF;

-- Partner now respects data_scope setting
-- (handled by normal data_scope logic below)
```

---

### Phase 4: Apply Same Fix to Related Tables

Update policies for `clients`, `tasks`, `documents`, `hearings` to also respect Partner's `data_scope`:

1. **clients table** - Update `can_user_view_client()` function
2. **tasks table** - Update task visibility policies
3. **hearings table** - Update hearing visibility policies
4. **documents table** - Update document visibility policies

---

### Phase 5: Fix Manager Behavior

The Manager role should already respect `data_scope` via RLS policy `"Manager scoped case select"`. Verify this policy works correctly by testing.

---

## Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `src/services/hierarchyService.ts` | Remove Partner override | Client-side visibility calculation |
| Database migration | Update RLS policies | Server-side access control |
| Database migration | Update `can_user_view_case()` | Function-level access control |
| Database migration | Update `can_user_view_client()` | Client visibility |

---

## Impact Assessment

### Before Fix
- Manan Shah (Partner, Team Cases) → Sees ALL cases (wrong)
- Leena Sanghavi (Partner, Team Cases) → Sees ALL cases (wrong)
- Nitesh Jain (Partner, All Cases) → Sees ALL cases (correct)

### After Fix
- Manan Shah (Partner, Team Cases) → Sees only team-related cases (correct)
- Leena Sanghavi (Partner, Team Cases) → Sees only team-related cases (correct)
- Nitesh Jain (Partner, All Cases) → Sees ALL cases (correct)
- Admin role → Always sees ALL cases (unchanged)

---

## Testing Checklist

1. Log in as Manan Shah (Partner, Team Cases) → Should only see cases assigned to self or team
2. Log in as Nitesh Jain (Partner, All Cases) → Should see all cases
3. Log in as Kuldip (Manager, Team Cases) → Should only see team cases
4. Verify Dashboard case counts reflect filtered data
5. Verify Case Management list shows filtered cases
6. Test case search respects visibility rules

---

## Security Consideration

The Admin role should retain full access as they are system administrators who may need to manage all data. Only the Partner role's behavior is being modified to respect `data_scope`.
