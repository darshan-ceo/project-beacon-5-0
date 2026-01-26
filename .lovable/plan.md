
Context / diagnosis (what’s happening and why)

1) The “404 page flashes” is real navigation to a route that doesn’t exist
- Your screenshot shows the URL `/dashboard` when the 404 appears.
- In routing (src/App.tsx), the dashboard is mounted at `/` (root). There is currently no explicit `<Route path="/dashboard" ...>`, so `/dashboard` correctly renders the NotFound page.
- The onboarding “Dashboard Orientation” step currently navigates to `/dashboard` via `fallbackPath`, causing the 404 flash. After navigation, the tour tries to find its target elements; when it can’t, it shows the “Page is loading…” toast.

2) Tours look like “just popups” because targets don’t exist in the current UI
Shepherd attaches each step to a selector like `[data-tour='something']`. If the selector is missing, Shepherd falls back to a centered modal with the overlay (what you’re seeing).
From the repo:
- `dashboard-tour` in `public/help/tours.json` targets selectors like:
  - `[data-tour='dashboard-header']`, `[data-tour='kpi-cards']`, etc.
  - These selectors do not exist in `EnhancedDashboard` right now (no matching `data-tour` attributes).
- `daily-workflow-tour` targets selectors like:
  - `[data-tour='main-dashboard']`, `[data-tour='task-board']`, `[data-tour='hearing-calendar']`, etc.
  - These also do not exist in the current UI.
- `task-management-tour` has mismatches too (example):
  - tours.json uses `[data-tour='create-task-btn']`
  - the real button in `TaskManagement.tsx` is `data-tour="create-task-button"`
Result: the tour can’t attach → you get narration popups without “background guidance.”

3) Onboarding mapping is currently pointing to the wrong tour IDs and wrong fallback paths
In `src/config/onboardingContentMap.ts`:
- `dashboard-tour` incorrectly maps to `case-management-tour` and `fallbackPath: '/dashboard'`
- `case-operations-tour` incorrectly maps to `case-management-tour` (should map to `case-operations-tour`)
- `daily-workflow-tour` currently maps to `task-management-tour` (should map to `daily-workflow-tour` to match onboarding wording)
These mapping issues explain why your “Dashboard Orientation” shows steps like “Navigate to cases” and “Create new case”.

4) “Mark done” causing 404 is a side-effect of the same root issue
- “Mark done” itself only updates local progress (useLearningProgress.ts → localStorage).
- But because the step card is clickable and the tour fallback path is invalid (/dashboard), users can trigger the same broken navigation flow around that time and it appears tied to “Mark done.”
Once we fix the route + mapping, “Mark done” will not lead to a 404.

Corrective actions (what I will implement next)

A) Fix the route problem (remove the 404 flash)
Goal: ensure any navigation to `/dashboard` never triggers NotFound.
Changes:
1. Add a route alias in `src/App.tsx`:
   - Add `<Route path="/dashboard" element={<ProtectedRoute><AdminLayout><EnhancedDashboard /></AdminLayout></ProtectedRoute>} />`
   - Optionally also add a redirect instead of rendering twice (either is fine; alias is simplest and robust).
2. Update onboarding fallback paths to use canonical routes:
   - Dashboard should use `/` (or keep `/dashboard` once alias exists).
   - Hearings should use `/hearings/calendar` (matches sidebar and is explicit).
   - Access & Roles should use `/access-roles` (because current router uses `/access-roles`).

B) Fix onboarding → tour mapping so “Dashboard Orientation” launches the correct tour
Goal: clicking “Start Tour” on Dashboard Orientation starts `dashboard-tour`, not a cases tour.
Changes in `src/config/onboardingContentMap.ts`:
- `dashboard-tour` → `{ type: 'tour', contentId: 'dashboard-tour', fallbackPath: '/' }` (or `/dashboard` after we add alias)
- `case-operations-tour` → `{ type: 'tour', contentId: 'case-operations-tour', fallbackPath: '/cases' }`
- `daily-workflow-tour` → `{ type: 'tour', contentId: 'daily-workflow-tour', fallbackPath: '/tasks' }`
- `access-roles-tour` fallbackPath should become `/access-roles` (currently `/settings/access-roles`, which is not a real route)
Also adjust any other `fallbackPath` entries that point to non-existent routes.

C) Make tours “standard” by ensuring every step has a real on-screen target
Goal: every step points to an element that exists, so the step highlights the actual feature.

Approach:
- Prefer adding stable `data-tour="..."` hooks in the UI (recommended), because it keeps the tour script readable and resilient.
- For places where adding hooks is not appropriate, update selectors in `public/help/tours.json` to match existing hooks.

Concrete fixes:

1) Dashboard tour: add missing `data-tour` anchors in dashboard UI
Files to inspect & update:
- `src/components/dashboard/EnhancedDashboard.tsx`
- `src/components/dashboard/DashboardStatsBar.tsx` (and any widget components used by the dashboard)
Add `data-tour` attributes to match `public/help/tours.json`:
- `dashboard-header`
- `kpi-cards` (likely on the stats/KPI row)
- `upcoming-deadlines` (or update the tour to target an existing widget section)
- `quick-actions` (if dashboard has a quick actions region; otherwise rename target and update the tour)
- `recent-activity` (same as above)

If the dashboard is “widget-driven” and doesn’t have those exact sections, we will update the `dashboard-tour` steps to target the actual visible widgets and sections (for example, a KPI widget container, a refresh button area, etc.), but the key is: each selector must exist.

2) Task tours: align tour targets to the real task UI
Current mismatches found:
- `create-task-btn` (tour) vs `create-task-button` (actual)
- `task-templates`, `sla-tracking`, `task-board`, etc. are not present as `data-tour` hooks in the current Task pages.
Plan:
- Update `public/help/tours.json` for `task-management-tour` and `daily-workflow-tour` so steps target:
  - Sidebar: `data-tour="tasks-nav"` (exists in Sidebar)
  - Create task button: `data-tour="create-task-button"` (exists)
  - Tabs: `data-tour="templates-tab"`, `data-tour="board-tab"`, etc. (exists in TaskManagement)
- Add a few missing `data-tour` hooks if needed for “Task Templates panel” or “SLA Monitoring” so narration lines attach to the actual UI region.

3) Case tours: ensure all tour targets exist (most do, some don’t)
We already have:
- `cases-nav` in Sidebar
- `new-case-btn` in CaseManagement
- `case-list`, `case-actions` exist
Potential missing targets:
- `case-form` appears in the tour JSON but does not currently exist as a data-tour hook (based on search).
Plan:
- Add `data-tour="case-form"` to the create/edit case form container (likely in CaseModal/CaseForm).
- Ensure save button is already `data-tour="save-case-btn"` (it is in CaseModal), good.

4) Hearings tours: align to actual hearings UI
The hearings tour script uses targets like `calendar-view`, `schedule-hearing-btn`, etc., but the current code shows hearing-related `data-tour` hooks mainly inside the Hearing Drawer (e.g., `hearing-case-selector`, `hearing-datetime`).
Plan:
- Add missing anchors in the Hearings page / calendar header (e.g., schedule button, calendar/list switcher).
- Update the tour JSON to use those anchors so steps attach.

D) Fix Help Discovery UI locations (secondary but important)
In `src/services/helpDiscoveryService.ts`, `_resolveUILocation()` currently maps:
- `access-roles` → `/settings/access-roles` (wrong; should be `/access-roles`)
- `hearings` → `/hearings` (less ideal; better `/hearings/calendar`)
- `dashboard` → `/` (ok)
This affects “View in App” for help entries and can also contribute to confusion.
Plan: update these mappings to match actual routes defined in `src/App.tsx` and the sidebar.

E) Testing / verification checklist
After implementing:
1. Click “Get Started” → “Dashboard Orientation” → “Start Tour”
   - No 404 flash
   - Tour attaches to real dashboard elements (arrow + highlight)
2. Click “Case Management Basics” and “Daily Workflow”
   - Correct tour starts (correct titles/steps)
   - Targets attach to actual elements; no centered orphan modals
3. Click “Mark done”
   - No navigation/404 side-effects
4. Repeat in a non-dashboard starting route (e.g., you’re currently on `/hearings?view=list`)
   - Starting a tour should still navigate to the correct page and attach correctly

Files I expect to change
- `src/App.tsx` (add `/dashboard` alias route)
- `src/config/onboardingContentMap.ts` (fix contentId + fallbackPath mapping)
- `src/components/help/OnboardingWizard.tsx` (minor adjustments if needed: don’t navigate unnecessarily; ensure the targetPath exists; improve error messaging)
- `public/help/tours.json` (fix selectors + step targets to match UI reality)
- `src/components/dashboard/EnhancedDashboard.tsx` and possibly dashboard subcomponents (add missing `data-tour` anchors)
- `src/components/tasks/TaskManagement.tsx` (add/adjust `data-tour` anchors where missing)
- `src/components/cases/CaseForm.tsx` / `src/components/modals/CaseModal.tsx` (add missing `data-tour="case-form"` anchor)
- `src/pages/HearingsPage.tsx` and/or calendar components (add anchors + align tour steps)
- `src/services/helpDiscoveryService.ts` (fix moduleLocations to match real routes)

Outcome you should see
- No more 404 flashes during “Start Tour” or “Mark done”
- Tours will highlight real UI elements and feel like standard guided tours (not floating narration modals)
- Daily workflow steps like “Task Templates” will open on the correct background and attach to the correct tab/section
