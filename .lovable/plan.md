

# Simplify Sidebar: GST Litigation CRM Optimized Grouping

## Current State (Too Many Sections)

| # | Current Section | Items |
|---|----------------|-------|
| 1 | MONITOR | Dashboard, Compliance Dashboard |
| 2 | LITIGATION | Case Management, Hearings, Task Management |
| 3 | CLIENTS | Clients, Contacts, Inquiries |
| 4 | DOCUMENTS | Document Management |
| 5 | ANALYTICS | Reports |
| 6 | SUPPORT | Help & Knowledge Base, User Profile |
| 7 | CONFIGURATION | Legal Authorities, Judge Masters, Employee Masters, Statutory Deadlines |
| 8 | ADMINISTRATION | System Settings, Access & Roles |
| 9 | DEVELOPER | Dev Mode Dashboard, QA Dashboard, GST Debug |

**Problems**: 9 sections, some with only 1 item, generic naming not aligned with legal practice workflow.

## Proposed Structure (5 Sections for Regular Users)

| # | New Section | Items | Rationale |
|---|------------|-------|-----------|
| 1 | OVERVIEW | Dashboard, Compliance | Quick daily snapshot -- no section collapse needed |
| 2 | PRACTICE | Cases, Hearings, Tasks, Documents | Core litigation workflow in one group |
| 3 | CRM | Clients, Contacts, Inquiries | Client relationship pipeline |
| 4 | INSIGHTS | Reports | Analytics rebranded for legal context |
| 5 | MASTERS | Legal Authorities, Judges, Statutory Deadlines, Employees | All reference/config data under one label lawyers understand |
| 6 | SETTINGS (Admin only) | System Settings, Access & Roles | Merged Administration into simpler name |
| -- | Help & Profile | Moved to sidebar footer (icon-only area) | Always accessible, doesn't need a section |
| -- | DEVELOPER (conditional) | Unchanged | Only visible when env flags are on |

**Key changes:**
- 9 sections reduced to 5-6 (depending on role)
- "LITIGATION" + "DOCUMENTS" merged into "PRACTICE" (lawyers think of documents as part of case work)
- "CONFIGURATION" renamed to "MASTERS" (familiar term in Indian legal/accounting software)
- "SUPPORT" section eliminated -- Help and Profile moved to footer icons
- "ADMINISTRATION" renamed to "SETTINGS"
- Shorter, domain-aligned section names

## What Changes

### File: `src/components/layout/Sidebar.tsx`

1. **Restructure `sidebarSections` array** -- consolidate from 8 sections to 5:
   - OVERVIEW (Dashboard + Compliance)
   - PRACTICE (Cases + Hearings + Tasks + Documents)
   - CRM (Clients + Contacts + Inquiries)
   - INSIGHTS (Reports) -- collapsed by default, single item
   - MASTERS (Legal Authorities + Judges + Statutory Deadlines + Employees) -- collapsed by default

2. **Rename ADMINISTRATION to SETTINGS** and keep it admin-only

3. **Move Help and Profile to sidebar footer** as icon buttons (always visible, no section needed)

4. **Shorten item labels**:
   - "Case Management" becomes "Cases"
   - "Task Management" becomes "Tasks"
   - "Document Management" becomes "Documents"
   - "Help & Knowledge Base" becomes Help icon in footer
   - "Legal Authorities" becomes "Authorities"
   - "Employee Masters" becomes "Employees"
   - "Statutory Deadlines" becomes "Deadlines"

### File: `src/hooks/useModuleAccess.ts`

Update `MODULE_ROUTE_MAPPING` keys to match new section naming (cosmetic -- existing route paths unchanged).

### File: `src/hooks/useModulePermissions.ts`

No changes needed -- route-to-RBAC mappings use paths, not section labels.

## Result

- Sidebar scrolls less, feels focused
- Section names match how GST litigation practitioners think
- Help/Profile always accessible in footer without wasting a section
- All routes and RBAC logic remain intact -- only visual reorganization

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Restructure sections, shorten labels, move Help/Profile to footer |
| `src/hooks/useModuleAccess.ts` | Update section display names in mapping comments |

