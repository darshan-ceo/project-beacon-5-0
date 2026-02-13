

# Fix: Client Portal Login Fails — `loginEmail` Overwritten on Client Save

## Problem

When a client with portal access is edited and saved (even without changing the password), the `portal_access` JSON in the `clients` table gets overwritten with form data that **lacks the critical `loginEmail` and `userId` fields**. These fields are set by the provisioning function but are destroyed on every subsequent client save.

The database currently shows:
```
portal_access: {allowLogin: true, username: "prashakha@gmail.com", passwordHash: "Prashakha@123", role: "editor"}
```

It should have:
```
portal_access: {allowLogin: true, username: "prashakha@gmail.com", loginEmail: "prashakhagmailcom@portal.101ecfb0.local", userId: "f57c32aa-...", role: "editor"}
```

The `client_portal_users` table HAS the correct record with `email: prashakhagmailcom@portal.101ecfb0.local`, confirming provisioning succeeded initially. But subsequent saves overwrote the data.

## Root Cause

1. **`clientsService.ts` line 354-355**: On every client update, `portal_access` is set to `updates.portalAccess` — the raw form data which does NOT include `loginEmail` or `userId`.
2. **`ClientModal.tsx` line 212-215**: Although `clientData.portalAccess` initially includes `loginEmail`/`userId`, form modifications strip these internal fields.
3. **Plain-text password in DB**: The `passwordHash` field contains the literal password `Prashakha@123` stored in the `clients` table — a security issue. Passwords should only live in Supabase Auth.

## Fix

### 1. `src/services/clientsService.ts` — Preserve provisioning fields on save

When building the `portal_access` update, fetch the existing `portal_access` from the database and merge the provisioning-managed fields (`loginEmail`, `userId`) back in. Also strip `passwordHash` (should not be stored in DB).

### 2. `src/components/modals/ClientModal.tsx` — Carry forward internal fields

When initializing `formData.portalAccess` from `clientData`, ensure `loginEmail` and `userId` are always preserved in the form state so they survive round-trips.

### 3. `supabase/functions/provision-portal-user/index.ts` — No changes needed

The provisioning function already correctly creates the auth user and writes `loginEmail`/`userId` to `portal_access`. The problem is downstream saves overwriting it.

### 4. Fix existing broken data

The existing client `101ecfb0-...` needs its `portal_access` repaired. The simplest approach: trigger a password reset from the admin panel, which calls `provision-portal-user` and rewrites `portal_access` correctly. Alternatively, the `clientsService` fix will preserve the fields going forward, and a single "Reset Password" click will restore the data.

## Technical Details

### `src/services/clientsService.ts` (update method, around line 354)

Before writing `portal_access`, fetch the current value from DB and merge provisioning fields:

```typescript
if (updates.portalAccess !== undefined) {
  if (updates.portalAccess?.allowLogin) {
    // Fetch existing portal_access to preserve provisioning-managed fields
    const { data: existingClient } = await supabase
      .from('clients')
      .select('portal_access')
      .eq('id', clientId)
      .single();

    const existing = existingClient?.portal_access as Record<string, any> || {};
    
    supabaseUpdates.portal_access = {
      allowLogin: updates.portalAccess.allowLogin,
      username: updates.portalAccess.username,
      role: updates.portalAccess.role,
      // Preserve provisioning-managed fields
      loginEmail: updates.portalAccess.loginEmail || existing.loginEmail,
      userId: updates.portalAccess.userId || existing.userId,
      // Never store plaintext password in DB
    };
  } else {
    supabaseUpdates.portal_access = null;
  }
}
```

### `src/components/modals/ClientModal.tsx` (formData init, around line 212)

Ensure internal fields are preserved:

```typescript
portalAccess: clientData.portalAccess ? { 
  ...clientData.portalAccess, 
  role: clientData.portalAccess.role || 'editor',
  // Preserve provisioning-managed fields for round-trip
  loginEmail: clientData.portalAccess.loginEmail,
  userId: clientData.portalAccess.userId,
} : { allowLogin: false, role: 'editor' as const },
```

## Files Modified

| File | Change |
|------|--------|
| `src/services/clientsService.ts` | Merge existing `loginEmail`/`userId` into `portal_access` on save; strip `passwordHash` |
| `src/components/modals/ClientModal.tsx` | Preserve `loginEmail`/`userId` in form state initialization |

## Post-Fix Action

After deploying this fix, click "Reset Password" on the client's edit page to trigger `provision-portal-user`, which will restore the `loginEmail` in `portal_access` and sync the password to the auth system. After that, portal login will work.
