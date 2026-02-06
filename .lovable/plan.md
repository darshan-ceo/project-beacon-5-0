
# CRM Module Implementation: Next Steps

## Current State Summary

### Completed (Phase 1 Foundation - Partial)

| Component | Status |
|-----------|--------|
| Database migration (CRM columns + lead_activities table) | Done |
| Type definitions (`src/types/lead.ts`) | Done |
| Lead Service (`src/services/leadService.ts`) | Done |
| Lead Conversion Service (`src/services/leadConversionService.ts`) | Done |

### Remaining Work

---

## Phase 1B: Contacts Module Enhancement (Priority)

### 1. Add Lead Status Column to Contacts Table

Modify `ContactsMasters.tsx` to display lead status for standalone contacts:

- Add "Lead Status" column to the table (after Roles column)
- Display status badge with color coding from `LEAD_STATUS_CONFIG`
- Show "—" for client-linked contacts (not leads)

### 2. Add "Mark as Lead" Action

Add new row action in the contacts dropdown menu:

- Show "Mark as Lead" option for standalone contacts (client_id = null)
- Show "Remove Lead Status" option for existing leads
- Trigger `leadService.markAsLead()` with status selector modal

### 3. Add Lead Stats to Dashboard

Update stats cards in `ContactsMasters.tsx`:

- Replace "Active Contacts" card with "Active Leads" showing lead pipeline count
- Add visual indicator for leads requiring follow-up

### 4. Create MarkAsLeadModal Component

New component: `src/components/crm/MarkAsLeadModal.tsx`

- Lead source selector (referral, website, cold_call, etc.)
- Initial status (defaults to 'new')
- Expected value input (optional)
- Expected close date picker (optional)

---

## Phase 2: Lead Pipeline Page

### 1. Create LeadsPage

New page: `src/pages/LeadsPage.tsx`

- Kanban pipeline view (reusing patterns from TaskBoard.tsx)
- Table view toggle
- Pipeline stats header

### 2. Create Lead Pipeline Components

New files in `src/components/crm/`:

```text
LeadPipeline.tsx       - Main pipeline container
LeadCard.tsx           - Individual lead card for Kanban
LeadFilters.tsx        - Filter bar (status, source, owner)
LeadStats.tsx          - Pipeline metrics header
```

### 3. Add Route and Navigation

- Add route `/leads` in `App.tsx`
- Add "Leads" menu item to Sidebar under CLIENTS section
- Icon: `Target` from lucide-react

---

## Phase 3: Lead Detail and Conversion

### 1. LeadDetailDrawer

New component: `src/components/crm/LeadDetailDrawer.tsx`

- Contact information section (existing data)
- Lead metadata (source, score, expected value)
- Status selector with quick change
- Activity timeline
- Conversion button (when eligible)

### 2. LeadActivityTimeline

New component: `src/components/crm/LeadActivityTimeline.tsx`

- Chronological activity list
- Activity type icons (call, email, meeting, note)
- Add activity form (inline or modal)

### 3. ConvertToClientModal

New component: `src/components/crm/ConvertToClientModal.tsx`

- Pre-filled from contact data
- Client type selector (individual/company)
- GSTIN, PAN inputs
- Optional "Create First Case" checkbox with case title input
- Confirmation step with audit summary

---

## Implementation Order (Recommended)

### Immediate Next Step: Phase 1B

```text
Step 1: Update ContactsMasters.tsx
        - Add lead_status column display
        - Add "Mark as Lead" row action
        - Update stats cards

Step 2: Create MarkAsLeadModal.tsx
        - Source/status/value form
        - Connect to leadService.markAsLead()

Step 3: Add lead filters to UnifiedContactSearch.tsx
        - Lead status filter dropdown
        - Lead source filter
```

### Following Steps: Phase 2

```text
Step 4: Create LeadsPage.tsx with basic pipeline

Step 5: Create LeadPipeline.tsx (Kanban view)
        - Reuse DND patterns from TaskBoard.tsx
        - Status columns with drag-drop

Step 6: Add /leads route and sidebar nav
```

### Final Steps: Phase 3

```text
Step 7: Create LeadDetailDrawer.tsx

Step 8: Create LeadActivityTimeline.tsx

Step 9: Create ConvertToClientModal.tsx
        - Full conversion workflow
        - Integration with clientsService
```

---

## Technical Considerations

### Existing Patterns to Reuse

| Pattern | Source | Usage |
|---------|--------|-------|
| Kanban board | `TaskBoard.tsx` | Lead pipeline columns |
| DND kit | `EnhancedDashboard.tsx` | Drag-drop lead status |
| Adaptive forms | `ContactModal.tsx` | Lead detail drawer |
| Service pattern | `leadService.ts` | Already implemented |

### RLS Inheritance

Lead data inherits existing `client_contacts` RLS policies:

- Owner sees own leads
- Team sees team leads (based on data_scope)
- Admin sees all

No additional RLS migrations needed.

### Type Safety

The `Lead` type extends contact fields with CRM metadata. TypeScript casts (`as unknown as Lead`) are used for Supabase compatibility until types are regenerated.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/contacts/ContactsMasters.tsx` | Modify - add lead columns |
| `src/components/contacts/UnifiedContactSearch.tsx` | Modify - add lead filters |
| `src/components/crm/MarkAsLeadModal.tsx` | Create |
| `src/components/crm/LeadPipeline.tsx` | Create |
| `src/components/crm/LeadCard.tsx` | Create |
| `src/components/crm/LeadFilters.tsx` | Create |
| `src/components/crm/LeadStats.tsx` | Create |
| `src/components/crm/LeadDetailDrawer.tsx` | Create |
| `src/components/crm/LeadActivityTimeline.tsx` | Create |
| `src/components/crm/ConvertToClientModal.tsx` | Create |
| `src/pages/LeadsPage.tsx` | Create |
| `src/App.tsx` | Modify - add /leads route |
| `src/components/layout/Sidebar.tsx` | Modify - add Leads nav item |

