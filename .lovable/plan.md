
# Fix: Notice Intake Wizard -- 4 Bugs

## Bug 1: Notice Type Not Captured from PDF

**Root Cause:** In `noticeExtractionService.ts` (line 246), the `noticeType` regex is:
```
/((?:FORM\s+)?GST\s+)?(?:ASMT[-\s]?(?:10|11|12)|DRC[-\s]?(?:01A?|03|07)|GSTR[-\s]?[0-9A-Z]+)/i
```
Group 1 captures `(FORM GST )?` (the optional prefix), but the actual notice type (e.g., ASMT-10) is in a **non-capturing** group. The extraction code at line 764 uses `match[1]`, which returns the prefix or `undefined` -- never the notice type itself.

**Fix:** Change the regex to put the notice type in a capturing group, or use `match[0]` (full match). The cleanest approach is to restructure the regex so group 1 captures the notice type:
```
/(?:(?:FORM\s+)?GST\s+)?(ASMT[-\s]?(?:10|11|12)|DRC[-\s]?(?:01A?|03|07)|GSTR[-\s]?[0-9A-Z]+)/i
```
This makes group 1 = "ASMT-10", "DRC-01A", etc.

**File:** `src/services/noticeExtractionService.ts` (line 246)

---

## Bug 2: "Assign To" Dropdown Shows Empty

**Root Cause:** In `NoticeIntakeWizardV2.tsx` (line 1013), the dropdown renders `{member.name}`, but the `Employee` interface uses `full_name`, not `name`. The `name` property is `undefined` on every employee, so the dropdown options appear blank (they exist but show no text).

**Fix:** Change `member.name` to `member.full_name` on line 1013. Also filter to only show Active employees.

**File:** `src/components/notices/NoticeIntakeWizardV2.tsx` (line 1011-1014)

---

## Bug 3: Duplicate Case on Back + Create

**Root Cause:** After case creation succeeds, the wizard moves to `stage_tasks` step. Pressing "Back" navigates back to `financial_validation`. The "Create" button calls `handleCreateCaseAndNotice()` again with **no guard** to prevent re-creation. A second case is created.

**Fix:** Add a guard at the top of `handleCreateCaseAndNotice`: if `createdCaseId` is already set, skip case creation and proceed directly. This makes the function idempotent.

```typescript
// At the start of handleCreateCaseAndNotice:
if (createdCaseId) {
  // Case already created -- skip to tasks
  setCurrentStep('stage_tasks');
  return;
}
```

**File:** `src/components/notices/NoticeIntakeWizardV2.tsx` (inside `handleCreateCaseAndNotice`, around line 301)

---

## Bug 4: Case Fields Not Appearing After Save

**Root Cause:** The wizard passes fields like `notice_date`, `reply_due_date`, `tax_demand`, `form_type` in the case payload. These are snake_case database column names. The `casesService.create` spreads `normalizedData` into the case object, so these fields are present. However, the Case interface and CaseModal likely expect camelCase equivalents (`noticeDate`, `replyDueDate`, `taxDemand`, `formType`). When the case is loaded in edit mode, these camelCase properties are undefined because only snake_case versions were set.

**Fix:** Map the wizard payload fields to both camelCase and snake_case in the case creation payload inside NoticeIntakeWizardV2:
```typescript
noticeDate: extractedData.notice_date,
replyDueDate: extractedData.due_date,
taxDemand: extractedData.total_demand,
formType: extractedData.notice_type,
```

**File:** `src/components/notices/NoticeIntakeWizardV2.tsx` (case payload around lines 331-345)

---

## Summary of Files to Modify

| File | Change |
|------|--------|
| `src/services/noticeExtractionService.ts` | Fix noticeType regex capturing group |
| `src/components/notices/NoticeIntakeWizardV2.tsx` | Fix employee name display, add duplicate guard, fix case field mapping |
