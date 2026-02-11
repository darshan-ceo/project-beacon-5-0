

# Fix: Edit Inquiry Double-Click + Missing Owner Filter

## Issue 1: Edit Inquiry Requires Two Clicks

**Root Cause**: When "Edit Inquiry" is clicked, the drawer calls `onClose()` first, then opens the edit modal after 200ms. However, `onClose()` in LeadsPage sets `selectedLead` to `null` (line 161-164). By the time the edit modal opens, `currentLead` is already null, so `EditLeadModal` receives `lead={null}` and returns nothing. On the second click, the lead gets re-selected, and the modal finally works.

**Fix** (in `src/components/crm/LeadDetailDrawer.tsx`):
- Remove the `onClose()` call before opening the edit modal. Instead, just open the edit modal directly without closing the drawer first.
- The `EditLeadModal` is already rendered outside the `LargeSlideOver`, so we just need to ensure the drawer stays open (keeping `currentLead` alive) while the edit modal is shown on top.
- Alternatively, close only the visual drawer without nullifying the lead reference.

The simplest fix: stop calling `onClose()` before opening edit. Just open the modal directly:

```typescript
onClick={() => setIsEditModalOpen(true)}
```

Since `EditLeadModal` is rendered outside the `LargeSlideOver` component (it's a sibling, not a child), it won't create nested dialog conflicts. The previous fix over-corrected by closing the drawer.

---

## Issue 2: Owner Filter Not Appearing

**Root Cause**: The database stores employee status as `"Active"` (capitalized), but the query filters with `.eq('status', 'active')` (lowercase). Since Postgres string comparison is case-sensitive, zero rows are returned. The `LeadFilters` component conditionally hides the Owner dropdown when `ownerOptions.length === 0`.

**Fix** (in `src/pages/LeadsPage.tsx`):
- Change the filter to match the actual database value: `.eq('status', 'Active')` (capitalized) or use `.ilike('status', 'active')` for case-insensitive matching.

```typescript
const { data, error } = await supabase
  .from('employees')
  .select('id, full_name')
  .ilike('status', 'active')   // case-insensitive match
  .order('full_name');
```

Additionally, the filter dropdown currently shows the raw owner ID as the button label instead of the owner name. Update the button display to show the selected owner's name.

---

## Files to Modify

1. **`src/components/crm/LeadDetailDrawer.tsx`** -- Remove the `onClose()` + `setTimeout` pattern; open edit modal directly
2. **`src/pages/LeadsPage.tsx`** -- Fix case-sensitive status filter from `'active'` to case-insensitive match

