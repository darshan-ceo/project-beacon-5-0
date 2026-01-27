

# Fix Role-Based Onboarding: Staff Sees Admin Content

## Problem Summary

User "Mahesh" with **Staff** role is seeing **"Administrator Onboarding"** (19 steps, ~90 minutes) instead of **"Staff Onboarding"** (5 steps, ~30 minutes).

### Root Cause

There's a disconnect between the permission system (`supabaseRole`) and the legacy `currentUser.role` object:

| Property | Where Set | Current Value for Mahesh |
|----------|-----------|--------------------------|
| `supabaseRole` | Loaded from `user_roles` table | `'staff'` ✅ |
| `currentUser.role` | Hardcoded to `defaultUser` | `'Admin'` ❌ |

**The Bug (in `useAdvancedRBAC.tsx`):**
```typescript
// Line 78-84: defaultUser has role: 'Admin'
const defaultUser: User = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@lawfirm.com',
  role: 'Admin',  // ← This is the problem
  permissions: [{ module: '*', action: 'admin' }]
};

// Line 96: currentUser inherits this
const [currentUser, setCurrentUser] = useState<User>(defaultUser);

// MISSING: No useEffect syncs supabaseRole → currentUser.role
```

**Impact Flow:**
1. `HelpCenter.tsx` line 50: `const userRole = currentUser?.role || 'Staff';`
2. `userRole` = `'Admin'` (not `'Staff'`)
3. `OnboardingWizard` requests path for `'admin'`
4. Returns "Administrator Onboarding" with 19 steps (including inherited Partner→Manager→Advocate→Staff steps)

---

## Solution

### Part 1: Sync `currentUser.role` with `supabaseRole`

Add a `useEffect` in `useAdvancedRBAC.tsx` to update `currentUser` when `supabaseRole` changes:

```typescript
// After the existing role loading useEffect (around line 146)
useEffect(() => {
  // Sync currentUser.role with the actual Supabase role
  if (supabaseRole && supabaseRole !== 'user') {
    // Capitalize first letter to match UserRole type
    const formattedRole = supabaseRole.charAt(0).toUpperCase() + supabaseRole.slice(1) as UserRole;
    setCurrentUser(prev => ({
      ...prev,
      role: formattedRole
    }));
  }
  
  // Also sync user profile info when available
  if (userProfile) {
    setCurrentUser(prev => ({
      ...prev,
      id: user?.id || prev.id,
      name: userProfile.full_name || prev.name,
      email: user?.email || prev.email
    }));
  }
}, [supabaseRole, user, userProfile]);
```

### Part 2: Update Default User Role (Fail-Safe)

Change `defaultUser.role` from `'Admin'` to `'Client'` (least privileged):

```typescript
const defaultUser: User = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@lawfirm.com',
  role: 'Client',  // ← Changed from 'Admin' (principle of least privilege)
  permissions: []  // ← Changed from admin wildcard
};
```

**Rationale:** If role resolution fails, users should see the minimal onboarding (Client Portal: 5 steps, ~10 min) rather than admin content.

---

## Onboarding Architecture (For Reference)

The current `onboarding-paths.json` defines role-specific paths with inheritance:

```text
┌─────────────┐
│   Client    │ 5 steps, ~10 min (portal-focused)
└─────────────┘

┌─────────────┐
│    Staff    │ 5 steps, ~30 min
└──────┬──────┘
       │ inherits
┌──────▼──────┐
│  Advocate   │ +3 steps, ~45 min total
└──────┬──────┘
       │ inherits
┌──────▼──────┐
│   Manager   │ +4 steps, ~60 min total
└──────┬──────┘
       │ inherits
┌──────▼──────┐
│   Partner   │ +3 steps, ~75 min total
└──────┬──────┘
       │ inherits
┌──────▼──────┐
│    Admin    │ +4 steps, ~90 min total (19 steps!)
└─────────────┘
```

**After the fix:**
- **Staff** will see: "Staff Onboarding" (5 steps, ~30 min)
- **Advocate** will see: "Advocate Onboarding" (8 steps, ~45 min - includes Staff steps)
- **Admin** will see: "Administrator Onboarding" (19 steps, ~90 min - includes all inherited steps)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAdvancedRBAC.tsx` | Add sync effect for `currentUser.role`, update `defaultUser` |

---

## Expected Result

After implementation:

| User | RBAC Role | Onboarding Path | Steps |
|------|-----------|-----------------|-------|
| Mahesh | Staff | Staff Onboarding | 5 steps |
| Advocate user | Advocate | Advocate Onboarding | 8 steps |
| Partner user | Partner | Partner Onboarding | 16 steps |
| Admin user | Admin | Administrator Onboarding | 19 steps |
| Client user | Client | Client Portal Onboarding | 5 steps |

The "Get Started" tab will correctly reflect the logged-in user's role and show only relevant onboarding content.

---

## Technical Details

### Role Mapping

The `supabaseRole` uses lowercase (`staff`, `admin`, `partner`) while `UserRole` type uses title case (`Staff`, `Admin`, `Partner`). The sync effect handles this conversion:

```typescript
const formattedRole = supabaseRole.charAt(0).toUpperCase() + supabaseRole.slice(1) as UserRole;
```

### Type Safety

The `UserRole` type should include all roles defined in `onboarding-paths.json`:
```typescript
export type UserRole = 'Partner' | 'Admin' | 'Manager' | 'Advocate' | 'Staff' | 'Client' | 'Ca';
```

Verify that `'Staff'` and `'Client'` are included (they currently may be missing based on the type definition at line 15).

