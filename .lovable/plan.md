

# Phase 2: Lead Pipeline Page Implementation

## Overview

This phase creates a dedicated **Lead Pipeline Page** with a Kanban board for visual lead management, table view toggle, and pipeline statistics. We'll reuse existing patterns from `TaskBoard.tsx` and `EnhancedDashboard.tsx` for drag-and-drop functionality.

---

## Implementation Summary

| Component | Description |
|-----------|-------------|
| `LeadsPage.tsx` | Main page with view toggle and stats |
| `LeadPipeline.tsx` | Kanban board container |
| `LeadCard.tsx` | Individual lead card for pipeline |
| `LeadFilters.tsx` | Filter bar component |
| `LeadStats.tsx` | Pipeline metrics header |
| Route & Sidebar | Navigation integration |

---

## Step 1: Create LeadStats Component

**File:** `src/components/crm/LeadStats.tsx`

Pipeline summary cards showing:
- Total Leads in pipeline
- Total Pipeline Value (₹)
- Conversion Rate (%)
- Average Deal Value

Uses the existing `leadService.getPipelineStats()` method.

---

## Step 2: Create LeadCard Component

**File:** `src/components/crm/LeadCard.tsx`

Individual lead card for Kanban columns:
- Contact name and designation
- Lead source badge
- Expected value display
- Days since last activity
- Score indicator (0-100)
- Quick action dropdown (View, Edit Status, Convert)

Reuses card styling patterns from `TaskBoard.tsx`:
- Priority color coding → Lead score color coding
- Drag-and-drop support via native HTML5 drag events

---

## Step 3: Create LeadFilters Component

**File:** `src/components/crm/LeadFilters.tsx`

Filter bar with:
- Search input (name, designation)
- Lead Source dropdown
- Owner dropdown (assigned employee)
- Score range slider (optional)
- Date range picker for expected close date

Uses `FilterDropdown` component pattern from `src/components/ui/filter-dropdown.tsx`.

---

## Step 4: Create LeadPipeline Component

**File:** `src/components/crm/LeadPipeline.tsx`

Kanban board container:
- Columns for each `LeadStatus`: New → Contacted → Qualified → Proposal Sent → Negotiation → Won → Lost
- Drag-and-drop between columns (triggers `leadService.updateLeadStatus`)
- Column headers with count and total value
- Empty state handling per column

Pattern adapted from `TaskBoard.tsx`:

```text
┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────────┐  ┌─────┐  ┌──────┐
│   NEW   │  │CONTACTED │  │ QUALIFIED │  │ PROPOSAL │  │NEGOTIATION │  │ WON │  │ LOST │
│ 5 leads │  │ 3 leads  │  │ 2 leads   │  │ 1 lead   │  │  1 lead    │  │  8  │  │  2   │
│  ₹10L   │  │   ₹8L    │  │   ₹5L     │  │   ₹2L    │  │   ₹3L      │  │₹15L │  │      │
├─────────┤  ├──────────┤  ├───────────┤  ├──────────┤  ├────────────┤  ├─────┤  ├──────┤
│ [Card]  │  │ [Card]   │  │  [Card]   │  │ [Card]   │  │  [Card]    │  │ ... │  │ ...  │
│ [Card]  │  │ [Card]   │  │           │  │          │  │            │  │     │  │      │
└─────────┘  └──────────┘  └───────────┘  └──────────┘  └────────────┘  └─────┘  └──────┘
```

---

## Step 5: Create LeadsPage

**File:** `src/pages/LeadsPage.tsx`

Main page component:
- Header with title, view toggle (Kanban/Table), and "+ New Lead" button
- `LeadStats` component for pipeline metrics
- `LeadFilters` component for filtering
- Conditional rendering: `LeadPipeline` (Kanban) or table view
- Integration with `useQuery` for data fetching via `leadService.getLeads()`
- Refresh functionality

---

## Step 6: Add Route to App.tsx

**Modification:** `src/App.tsx`

Add protected route:

```tsx
import { LeadsPage } from '@/pages/LeadsPage';

// Inside Routes...
<Route path="/leads" element={
  <ProtectedRoute>
    <AdminLayout>
      <LeadsPage />
    </AdminLayout>
  </ProtectedRoute>
} />
```

---

## Step 7: Add Sidebar Navigation

**Modification:** `src/components/layout/Sidebar.tsx`

Add "Leads" menu item under CLIENTS section:

```tsx
{
  icon: Target, // from lucide-react
  label: 'Leads',
  href: '/leads',
  roles: ['Admin', 'Partner', 'Partner/CA', 'Staff', 'Advocate', 'Manager', 'Ca']
}
```

Position: After "Contacts" in the CLIENTS section.

---

## Technical Details

### Data Flow

```text
LeadsPage
├── useQuery → leadService.getLeads(filters)
├── useQuery → leadService.getPipelineStats()
│
├── LeadStats (displays pipeline metrics)
├── LeadFilters (manages filter state)
└── LeadPipeline
    └── LeadCard[] (grouped by status)
        └── onDrop → leadService.updateLeadStatus()
```

### State Management

- **Filters**: Local state in `LeadsPage`, passed down to `LeadFilters`
- **Leads Data**: TanStack Query with `queryKey: ['leads', filters]`
- **Pipeline Stats**: Separate query with `queryKey: ['lead-pipeline-stats']`
- **Drag State**: Local state in `LeadPipeline` (like `TaskBoard.tsx`)

### Reused Patterns

| Pattern | Source | Usage |
|---------|--------|-------|
| Kanban columns | `TaskBoard.tsx` | Lead pipeline structure |
| Card styling | `TaskBoard.tsx` | Lead card design |
| Filter bar | `UnifiedTaskSearch.tsx` | Lead filters |
| Stats cards | `EnhancedDashboard.tsx` | Pipeline metrics |
| DnD sensors | `EnhancedDashboard.tsx` | Optional dnd-kit upgrade |

### Color Coding by Lead Score

| Score Range | Color | Badge |
|-------------|-------|-------|
| 80-100 | Green | Hot |
| 50-79 | Amber | Warm |
| 25-49 | Blue | Cool |
| 0-24 | Gray | Cold |

---

## Files to Create

| File | Lines (Est.) |
|------|--------------|
| `src/components/crm/LeadStats.tsx` | ~100 |
| `src/components/crm/LeadCard.tsx` | ~120 |
| `src/components/crm/LeadFilters.tsx` | ~80 |
| `src/components/crm/LeadPipeline.tsx` | ~200 |
| `src/pages/LeadsPage.tsx` | ~180 |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/leads` route |
| `src/components/layout/Sidebar.tsx` | Add Leads nav item |

---

## RBAC Considerations

The leads page will use existing RBAC patterns:
- Route mapped to `leads` module (or reuse `contacts` module)
- `hasPermission('leads', 'read')` for view access
- `hasPermission('leads', 'update')` for drag-drop status changes
- `hasPermission('leads', 'create')` for "New Lead" button

If `leads` module isn't configured in RBAC, we can map to `contacts` module since leads are contacts.

---

## Outcome

After implementation:
1. Users can navigate to `/leads` from sidebar
2. See Kanban pipeline with all leads organized by status
3. Drag leads between columns to update status
4. Filter by source, owner, score
5. View pipeline metrics (total value, conversion rate)
6. Click lead cards to open detail drawer (Phase 3)

