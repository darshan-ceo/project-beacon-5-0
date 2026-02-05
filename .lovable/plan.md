

# Correction Plan: Create New Case Form Field Alignment

## Issues Identified

| Issue | Location | Problem |
|-------|----------|---------|
| Duplicate Notice Number | Section 1 + Section 7 | "Notice / Reference No *" AND "Notice Number" - confusing duplicate |
| Section 7 Title | "GST Notice Details" | Name implies required GST data, but most fields are optional |
| Field Organization | Multiple sections | Fields that should be "Add Notice" workflow appear in Create Case |

---

## Required Corrections

### 1. Remove Duplicate "Notice Number" Field from Section 7

**Current State (Section 7, lines 655-667):**
```tsx
<div>
  <Label htmlFor="notice_no">Notice Number</Label>
  <Input id="notice_no" ... placeholder="e.g., ZA270325006940Y" />
</div>
```

**Action:** Remove this field entirely - it duplicates "Notice / Reference No *" from Section 1.

---

### 2. Rename Section 7 Header

**Current:** "GST Notice Details"

**Change to:** "Additional Notice Information"

**Add helper text:** "Optional – if details are available now"

This clarifies all fields in this section are supplementary, not blocking.

---

### 3. Mark All Section 7 Fields as Optional (except Notice Type)

Fields to update labels (remove asterisk or add "(Optional)"):

| Field | Current | Should Be |
|-------|---------|-----------|
| Notice Type | Notice Type * | **Keep required** |
| Section Invoked | Section Invoked | Section Invoked (optional) |
| Financial Year | Financial Year | Financial Year (optional) |
| Legal Forum / Issuing Authority | * for non-Assessment | Remove asterisk - make fully optional |
| City | City | City (optional) - already done |
| Specific Officer Name | (Optional) | Already correct |

---

### 4. Remove Authority Validation Error Message

**Current (lines 778-780):**
```tsx
{!formData.authorityId && formData.currentStage !== 'Assessment' && (
  <p className="text-sm text-destructive mt-1">Authority is required</p>
)}
```

**Action:** Remove this validation error display - Authority should NOT block case creation per the prompt.

---

## Summary of Changes

| File | Section | Change |
|------|---------|--------|
| `CaseForm.tsx` | Section 7 Header | Rename to "Additional Notice Information" + add "Optional" helper |
| `CaseForm.tsx` | Section 7 | Remove duplicate "Notice Number" field |
| `CaseForm.tsx` | Section 7 | Add "(optional)" to Section Invoked, Financial Year labels |
| `CaseForm.tsx` | Section 7 | Remove asterisk from "Legal Forum / Issuing Authority" |
| `CaseForm.tsx` | Section 7 | Remove "Authority is required" error message |
| `CaseModal.tsx` | Validation | Ensure authorityId is NOT validated/blocking |

---

## Field Placement Summary (After Fix)

**Section 1: Case Identification** (Required)
- Case Type, Year, Sequence
- Office File No (optional)
- Notice / Reference No * (required)

**Section 2: Compliance Dates** (Required)
- Notice Date *
- Reply Due Date *

**Section 3: Assignment** (Required)
- Client *
- Case Owner *

**Section 4: Case Details** (Optional)
- Primary Issue (if known)
- Description
- Priority

**Section 5: Legal Stage & Forum**
- Authority Level *
- Matter Type (conditional)

**Section 6: Financial Details** (Optional)
- Period, Tax Demand, Interest, Penalty

**Section 7: Additional Notice Information** (All Optional except Notice Type)
- Notice Type * (required for categorization)
- Section Invoked (optional)
- Financial Year (optional)
- Legal Forum / Issuing Authority (optional)
- City (optional)
- Specific Officer Name (optional)

**Section 8: Jurisdiction Details** (Optional)
- GST Commissionerate
- Office Location

---

## Validation Logic Alignment

Ensure `CaseModal.tsx` validation matches:

```typescript
// REQUIRED (blocks creation)
- clientId
- assignedToId
- noticeNo (Notice / Reference No)
- form_type (Notice Type)
- notice_date
- reply_due_date

// NOT REQUIRED (should NOT block)
- officeFileNo ✓ already fixed
- issueType ✓ already fixed
- city ✓ already fixed
- authorityId ← MUST VERIFY NOT BLOCKING
- section_invoked
- financial_year
- notice_no (the duplicate one in Section 7)
```

---

## Success Criteria

After implementation:
1. No duplicate "Notice Number" field visible
2. Section 7 clearly labeled as optional
3. Only 6 fields truly block case creation: Client, Assigned To, Notice Type, Notice/Reference No, Notice Date, Reply Due Date
4. No validation errors for Authority/Issuing Forum

