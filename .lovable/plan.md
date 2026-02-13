

# Fix: Client Portal Notifications Not Working

## Problems Found

Three distinct issues are preventing notifications from appearing in the Client Portal:

### 1. Wrong Supabase Client (Primary Issue)
`ClientNotifications.tsx` imports from `supabase` (the admin client) instead of `portalSupabase` (the portal client). Since the portal user authenticates via `portalSupabase`, the `auth.uid()` on the regular `supabase` client returns null. The RLS policies on `client_notifications` check `auth.uid()` to verify the portal user, so all queries silently return empty results.

### 2. Hearing Trigger Case-Sensitivity Mismatch
The database trigger `notify_client_on_hearing` checks `NEW.status = 'Scheduled'` (capital S), but hearings are being saved with `status = 'scheduled'` (lowercase). This means the trigger never fires, so no notification row is ever created.

### 3. No Document Upload Trigger
There is no database trigger to create a client notification when a document is uploaded (either by admin or from the portal). The notification infrastructure exists, but nobody inserts into `client_notifications` when documents are added.

## Solution

### Fix 1: Switch to Portal Supabase Client
**File: `src/components/portal/ClientNotifications.tsx`**

Replace the import of `supabase` with `portalSupabase`:
```typescript
// Before
import { supabase } from '@/integrations/supabase/client';

// After
import { portalSupabase } from '@/integrations/supabase/portalClient';
```

Update all four references (`fetchNotifications`, realtime subscription, `markAsRead`, `markAllAsRead`) from `supabase` to `portalSupabase`.

### Fix 2: Database Migration -- Fix Hearing Trigger + Add Document Trigger

A single SQL migration with two changes:

**a) Fix the case-sensitivity in the hearing trigger:**
```sql
-- Change: NEW.status = 'Scheduled'  -->  lower(NEW.status) = 'scheduled'
```

**b) Add a new trigger on the `documents` table** to notify the client when a document is inserted for their case:
```sql
CREATE FUNCTION notify_client_on_document()
  -- Looks up client_id from cases table via NEW.case_id
  -- Calls create_client_notification() with type 'document'

CREATE TRIGGER trigger_notify_client_document
  AFTER INSERT ON documents
  FOR EACH ROW EXECUTE FUNCTION notify_client_on_document();
```

## Technical Details

| File / Area | Change |
|-------------|--------|
| `src/components/portal/ClientNotifications.tsx` | Switch from `supabase` to `portalSupabase` client (4 locations) |
| SQL Migration | Fix `notify_client_on_hearing` to use case-insensitive status comparison |
| SQL Migration | Add `notify_client_on_document` trigger function and trigger on `documents` table |

## What This Fixes

- Portal users will be able to see and interact with their notifications (correct auth context)
- When a hearing is scheduled from the admin panel, a notification will appear in the client portal (trigger actually fires)
- When a document is uploaded from the admin panel, a notification will appear in the client portal (new trigger)
- Realtime subscription will also work since it uses the same client fix
- Mark as read will work since it uses the same client fix

