
# Validation and UX Refactor Plan: Create New Case

## Summary

Refactor "Create New Case" validation to enable fast case creation (under 60 seconds) by enforcing only essential fields while keeping detailed notice documentation in the "Add Notice" workflow.

---

## Current State Analysis

### Current Required Fields (CaseModal.tsx lines 224-262)

| Field | Currently Required | Blocks Creation |
|-------|-------------------|-----------------|
| Office File No | Yes | Yes |
| Notice No | Yes | Yes |
| Issue Type | Yes | Yes |
| Notice Date | Yes | Yes |
| Reply Due Date | Yes | Yes |
| City | Yes | Yes |
| Client | Yes | Yes |
| Assigned To | Yes | Yes |

### Fields That Should Be Required Per Prompt

| Field | Should Be Required |
|-------|-------------------|
| Case Type | Yes (already enforced) |
| Year/Sequence | Yes (auto-generated) |
| Notice Type | Yes (form_type) |
| Notice Number (notice_no) | Yes |
| Notice Date | Yes |
| Reply Due Date | Yes |
| Client | Yes |
| Assigned To | Yes |

### Fields To Make Optional

| Field | Currently Required | Change To |
|-------|-------------------|-----------|
| Office File No | Yes | Optional |
| Issue Type | Yes | Optional (relabel) |
| City | Yes | Optional |

---

## Implementation Changes

### 1. Validation Logic Changes (CaseModal.tsx)

**Remove blocking validation for:**

```typescript
// REMOVE these validations:
// - officeFileNo (was required)
// - issueType (was required)  
// - city (was required)
```

**Keep required:**

```typescript
// KEEP these validations:
// - clientId (ownership)
// - assignedToId (ownership)
// - noticeNo or notice_no (notice snapshot)
// - form_type (notice type - add this)
// - notice_date (compliance)
// - reply_due_date (compliance)
```

**Updated validation block:**

```typescript
// Validation - Minimal required for case creation
if (mode === 'create') {
  // Notice snapshot - bare minimum
  if (!formData.noticeNo && !formData.notice_no) {
    showValidationError("Notice No / Reference No is required.");
    return;
  }
  if (!formData.form_type) {
    showValidationError("Notice Type (Form Type) is required to categorize the case.");
    return;
  }
  if (!formData.notice_date) {
    showValidationError("Notice Date is required for deadline tracking.");
    return;
  }
  if (!formData.reply_due_date) {
    showValidationError("Reply Due Date is required for compliance tracking.");
    return;
  }
}

// Ownership - always required
if (!formData.clientId) {
  showValidationError("Client is required.");
  return;
}
if (!formData.assignedToId && mode === 'create') {
  showValidationError("Case Owner is required for assignment.");
  return;
}
```

---

### 2. Form Field Label and UI Changes (CaseForm.tsx)

**Section 1: Case Identification**

| Field | Current Label | New Label | Required Indicator |
|-------|--------------|-----------|-------------------|
| Office File No | Office File No * | Office File No | Remove asterisk |
| Notice No | Notice No * | Notice / Reference No * | Keep asterisk |

**Section 2: Case Details**

| Field | Current Label | New Label | Required Indicator |
|-------|--------------|-----------|-------------------|
| Issue Type | Issue Type * | Primary Issue (if known) | Remove asterisk |

**GST Notice Details Section**

| Field | Current Label | New Label | Required Indicator |
|-------|--------------|-----------|-------------------|
| Form Type | Form Type | Notice Type * | Add asterisk |

**Section 5 (Legal Stage)**

| Field | Current Label | Change |
|-------|--------------|--------|
| City | City * | City (remove asterisk) |

---

### 3. Add Helper Text / Section Captions

**Add to Section 1 (Case Identification):**
```tsx
<p className="text-xs text-muted-foreground mt-1">
  Minimal notice details required to start tracking this case
</p>
```

**Add to Financial Details Section:**
```tsx
<CardHeader className="pb-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <DollarSign className="h-5 w-5 text-primary" />
      <CardTitle className="text-base">Financial Details</CardTitle>
    </div>
    <span className="text-xs text-muted-foreground">Optional – if details are available now</span>
  </div>
</CardHeader>
```

**Add to Authority/Location Section:**
```tsx
<span className="text-xs text-muted-foreground">Optional – if details are available now</span>
```

**Add near submit button (in CaseModal footer):**
```tsx
<p className="text-xs text-muted-foreground mr-auto">
  You can add or verify full notice details later from the notice document.
</p>
```

---

### 4. GST Notice Details - Make Form Type Required

Update the Form Type field in CaseForm.tsx:

```tsx
<div>
  <div className="flex items-center gap-1 mb-2">
    <Label htmlFor="form_type">
      Notice Type <span className="text-destructive">*</span>
    </Label>
    <FieldTooltip formId="create-case" fieldId="form_type" />
  </div>
  <Select
    value={formData.form_type}
    onValueChange={(value) => setFormData(prev => ({ ...prev, form_type: value }))}
    disabled={isDisabled}
    required
  >
    {/* ... existing options ... */}
  </Select>
</div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/modals/CaseModal.tsx` | Update validation logic (lines 224-262), add footer helper text |
| `src/components/cases/CaseForm.tsx` | Update labels, remove asterisks from optional fields, add section helper text |
| `public/help/inline/create-case.json` | Update tooltip content to reflect optional vs required |

---

## Behavioral Rules Preserved

1. **Draft vs Authoritative**: Notice data from Create Case is treated as initial/draft; Add Notice data is authoritative
2. **No data overwrite**: Add Notice will not overwrite case-level notice fields (they remain separate in stage_notices)
3. **Case creation without Add Notice**: Cases can be created without adding a formal stage notice
4. **Backward compatibility**: Existing cases with all fields populated continue to work normally

---

## Fields NOT Modified (Correct as-is)

These fields remain in Create Case but are NOT required:
- Priority (optional dropdown, defaults to Medium)
- Description
- Tax Demand / Interest / Penalty (optional financials)
- Section Invoked
- Financial Year
- Tax Period
- Specific Officer
- Jurisdictional Commissionerate
- Department Location
- Order/Appeal milestone fields (Phase 5)

---

## Technical Summary

### Removed Validations

```typescript
// BEFORE (lines 226-245):
if (!formData.officeFileNo || !formData.noticeNo) { ... }
if (!formData.issueType) { ... }
if (!formData.city) { ... }

// AFTER:
if (!formData.noticeNo && !formData.notice_no) { ... }
if (!formData.form_type) { ... }
// notice_date and reply_due_date validations remain
// city and officeFileNo validations removed
// issueType validation removed
```

### Label Changes Summary

| Location | Old Text | New Text |
|----------|---------|----------|
| Office File No label | "Office File No *" | "Office File No" |
| Issue Type label | "Issue Type *" | "Primary Issue (if known)" |
| Form Type label | "Form Type" | "Notice Type *" |
| City label | "City *" | "City" |

---

## Success Criteria

After implementation:
1. Case creation possible with only: Client, Assigned To, Notice Type, Notice No, Notice Date, Reply Due Date
2. All other fields remain available but don't block submission
3. Missing documents don't block case creation
4. Compliance deadlines (notice_date, reply_due_date) always captured
5. Full notice accuracy enforced only in Add Notice workflow
6. Existing cases continue to work without any data migration
