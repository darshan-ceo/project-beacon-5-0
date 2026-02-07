
## What “Converted” means in the system (and why HTSPL is not visible)

### Intended meaning
In this app, an Inquiry becoming **Converted** should mean:
1) A **Client** record is created in the database (e.g., “HTSPL”)  
2) The original Inquiry-person contact is **linked to that client** (`client_contacts.client_id`)  
3) The inquiry status is set to **converted** (`lead_status='converted'`) and `converted_at` is set

### What is happening now (your case)
Your conversion actually worked in the backend:
- A client **HTSPL** exists in the database
- The contact **Manan Shah** is linked to that client
- The inquiry is marked **converted**

But the **Clients Master screen** is driven from the app’s in-memory “master data” store (`state.clients`), which only refreshes on:
- full page reload, or
- realtime updates

Right now, **realtime updates for the `clients` table are not enabled**, so the UI won’t auto-add the newly created client to `state.clients` immediately after conversion.

That’s why you see “successfully converted / onboarded”, but the Clients module still shows the old count (17) and can’t find HTSPL.

## Immediate workaround (until the fix is shipped)
- Do a browser **hard refresh** (Ctrl+Shift+R) and then search “HTSPL” again on Clients.
  - This forces a full master-data reload and the client will appear.

## Best approach (recommended fix)
We’ll implement a 2-layer fix so this never happens again:

### Layer A (instant fix in the same session): Refresh client master data after conversion
After a successful “Onboard as Client”:
- programmatically reload clients into the app state (so it appears immediately in Clients Master without refreshing the page)

Implementation approach:
- In `LeadsPage.tsx` (inside `handleConversionSuccess`) or in `ConvertToClientModal.tsx` success handler:
  - call the existing `reloadClients()` helper from `useImportRefresh()`
  - this fetches clients from the database and dispatches `ADD_CLIENT` for any missing ones

Why this is safe:
- `reloadClients()` already deduplicates by ID, so it won’t create duplicates.

### Layer B (proper long-term fix across tabs/devices): Enable realtime updates for clients
Enable realtime publication for `public.clients` so that:
- when any client is created/updated, all open sessions get the update and the UI store updates automatically via `useRealtimeSync`.

Database change:
- Add a migration to run:
  - `ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;`
- Use a safe “if not exists” guard (via `pg_publication_tables`) so the migration is idempotent.

### Small related bugfix (helps Contacts module dropdowns)
`ContactsMasters.tsx` currently loads clients using:
- `.eq('status', 'Active')`

But the database stores status as lowercase (default is `'active'`), so this query can silently miss clients.
We’ll update it to:
- filter using `'active'` (and also add tenant filtering consistent with the rest of the app)

## Files / changes we will make

### 1) Frontend: ensure Clients list updates right after conversion
- **File**: `src/pages/LeadsPage.tsx`
  - Import and use `useImportRefresh()`
  - In `handleConversionSuccess`, call `reloadClients()` in addition to refetching inquiries/stats

(Alternative/optional enhancement)
- **File**: `src/components/crm/ConvertToClientModal.tsx`
  - Also call `reloadClients()` there so any future reuse of the modal still updates client masters.

### 2) Backend: enable realtime for clients table
- **File**: new migration under `supabase/migrations/*_enable_realtime_clients.sql`
  - Add `public.clients` to realtime publication with a catalog-check guard.

### 3) Contacts module dropdown reliability
- **File**: `src/components/contacts/ContactsMasters.tsx`
  - Fix `loadClients()` to query `status='active'` (and filter by tenant) so newly onboarded clients show up in the “Client” dropdown lists too.

## How we will verify (end-to-end tests)
1) Go to **Inquiries** → choose an inquiry → **Onboard as Client** → create “HTSPL”
2) Without refreshing the page, go to **Clients** → search “HTSPL”
   - Expected: HTSPL appears immediately
3) Open two tabs:
   - Tab A: convert an inquiry to a new client
   - Tab B: stay on Clients list
   - Expected: Tab B updates automatically (realtime)
4) Go to **Contacts** and verify the “Client” filter/dropdown includes HTSPL.

## Notes / risk management
- This fix does not change your data model; it only ensures the UI store stays in sync.
- Enabling realtime for `clients` is aligned with the existing `useRealtimeSync` code (it already subscribes to `clients`, but the database wasn’t publishing those events yet).
