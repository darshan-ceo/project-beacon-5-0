

# Fix: Admin Panel Notifications for Portal Document Uploads

## Problem

When a client uploads a document from the Client Portal, **no notification appears in the Admin Panel**. This is because:

1. The existing `notify_client_on_document` trigger only writes to `client_notifications` (portal-side), NOT to the admin `notifications` table.
2. There is no trigger or code that creates an admin notification when a portal document is uploaded.
3. The `create_notification` RPC function relies on `auth.uid()` to look up the tenant, but portal users are not in the `profiles` table, so it can't be used from the portal context.

## How Admin Notifications Currently Work

- Admin notifications live in the `notifications` table
- They are created via the `create_notification` database function (SECURITY DEFINER)
- The `NotificationBell` component in the admin panel reads from this table filtered by the logged-in admin user's ID
- Hearing notifications work because `hearingsService` calls `notificationSystemService.createNotification()` from an admin session

## Solution

Create a new database trigger that fires when a document is inserted and the file path starts with `client-uploads/`. This trigger will insert a notification into the admin `notifications` table for the case's assigned user, so they see it in the Admin Panel bell icon.

### Database Migration

Create a new trigger function `notify_admin_on_portal_document_upload` that:

1. Checks if the `file_path` starts with `client-uploads/` (identifying it as a portal upload)
2. Looks up the `case_id` to find the `assigned_to` user and `case_number`
3. Looks up the `client_id` to get the client name
4. Inserts directly into the `notifications` table with the case assignee as the recipient
5. Uses `SECURITY DEFINER` with RLS off so it can write to the notifications table regardless of who triggered the insert

```sql
CREATE OR REPLACE FUNCTION public.notify_admin_on_portal_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $$
DECLARE
  v_assigned_to uuid;
  v_case_number varchar;
  v_client_name varchar;
BEGIN
  -- Only for portal uploads
  IF NEW.file_path IS NULL OR NOT NEW.file_path LIKE 'client-uploads/%' THEN
    RETURN NEW;
  END IF;

  -- Get case assignee and case number
  IF NEW.case_id IS NOT NULL THEN
    SELECT assigned_to, case_number INTO v_assigned_to, v_case_number
    FROM cases WHERE id = NEW.case_id;
  END IF;

  -- Get client name
  IF NEW.client_id IS NOT NULL THEN
    SELECT name INTO v_client_name FROM clients WHERE id = NEW.client_id;
  END IF;

  -- Notify case assignee (or skip if no assignee)
  IF v_assigned_to IS NOT NULL THEN
    INSERT INTO notifications (
      id, tenant_id, user_id, type, title, message,
      related_entity_type, related_entity_id,
      channels, status, read, created_at
    ) VALUES (
      gen_random_uuid(),
      NEW.tenant_id,
      v_assigned_to,
      'document_shared',
      'Client Portal: Document Uploaded',
      format('Client "%s" uploaded "%s" for case %s',
        COALESCE(v_client_name, 'Unknown'),
        NEW.file_name,
        COALESCE(v_case_number, 'N/A')),
      'document', NEW.id,
      ARRAY['in_app'], 'pending', false, now()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_admin_on_portal_upload
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_portal_upload();
```

### No Frontend Changes Needed

The admin `NotificationBell` component already:
- Listens for realtime changes on the `notifications` table
- Displays `document_shared` type notifications with a file icon
- Supports navigation to the related document

## What This Fixes

| Scenario | Before | After |
|----------|--------|-------|
| Client uploads document from portal | No admin notification | Admin (case assignee) sees "Client Portal: Document Uploaded" in bell icon |
| Notification content | N/A | Shows client name, file name, and case number |
| Realtime | N/A | Admin sees notification instantly via existing realtime subscription |

## Files Modified

| File / Area | Change |
|-------------|--------|
| SQL Migration | New `notify_admin_on_portal_upload` trigger function and trigger on `documents` table |

No frontend code changes required -- the existing notification infrastructure handles the rest.

