
## What’s happening now (why it “worked once, then broke again”)

Your **past-date validation fix is working** (it no longer blocks saving outcomes for hearings whose date didn’t change).

The new error you’re seeing (“Failed to record hearing outcome. Please try again.”) is coming from a different place:

- Outcome saving uses `hearingsService.recordOutcome(...)`
- That method currently calls: `PUT /api/hearings/:id` via `apiService.put(...)`
- In this Lovable app, there is **no server route** for `/api/hearings/...` (it returns the app’s HTML instead of JSON)
- Because of that, the outcome request fails and the UI shows the “Failed to record hearing outcome” toast

So: hearing “update” can still show success (it uses the database adapter), but the “record outcome” step fails (it uses the missing `/api` route).

---

## Goal

Make “Record/Update Outcome” persist correctly for hearings (including past hearings), using the same working database persistence approach as the rest of the Hearings module, and show meaningful errors if anything fails.

---

## Implementation plan (code + backend)

### 1) Fix outcome persistence path (stop using `/api/hearings`)
**File:** `src/services/hearingsService.ts`  
**Change:** Refactor `recordOutcome()` to persist using the database adapter (StorageManager) instead of `apiService.put(...)`.

- Use:
  - `const storage = storageManager.getStorage()`
  - `await storage.update('hearings', id, updateData)`
- This aligns with `createHearing()` and `updateHearing()` which already use the adapter successfully.

**Why this fixes it:** it removes the dependency on a non-existent `/api` endpoint.

---

### 2) Make DB columns match what the UI captures (Outcome Notes)
Right now the UI collects “Outcome Notes” (`outcomeText`), and the code tries to store it as `outcome_text`, but the database table `hearings` currently does **not** have an `outcome_text` column.

**Backend change (migration):**
- Add `outcome_text` column (nullable text) to `hearings`.

This avoids silent drops of outcome notes and prevents future update errors when we persist outcome notes properly.

---

### 3) Ensure date types are consistent for `next_hearing_date`
The DB column `next_hearing_date` is a timestamp. The UI often provides a `YYYY-MM-DD` string.

**Change in `recordOutcome()` mapping:**
- Convert `nextHearingDate` into an ISO timestamp consistently (e.g., midnight UTC or local midnight converted to UTC) to avoid timezone confusion and keep consistent storage.
- Keep it nullable when not provided.

---

### 4) Make error messages actionable (no more generic “Please try again”)
**Files:**
- `src/services/hearingsService.ts`
- `src/utils/errorUtils.ts` (already exists)

**Change:**
- Use `getErrorMessage(error)` in the `catch` block and show that message in the toast (examples: permission issue, missing column, RLS denial, etc.).

This will immediately reveal the real reason if any backend rule blocks saving.

---

### 5) Prevent partial-state overwrites after outcome update
After updating outcome in DB:
- Fetch the updated hearing record back from storage (`getById`)
- Dispatch a merged, complete payload (following your existing “merge reducer” pattern) so the UI always reflects the DB state.

This avoids situations where outcome appears saved, then disappears because a partial update overwrote it.

---

## Testing / validation checklist (end-to-end)

1. Open a hearing dated in the past → Edit → change only Outcome → Save  
   - Expected: no past-date error; outcome saves successfully; success toast shown.
2. Refresh the page and re-open the same hearing  
   - Expected: outcome + outcome notes persist after refresh.
3. Set outcome to “Adjournment” and pick “Next Hearing Date”  
   - Expected: next hearing date saves; if auto-create next hearing is enabled, the next hearing is created.
4. Try the same flow from:
   - Hearings list modal (“Edit Hearing”)
   - Hearing drawer (if used)
5. Confirm failures (if any) show a specific message (permissions/validation), not generic.

---

## Scope / files that will change

### Frontend / service logic
- `src/services/hearingsService.ts`
  - Refactor `recordOutcome()` to use StorageManager adapter instead of `/api/hearings`
  - Normalize `next_hearing_date`
  - Improve error messaging

### Backend schema change (Lovable Cloud migration)
- Add `outcome_text` column to `public.hearings` table (nullable)

---

## Risks and mitigations

- **Risk:** Adding a new column requires a schema migration.
  - Mitigation: It’s additive (safe), nullable, and won’t break existing rows.
- **Risk:** Timezone confusion for `next_hearing_date`.
  - Mitigation: enforce one consistent conversion method in `recordOutcome()`.

---

## Optional follow-up improvements (not required for the fix)
- Make “Outcome Notes” visually distinct from general “Notes” (pre-hearing) everywhere outcomes are displayed.
- Add a small “Outcome saved at …” indicator to confirm persistence.

