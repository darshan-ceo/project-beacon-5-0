

# Fix: Three Inquiry Module Issues

## Issue 1: Owner Filter Shows Non-Team Profiles

**Root Cause**: The LeadsPage fetches owners from the `profiles` table, which contains ALL users who have ever signed up (including test accounts like "345", "a35", "aaa"). The correct source is the `employees` table, which contains only actual team members for the tenant.

**Fix** (in `src/pages/LeadsPage.tsx`):
- Replace the `profiles` query with an `employees` query filtered by `tenant_id` and `status = 'active'`
- Use `full_name` from the `employees` table

```typescript
// Before: fetches ALL profiles
const { data: ownersData } = useQuery({
  queryKey: ['lead-owners'],
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    return data || [];
  },
});

// After: fetches only active employees for the tenant
const { data: ownersData } = useQuery({
  queryKey: ['lead-owners'],
  queryFn: async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name');
    return data || [];
  },
});
```

---

## Issue 2: Log Activity Shows Same Fields for All Tabs

**Root Cause**: The `AddActivityModal` renders identical fields (Subject, Description, Outcome, Next Action, Due Date) regardless of the selected activity type. Each type should show contextually relevant fields.

**Fix** (in `src/components/crm/AddActivityModal.tsx`):
- Add conditional field rendering based on `activityType`:
  - **Call**: Subject (as "Call With/About"), Description ("Call Notes"), Outcome ("Call Outcome"), Next Action + Due Date
  - **Email**: Subject ("Email Subject"), Description ("Email Summary"), no Outcome field
  - **Meeting**: Subject ("Meeting Topic"), Description ("Meeting Notes"), Outcome ("Meeting Outcome"), Next Action + Due Date
  - **Note**: No Subject field, Description only (as "Note"), no Outcome, no Next Action
  - **Task**: Subject ("Task Title"), Description ("Task Details"), Due Date only (no Outcome, no Next Action)

Each tab will show only the fields relevant to that activity type, with appropriate labels and placeholders.

---

## Issue 3: Edit Lead Causes Blank Screen

**Root Cause**: The `EditLeadModal` uses a `Dialog` (via `ModalLayout`) which is rendered inside the `LeadDetailDrawer` (a `LargeSlideOver`, also a `Dialog`). Opening a nested Dialog causes React/Radix focus-trap conflicts that result in a blank screen.

**Fix** (in `src/components/crm/LeadDetailDrawer.tsx`):
- Move the `EditLeadModal` rendering outside of the `LargeSlideOver` by restructuring the component so the modal only renders when the drawer is conceptually "backgrounded"
- Alternatively, render `EditLeadModal` with a portal approach or close the drawer before opening the edit modal

The simplest reliable fix: close the slide-over when "Edit Lead" is clicked, open the edit modal independently, and re-open the drawer on edit completion/cancel. This avoids nested dialog conflicts entirely.

Additionally, rename the button label from "Edit Lead" to "Edit Inquiry" for terminology consistency.

---

## Files to Modify

1. **`src/pages/LeadsPage.tsx`** -- Change owner query from `profiles` to `employees`
2. **`src/components/crm/AddActivityModal.tsx`** -- Add conditional field rendering per activity type
3. **`src/components/crm/LeadDetailDrawer.tsx`** -- Fix nested dialog issue for Edit modal; rename button label

