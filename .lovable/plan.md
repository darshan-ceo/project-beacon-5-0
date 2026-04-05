

## Plan: Remove DashboardStatsBar from Practice Analytics

The horizontal stats bar showing "Active Cases: 9, Active Clients: 24, Pending Tasks: 15, Upcoming Hearings: 0" duplicates information already displayed in the widget cards below it (Open Cases, Active Clients, etc.).

### Change

**File: `src/components/dashboard/EnhancedDashboard.tsx`**
- Remove the `DashboardStatsBar` import (line 17)
- Remove the entire `motion.div` block wrapping `<DashboardStatsBar />` (lines 232-240)

No other files need changes. The `DashboardStatsBar.tsx` component file can remain in the codebase (unused) or be deleted for cleanliness.

