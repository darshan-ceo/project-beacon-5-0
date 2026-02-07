
# Implement Table View for Inquiry Tracker

## Overview

Replace the "Table view coming soon" placeholder with a fully functional data table that displays inquiries in a sortable, filterable list format matching the application's existing table patterns.

---

## Technical Implementation

### New File: `src/components/crm/LeadTable.tsx`

Create a new component following the established TaskList.tsx pattern with:

| Feature | Implementation |
|---------|----------------|
| **Columns** | Party Name, Inquiry Type, Status, Source, Phone, Email, Last Activity, Actions |
| **Sorting** | Click column headers to toggle asc/desc sorting |
| **Row Click** | Opens the LeadDetailDrawer |
| **Actions Menu** | View Details, Onboard as Client (for eligible statuses) |
| **Empty State** | Shows message when no inquiries match filters |
| **Loading State** | Skeleton rows during data fetch |

### Component Structure

```typescript
interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  onViewLead: (lead: Lead) => void;
  onConvertLead: (lead: Lead) => void;
}
```

### Table Columns

| Column | Field | Sortable | Responsive |
|--------|-------|----------|------------|
| Party Name | `name` + `designation` | Yes | Always visible |
| Status | `lead_status` | Yes | Always visible |
| Source | `lead_source` | Yes | Hidden on mobile |
| Contact | `phones` / `emails` | No | Hidden on mobile |
| Last Activity | `last_activity_at` | Yes | Hidden on tablet |
| Actions | - | No | Always visible |

### Integration with LeadsPage.tsx

Update the conditional rendering in LeadsPage.tsx:

```typescript
// Line 168-180: Replace placeholder
{viewMode === 'table' ? (
  <LeadTable
    leads={leads}
    isLoading={isLoadingLeads}
    onViewLead={handleViewLead}
    onConvertLead={handleConvertLead}
  />
) : (
  <LeadPipeline ... />
)}
```

---

## UI/UX Details

### Status Badges
Use existing `LEAD_STATUS_CONFIG` for consistent color coding:
- New: Blue badge
- Follow-up: Amber badge  
- Converted: Green badge
- Not Proceeding: Gray badge

### Source Display
Use `LEAD_SOURCE_OPTIONS` lookup for human-readable source labels.

### Contact Display
- Show primary phone with phone icon
- Show primary email with mail icon
- Truncate long values with tooltip

### Last Activity Column
- Format using `formatDistanceToNow` from date-fns
- Show "No activity" if null

### Actions Dropdown
- Eye icon: "View Details" → opens drawer
- UserCheck icon: "Onboard as Client" → opens conversion modal
- "Onboard as Client" hidden for converted/not_proceeding statuses

---

## Sorting Implementation

Local sorting with state management:

```typescript
type SortField = 'name' | 'lead_status' | 'lead_source' | 'last_activity_at';
type SortDirection = 'asc' | 'desc';

const [sortField, setSortField] = useState<SortField>('last_activity_at');
const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

// Sort using useMemo for performance
const sortedLeads = useMemo(() => {
  return [...leads].sort((a, b) => {
    // Sorting logic per field type
  });
}, [leads, sortField, sortDirection]);
```

---

## Responsive Design

| Breakpoint | Visible Columns |
|------------|-----------------|
| Mobile (<640px) | Party Name, Status, Actions |
| Tablet (640-1024px) | + Source |
| Desktop (>1024px) | + Contact, Last Activity |

Using Tailwind classes: `hidden sm:table-cell`, `hidden md:table-cell`, `hidden lg:table-cell`

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/crm/LeadTable.tsx` | **Create** | New table component |
| `src/pages/LeadsPage.tsx` | **Modify** | Import and render LeadTable |

---

## Empty & Loading States

### Loading State
```tsx
{isLoading && (
  <TableBody>
    {[...Array(5)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
        {/* ... more skeleton cells */}
      </TableRow>
    ))}
  </TableBody>
)}
```

### Empty State
```tsx
{!isLoading && sortedLeads.length === 0 && (
  <TableRow>
    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
      No inquiries found. Create a new inquiry to get started.
    </TableCell>
  </TableRow>
)}
```

---

## Expected Result

After implementation, clicking the "Table" tab will display:

```
+------------+-------------+-----------+-----------------+----------------+----+
| Party Name | Status      | Source    | Contact         | Last Activity  |    |
+------------+-------------+-----------+-----------------+----------------+----+
| ABC Corp   | [New]       | Referral  | 📞 9876543210   | 2 days ago     | ⋮  |
|            | GST Notice  |           | ✉ abc@co.in    |                |    |
+------------+-------------+-----------+-----------------+----------------+----+
| XYZ Ltd    | [Follow-up] | Walk-in   | 📞 9123456780   | 5 hours ago    | ⋮  |
|            | Appeal      |           |                 |                |    |
+------------+-------------+-----------+-----------------+----------------+----+
```

Features:
- Sortable columns with visual sort indicators
- Row hover state with click-to-open detail drawer
- Responsive column visibility
- Consistent styling with other tables in the application
