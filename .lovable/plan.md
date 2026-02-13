
# Fix: Portal Role Not Updating in client_portal_users Table

## Root Cause

When an admin changes the Portal Role in the Edit Client modal, the role is saved to the `clients.portal_access` JSONB field (via `clientsService.update`). However, the `client_portal_users.portal_role` column -- which is what the Client Portal actually reads during login and session validation -- is only updated through the `provision-portal-user` edge function. That edge function is gated by `shouldProvision` (line 614-618 in ClientModal.tsx), which only runs when:

1. It's a new portal setup, OR
2. The admin explicitly requested a password change

So changing just the role (without a password change) never reaches `client_portal_users.portal_role`.

## Fix

After saving the client (line 602) and after the provisioning block (line 656), add a standalone role sync that directly updates `client_portal_users.portal_role` whenever portal access is enabled and a role is set -- regardless of whether provisioning ran.

### File to Modify: `src/components/modals/ClientModal.tsx`

Add this block after the provisioning section (after line 656, before `onClose()`):

```typescript
// Always sync portal role to client_portal_users table
// This ensures role changes take effect even without password changes
if (savedClientId && formData.portalAccess.allowLogin && formData.portalAccess.role) {
  try {
    const { error: roleError } = await supabase
      .from('client_portal_users')
      .update({ 
        portal_role: formData.portalAccess.role,
        updated_at: new Date().toISOString()
      })
      .eq('client_id', savedClientId)
      .eq('is_active', true);

    if (roleError) {
      console.warn('[ClientModal] Portal role sync warning:', roleError);
    } else {
      console.log('[ClientModal] Portal role synced to:', formData.portalAccess.role);
    }
  } catch (err) {
    console.warn('[ClientModal] Portal role sync exception:', err);
  }
}
```

### Why This Works
- The portal session fetches `portal_role` from the `client_portal_users` table (see `portalAuthService.fetchSessionFromDatabase` and `ClientPortalContext.tsx`)
- This direct update ensures the role column is always in sync with what the admin selects
- It runs on every save when portal is enabled, making it idempotent and safe
- It uses `client_id` + `is_active` to target the correct portal user record
- Non-fatal: failures are logged but don't block the client save

### No Other Changes Needed
- The portal login flow (`portalAuthService.fetchSessionFromDatabase`) already reads `portal_role` from `client_portal_users` -- so once the column is updated, the next login will reflect the correct role
- The `ClientPortalContext` also reads from `client_portal_users.portal_role` -- so active sessions that re-validate will pick up the change
