
# Plan: Fix Notification Bell - RLS Policy Insert Failure

## Problem Summary

The notification bell shows "No notifications – You're all caught up!" because **notification inserts are being blocked by RLS policy**, as confirmed by database error logs:

```
ERROR: new row violates row-level security policy for table "notifications"
```

## Root Cause Analysis

### Database Evidence
From Postgres logs at timestamp `1769682342004`:
```sql
error_severity: ERROR
event_message: new row violates row-level security policy for table "notifications"
```

### Why the RLS Policy Fails

The current INSERT policy on `notifications` table is:
```sql
WITH CHECK (tenant_id = public.get_user_tenant_id())
```

The `get_user_tenant_id()` function:
```sql
CREATE FUNCTION public.get_user_tenant_id()
RETURNS uuid AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER SET row_security TO 'off';
```

**Failure scenarios:**
1. **Session expiry** - If the user's JWT session expires between auth check and insert, `auth.uid()` returns NULL
2. **Race condition** - If `getContext()` succeeds but the Supabase insert call happens after token refresh, the auth context might be misaligned
3. **Async timing** - The notification creation is `async` and doesn't `await` the auth refresh before insert

When `get_user_tenant_id()` returns NULL:
- The check `tenant_id = NULL` evaluates to NULL (not TRUE)
- RLS policy fails even though valid `tenant_id` is provided

## Solution

### Option A: Make RLS Policy More Robust (Recommended)
Update the INSERT policy to also allow inserts where the tenant_id matches any existing tenant that the creator belongs to:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert notifications for same tenant" ON notifications;

-- Create more robust policy
CREATE POLICY "Users can insert notifications for same tenant" 
ON notifications FOR INSERT
WITH CHECK (
  tenant_id = COALESCE(
    public.get_user_tenant_id(),
    -- Fallback: verify tenant exists and user is in that tenant
    (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
);
```

Wait - this is redundant since `get_user_tenant_id()` already queries profiles. The real issue is that `auth.uid()` returns NULL.

### Option B: Add Service-Level Retry with Auth Refresh
In `notificationSystemService.createNotification()`, add auth validation before insert:

```typescript
async createNotification(...) {
  // Force refresh auth session before insert
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    log('error', 'createNotification', 'No active session, cannot create notification');
    return null;
  }
  
  // Refresh if token is expiring soon (within 60 seconds)
  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  if (expiresAt - Date.now() < 60000) {
    await supabase.auth.refreshSession();
  }
  
  // Proceed with getContext() and insert...
}
```

### Option C: Use Database Trigger Instead of Direct Insert (Most Reliable)
Create a database function with SECURITY DEFINER that bypasses RLS entirely:

```sql
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_entity_type text DEFAULT NULL,
  p_related_entity_id uuid DEFAULT NULL,
  p_channels text[] DEFAULT ARRAY['in_app'],
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_tenant_id uuid;
  v_notification_id uuid;
BEGIN
  -- Get caller's tenant
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Unable to determine tenant for current user';
  END IF;
  
  -- Generate notification ID
  v_notification_id := gen_random_uuid();
  
  -- Insert bypassing RLS
  INSERT INTO notifications (
    id, tenant_id, user_id, type, title, message,
    related_entity_type, related_entity_id, channels, status, read, metadata, created_at
  ) VALUES (
    v_notification_id, v_tenant_id, p_user_id, p_type, p_title, p_message,
    p_related_entity_type, p_related_entity_id, p_channels, 'pending', false, p_metadata, now()
  );
  
  RETURN v_notification_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
```

Then update the service to call:
```typescript
const { data, error } = await supabase.rpc('create_notification', {
  p_user_id: userId,
  p_type: type,
  p_title: title,
  p_message: message,
  p_related_entity_type: options?.relatedEntityType,
  p_related_entity_id: options?.relatedEntityId,
  p_channels: options?.channels || ['in_app'],
  p_metadata: options?.metadata
});
```

## Recommended Approach: Option C (Database Function)

This is the most reliable because:
1. SECURITY DEFINER ensures the function runs with elevated privileges
2. SET row_security = off explicitly disables RLS for the insert
3. Tenant validation happens inside the function, not via RLS policy
4. No dependency on client-side auth token timing

---

## Implementation Steps

### Step 1: Create Database Function
Migration to create `create_notification` function with SECURITY DEFINER.

### Step 2: Update Service
Modify `notificationSystemService.createNotification()` to call `supabase.rpc('create_notification', ...)` instead of direct insert.

### Step 3: Add Error Handling
Add specific error handling for the RPC call with clear error messages.

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| Database Migration | Create | Add `create_notification` function with SECURITY DEFINER |
| `src/services/notificationSystemService.ts` | Modify | Use `supabase.rpc()` instead of direct insert |

---

## Testing Checklist

1. **Create task assigned to another user**
   - Login as User A
   - Create task assigned to User B
   - Verify notification row exists in database
   
2. **Verify notification appears for recipient**
   - Login as User B
   - Click notification bell
   - Verify notification appears in list

3. **Verify RLS error is resolved**
   - Check Postgres logs after test
   - Confirm no RLS policy violation errors

4. **Session expiry scenario**
   - Let session sit idle near expiry
   - Create a task
   - Verify notification still created (function bypasses RLS)
