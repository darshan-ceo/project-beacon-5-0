

# Fix Plan: Notice Intake Wizard -- 3 Issues

## Issue 1: Duplicate Case Still Getting Created (Back + Create)

**Analysis:** The guard `if (createdCaseId) { setCurrentStep('stage_tasks'); return; }` at line 303 IS present and correct. However, the problem is that when navigating back from `stage_tasks`, `getPreviousStep` returns `financial_validation` (Step 7). At this step, the button label shows "Create" (line 1237) and clicking it calls `handleCreateCaseAndNotice()`. The guard should work... UNLESS the `createdCaseId` state is being reset.

Looking at the completion step's "Add Another Notice" handler (line 1162-1167), `setCreatedCaseId('')` is called there. But that's only on "Add Another". The real issue is more subtle: when `handleCreateCaseAndNotice` succeeds and moves to `stage_tasks`, pressing Back goes to `financial_validation`. The guard checks `createdCaseId` which should be set. Let me verify the `handlePrevious` function -- it just calls `setCurrentStep(prev)` with `getPreviousStep`. This should be `create_link` (step 8), not `financial_validation` (step 7).

Wait -- looking at the step flow: `financial_validation` -> `create_link` -> `stage_tasks`. The `create_link` step exists in `WIZARD_STEPS` but has no render case. The navigation from `financial_validation` skips `create_link` and jumps straight to `stage_tasks` via `handleCreateCaseAndNotice`. But `getPreviousStep('stage_tasks')` returns `create_link`, and `getPreviousStep('create_link')` returns `financial_validation`. So Back from `stage_tasks` goes to `create_link`, then Back again goes to `financial_validation`. At `financial_validation`, clicking Create calls `handleCreateCaseAndNotice` again -- and the guard SHOULD catch it.

The fix needs to be more robust. Two changes:

1. **Disable the Create button** after case is created by checking `createdCaseId` in `canGoNext` or button disabled state
2. **Change the button label** from "Create" to "Next" when case already exists
3. **Make the guard also handle navigation correctly** -- when at `financial_validation` with `createdCaseId` set, skip past `create_link` to `stage_tasks`

**Changes in `NoticeIntakeWizardV2.tsx`:**
- Update `handleNext` for `financial_validation` case: if `createdCaseId` is already set, skip to `stage_tasks` directly instead of calling `handleCreateCaseAndNotice`
- Update button label logic: show "Next" instead of "Create" when `createdCaseId` is set
- Remove `create_link` from the step list or skip it in navigation since it has no UI

---

## Issue 2: OCR Preview / Verification

**Analysis:** Currently after OCR extraction (upload step), the wizard jumps directly to `resolve_gaps` (Step 4) which IS the verification/edit screen. However, there is no dedicated "preview" of the raw extracted data or side-by-side comparison with the PDF.

**Solution:** Add an `extract` step render that shows:
- A summary card of all extracted fields with confidence indicators
- Highlighted low-confidence fields
- A "View PDF" button to open the uploaded document in a new tab
- This step already exists in the step definitions but has no render case

**Changes in `NoticeIntakeWizardV2.tsx`:**
- Add a `case 'extract':` render block in `renderStepContent()` that displays:
  - Extracted fields in a structured card layout (grouped by category)
  - Confidence badges (High/Medium/Low) per field
  - A preview button to view the PDF in a new browser tab via `URL.createObjectURL`
  - Clear indication of which fields were AI-extracted vs. empty

---

## Issue 3: UI/UX Consistency

**Analysis:** The wizard uses a basic `Dialog` with `max-w-2xl`. The New Client Form likely uses the `AdaptiveFormShell` pattern (full-page overlay on desktop). The wizard steps have inconsistent card layouts, spacing, and button placement.

**Solution:** Standardize the wizard UI:
- Use consistent card styling across all steps
- Standardize padding, spacing (space-y-4 for form fields, space-y-6 for sections)
- Ensure header structure is uniform (icon + title + description centered)
- Fix button alignment in the footer (Back left-aligned, Next/Create right-aligned with gap)
- Apply consistent form field styling (Label size, Input height, Select styling)
- Keep the Dialog approach (wizard is inherently multi-step, not a form modal) but ensure max-width and padding match the design system

**Changes in `NoticeIntakeWizardV2.tsx`:**
- Standardize all step renders to use a consistent template:
  - Centered icon + title + subtitle header
  - Card-wrapped form sections with consistent `CardHeader` + `CardContent`
  - Consistent grid layouts (grid-cols-2 gap-4)
  - Footer buttons with proper alignment and spacing
- Remove redundant spacing variations

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/components/notices/NoticeIntakeWizardV2.tsx` | 1. Fix duplicate guard: skip to `stage_tasks` if `createdCaseId` exists when at `financial_validation`, change button label dynamically. 2. Add `extract` step render with field preview, confidence indicators, and PDF viewer. 3. Standardize UI across all wizard steps for consistent spacing, card layouts, and typography. |

