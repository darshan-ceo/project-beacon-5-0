
## What we verified (mandatory, end-to-end)

### 1) Database verification: notifications table is empty
I executed the required query against the backend:

```sql
select id, user_id, type, title, read, created_at
from public.notifications
order by created_at desc;
```

Result: **0 rows** (confirmed again via `select count(*) from public.notifications;` → **0**).

So the UI is not “missing” records — **there are no notification records being created**.

### 2) Policies are present, RLS is enabled
- `notifications` has RLS enabled (`relrowsecurity=true`).
- Policies currently:
  - SELECT: only `auth.uid() = user_id` (recipient-only visibility)
  - INSERT: `tenant_id = public.get_user_tenant_id()` (tenant-scoped inserts)
  - UPDATE/DELETE: only own notifications

### 3) Runtime evidence: the bell is querying correctly, but gets empty data
From the browser network logs, the app is calling:

`GET /rest/v1/notifications?user_id=eq.<current_user_uuid>...`

and receiving `[]` (200 OK), consistent with “table is empty”.

Also runtime console confirms the notification service realtime subscription initializes successfully:
`[NotificationSystem] initializeRealtimeSubscription success { userId: ... }`

So the **UI fetch path is working**; the missing link is **notification creation**.

---

## Root cause (most likely): insert is being blocked by “RETURNING/SELECT” RLS
In `notificationSystemService.createNotification()`, the insert is done like:

```ts
supabase.from('notifications')
  .insert(notificationData)
  .select()
  .single();
```

Even though the INSERT policy is tenant-scoped (so a manager can insert for another user), the `.select()` forces a `RETURNING *` representation. With the current SELECT policy (`auth.uid() = user_id`), the creator **cannot read** the inserted notification row for another user, so the insert request can fail due to RLS on the RETURNING/SELECT step.

Important: with PostgREST-style inserts, if the “return representation” step is denied, the entire request can fail and the row may not be inserted at all. This perfectly matches what we’re seeing: **0 notification rows**, even after task assignment/hearing scheduling.

---

## Secondary issues that can also prevent notifications from being created
We will verify/fix these too (because you requested “Do NOT assume backend is correct”):

1) **Notification triggers only fire on cross-user events**
   - `tasksService` only sends notification if `assignedToId !== currentUser.id`.
   - `hearingsService` only notifies case assignee if `assigneeId !== currentUser.id`.

If you tested by assigning to yourself (common during admin testing), no notification is supposed to be created. We’ll add explicit logging/UX hints so this doesn’t look “broken”.

2) **Case assignee field name mismatch in hearing notifications**
   - Case objects from storage are transformed to include `assignedTo` (not `assignedToId`).
   - `hearingsService` currently tries `(relatedCase as any)?.assignedToId || assigned_to || assigned_to_id`.
   - If the case object only has `assignedTo`, the assignee lookup can be undefined, preventing notification creation for hearings even when a different assignee exists.

---

## Implementation plan (with explicit runtime verification)

### A) Add “hard proof” runtime logging (temporary, dev-only)
Goal: when a task/hearing triggers a notification attempt, we can see:
- current auth user id
- tenant id (from profiles)
- recipient user id
- insert attempt payload summary (no sensitive data)
- exact backend error message/code if insert fails (42501, etc.)

Changes:
1) `src/services/notificationSystemService.ts`
   - In `createNotification()`:
     - log context `{ contextUserId, tenantId }`
     - log recipient `userId`
     - if insert fails, log **error.code + error.message** (not generic)

2) `src/services/tasksService.ts` and `src/services/hearingsService.ts`
   - Add dev-only logs right before calling `createNotification()` showing:
     - currentUser.id
     - assignedToId / resolvedAssigneeId
     - whether notification will be skipped due to self-assignment

This gives immediate on-screen proof of whether the service is invoked and why it might be skipping.

### B) Fix the RLS/RETURNING problem in createNotification()
Goal: allow tenant-scoped inserts without granting broader SELECT permissions.

Changes in `src/services/notificationSystemService.ts`:
1) Replace `.insert(...).select().single()` with an insert that does **not** require reading the inserted row:
   - Use `.insert(notificationData)` without `.select()`
   - Treat success as “insert succeeded” and return a minimal object (or `null`) safely

Optional enhancement (recommended):
- Provide an `id` ourselves (generate a UUID client-side) so we can return a consistent object without needing RETURNING:
  - Add `id: crypto.randomUUID()` to notificationData
  - Still do `.insert(notificationData)` without `.select()`

This avoids any dependency on SELECT policy and preserves the “recipient-only read” security model.

### C) Fix hearing assignee resolution so notifications actually fire
In `src/services/hearingsService.ts`:
- Expand assignee resolution to include `assignedTo` (camelCase) as a fallback:
  - `const assigneeId = relatedCase.assignedTo || relatedCase.assignedToId || relatedCase.assigned_to || ...`

This ensures “hearing scheduled” notifications are sent to the correct user.

### D) End-to-end verification steps (mandatory)
After implementing A–C, we will verify in this order:

1) **Create a task assigned to another user**
   - In the UI, create a task and assign it to a different employee (not yourself).
   - Expect:
     - Console logs show “notification will send”
     - Insert succeeds (no error log)
     - DB now has at least 1 row in `public.notifications`

2) **DB verification query (same as you requested)**
```sql
select id, user_id, type, title, read, created_at
from notifications
order by created_at desc;
```
   - Expect: newest row(s) exist, user_id matches the assignee

3) **Login as the assignee and open notification bell**
   - Expect:
     - GET /notifications returns non-empty list
     - Bell badge count increments
     - Clicking bell shows the notification

4) **Schedule a hearing for a case assigned to someone else**
   - Expect:
     - New notification row for `hearing_scheduled`
     - Assignee sees it

### E) Optional (only if you want “creator visibility” too)
If you want the creator (manager) to see the notification they sent (without exposing all notifications tenant-wide), we can add a `created_by` column and adjust SELECT policy:
- allow `auth.uid() = user_id OR auth.uid() = created_by`
This is a security-design choice. By default we’ll keep recipient-only visibility.

---

## Files involved
- `src/services/notificationSystemService.ts` (primary fix: insert without RETURNING + better logging)
- `src/services/tasksService.ts` (dev logging + clearer “skipped because self-assignment”)
- `src/services/hearingsService.ts` (assignee id resolution + dev logging)

No further database schema changes are strictly required for the core fix (because we already have the tenant-scoped INSERT policy). The issue is the “insert + returning/select” behavior against recipient-only SELECT policy.

---

## Acceptance criteria
- Creating a task assigned to a different user creates a row in `public.notifications`
- Scheduling a hearing for a case assigned to a different user creates a row in `public.notifications`
- Notification bell shows a non-zero count for the recipient, and list displays the new items
- Logs show explicit reasons for skips (self-assignment) and explicit backend error messages if any failure occurs
