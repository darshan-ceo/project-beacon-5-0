

# Simplify "Create New Case" Form

## Goal
Strip the case creation form down to essential fields only. Detailed information (timeline, financials, notice specifics, jurisdiction) will be captured later via the "Add Notice" workflow.

## Final Form Structure (After Changes)

```text
[Select Client *]                          -- Already at top (no change)
[Case Identification]                      -- Hide generated case number display
[Case Details]                             -- No change (Issue Type, Title)
[Assignment]                               -- Already correct (Assigned To, Priority)
[Case Lifecycle Stage]                     -- Renamed from "Legal Stage & Forum"
[Additional Details]                       -- No change (Description)
```

## Changes Summary

| # | Section | Action |
|---|---------|--------|
| 1 | Case Identification | Hide the "Generated Case Number" field and format hint (keep backend generation) |
| 2 | Timeline and Compliance | Remove entire section (available in Add Notice) |
| 3 | Assignment | No change needed -- already has only Assigned To and Priority |
| 4 | Legal Stage and Forum | Rename to **"Case Lifecycle Stage"** |
| 5 | Financial Details | Remove entire section (demand comes from current stage notices) |
| 6 | Additional Notice Information | Remove entire section (available in Add Notice) |
| 7 | Jurisdiction Details | Remove entire section (already in client record) |
| 8 | Order and Appeal Milestones | Remove from create form (belongs in stage workflow) |
| 9 | Additional Details | No change |

### Naming Recommendation
For "Legal Stage and Forum", I recommend **"Case Lifecycle Stage"** because:
- "Lifecycle" communicates the progression concept (Assessment to Supreme Court)
- "Stage" aligns with the existing domain terminology used throughout the system
- It avoids the word "Legal" which is redundant in a legal CRM context

## Technical Plan

### File: `src/components/cases/CaseForm.tsx`

1. **Lines 233-244**: Remove the "Generated Case Number" `Input` and format hint `<p>` tag. The `formData.caseNumber` continues to be generated and saved in the backend -- just not shown on screen.

2. **Lines 286-369**: Remove the entire "Timeline and Compliance" `Card` section (Notice Date, Reply Due Date). These fields remain in `CaseFormData` for backward compatibility and will default to empty strings.

3. **Lines 422-427**: Change the `CardTitle` from `"Legal Stage & Forum"` to `"Case Lifecycle Stage"`.

4. **Lines 556-641**: Remove the entire "Financial Details" `Card` section (Period, Tax Demand, Interest, Penalty, Total).

5. **Lines 643-801**: Remove the entire "Additional Notice Information" `Card` section (Notice Type, Section Invoked, Financial Year, Authority, City, Specific Officer).

6. **Lines 803-844**: Remove the entire "Jurisdiction Details" `Card` section (GST Commissionerate, Office Location).

7. **Lines 846-960**: Remove the "Order and Appeal Milestones" conditional `Card` section (Order Date, Received Date, Impugned Order, Appeal Filed). This detailed information belongs in the stage workflow, not initial case creation.

8. **Unused imports**: Remove `Clock`, `DollarSign`, `MapPin` icons and `useStatutoryDeadlines`, `DeadlineStatusBadge`, `StandardDateInput`, `addDays`, `format` imports if no longer used after removals. Keep `getDaysUntilDue` helper only if still referenced.

### No database changes needed
All removed fields remain in `CaseFormData` type for backward compatibility. They simply default to empty/zero and are populated later via "Add Notice".

