

# Fix: Client Portal Login Fails With "Incorrect Password"

## Problem

When a client's portal username is an email address (e.g., `prashakha@gmail.com`), login always fails with "Incorrect password" even though the password is correct.

## Root Cause

The `portal-lookup-login-email` edge function has a shortcut on **line 27**: if the entered username contains `@`, it assumes it IS the login email and returns it directly, skipping the database lookup entirely.

```
if (trimmedIdentifier.includes('@')) {
  return { loginEmail: trimmedIdentifier }  // Returns "prashakha@gmail.com"
}
```

But the actual Supabase auth user was created by `provision-portal-user` with a **synthetic email** like:

```
prashakhagmailcom@portal.XXXXXXXX.local
```

So the login attempt calls `signInWithPassword` with email `prashakha@gmail.com` instead of the correct synthetic email, causing an "Invalid login credentials" error that surfaces as "Incorrect password."

## Fix

### File: `supabase/functions/portal-lookup-login-email/index.ts`

Remove the email shortcut. **Always** look up the username in the `clients.portal_access` JSONB column to find the correct `loginEmail`, regardless of whether the identifier contains `@`.

The lookup logic already handles this correctly (lines 44-86) -- it searches `portal_access.username` across all clients. The fix is simply removing the early return on lines 27-33 so that email-format usernames also go through the database lookup path.

Additionally, add a fallback: if the database lookup by `portal_access.username` fails and the identifier is an email, also try matching by `portal_access.loginEmail` directly. This covers edge cases where the username stored might differ slightly.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/portal-lookup-login-email/index.ts` | Remove the `@` shortcut that bypasses database lookup; always resolve loginEmail from `portal_access` |

## Why This Fixes It

- The username `prashakha@gmail.com` will now be looked up in `clients.portal_access.username`
- The correct synthetic `loginEmail` (e.g., `prashakhagmailcom@portal.XXXXXXXX.local`) will be returned
- `signInWithPassword` will use the correct email, and the password will match

