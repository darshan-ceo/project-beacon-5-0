
# Fix "What's New" Showing No Updates

## Problem
The "What's New" panel shows "No updates in this period" because all entries in `public/help/changelog.json` are dated in **January 2025**, but today's date is **January 27, 2026**. The date filter (default: last 30 days) excludes entries older than ~30 days.

## Root Cause
- Current date: **2026-01-27**
- Changelog entries: All dated **2025-01-15 to 2025-01-26** (over 1 year old)
- Date filter logic in `helpDiscoveryService.ts` line 543:
  ```typescript
  entries = this.changelog.filter(e => new Date(e.releaseDate) > cutoffDate);
  ```
- Cutoff for "Last 30 days": ~2025-12-28
- Result: 0 entries pass the filter

## Solution
Update `public/help/changelog.json` with current 2026 dates so entries appear in the "What's New" panel.

## Changes

### File: `public/help/changelog.json`
Update all `releaseDate` and `lastUpdated` fields to 2026 dates:

| Entry | Current Date | New Date |
|-------|--------------|----------|
| help-discovery-hub | 2025-01-26 | 2026-01-26 |
| operational-help | 2025-01-25 | 2026-01-25 |
| access-roles-help | 2025-01-24 | 2026-01-24 |
| master-data-help | 2025-01-23 | 2026-01-23 |
| task-automation-v2 | 2025-01-22 | 2026-01-22 |
| ai-assistant-enhancements | 2025-01-20 | 2026-01-20 |
| hearing-calendar-sync | 2025-01-18 | 2026-01-18 |
| sla-dashboard | 2025-01-15 | 2026-01-15 |

Also update the top-level `lastUpdated` field from `2025-01-26` to `2026-01-27`.

## Optional Enhancement
Add a new entry for the Task RBAC sub-module permissions we just implemented:

```json
{
  "id": "2026-01-27-task-rbac-submodules",
  "title": "Granular Task Management Permissions",
  "description": "New RBAC controls for Task sub-modules: Templates, Automation, Escalation, and AI Assistant tabs now have separate permission controls.",
  "releaseDate": "2026-01-27",
  "category": "feature",
  "module": "tasks",
  "roles": ["Admin", "Partner", "Manager"],
  "highlights": [
    "Separate permissions for Templates, Automation, Escalation, AI tabs",
    "Manager access to Templates without Admin privileges",
    "Admin-only access to system-critical configuration tabs",
    "Visual lock indicators on restricted tabs"
  ],
  "learnMoreUrl": "/access-roles"
}
```

## Expected Result
After the update, the "What's New" tab will show 8-9 entries with:
- Proper "8 unread" badge
- All recent features visible
- Date labels showing "Jan 26, 2026", etc.
