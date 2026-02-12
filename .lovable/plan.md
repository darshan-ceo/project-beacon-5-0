
# Fix: Suppress Storage Warning on Login Page

## Problem
When the app loads on the login page (before the user has authenticated), the storage health check runs immediately. It detects "No active session" and shows a "Storage Warning: Health check failed: Error: User not authenticated. Please login." toast. This is expected behavior on the login page -- not an error worth alarming the user about.

## Solution
Skip the storage health check when there is no active authentication session. The health check is only meaningful after login. Once the user authenticates, the storage system reinitializes properly.

## Changes

**File: `src/components/AppWithPersistence.tsx` (lines ~93-107)**

Wrap the health check in a session guard:

```typescript
// Only perform health check if user is authenticated
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const health = await storageManager.healthCheck();
  
  if (!health.healthy) {
    console.warn('Storage health check warnings:', health.errors);
    toast({
      title: "Storage Warning",
      description: health.errors[0] || "Some storage features may not work correctly",
      variant: "default"
    });
  } else {
    console.log('Storage health check passed');
  }
} else {
  console.log('Skipping storage health check - user not authenticated yet');
}
```

This way, unauthenticated users on the login page won't see the irrelevant warning. After login, the storage system reinitializes and performs the health check as normal.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/AppWithPersistence.tsx` | Guard health check with session check (~5 lines changed) |

Single file, minimal change.
