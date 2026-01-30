
# Fix: Notice Intake Wizard - Missing Fields and Uppercase Legal Attributes

## Problems Identified

From your screenshots and exploration, the following issues exist:

### 1. Client Name Not Detected
The AI extraction prompt only asks for 7 fields and does NOT request the taxpayer/client name:
- DIN, GSTIN, Period, Due Date, Office, Amount, Notice Type

The notice clearly shows taxpayer details in the header, but they're not being extracted.

### 2. Legal Attributes Being Title-Cased (ASMT-10 → Asmt-10)
Looking at `src/utils/formatters.ts`:
- `normalizeCasePayload()` applies `toTitleCase()` to the case `title` (line 98)
- This transforms "ASMT-10 - ZD271225125396D" → "Asmt-10 - Zd271225125396d"
- `form_type` is NOT included in the uppercase normalization

### 3. Notice number also being affected
The wizard generates title from: `${normalized.form_type} - ${normalized.notice_no}`
Since title gets title-cased, "ASMT-10" becomes "Asmt-10" and DIN/Notice Number loses its uppercase.

---

## Solution

### Part A: Extract Client/Taxpayer Name from Notice

**File**: `src/services/noticeExtractionService.ts`

Update the AI prompt (lines 144-165) to include taxpayer extraction:

```typescript
// Add to the system prompt fields list:
- Taxpayer Name: The legal name of the taxpayer/business from the notice header
- Trade Name: Business trade name if different from legal name
- Subject: Full subject line of the notice
- Legal Section: GST Act section invoked (e.g., "Section 73(1)", "Section 74")
```

Update the expected JSON response structure to include:
```json
{
  "fields": {
    // ... existing fields ...
    "taxpayerName": { "value": "Watermark Cars Private Limited", "confidence": 90 },
    "tradeName": { "value": "...", "confidence": 85 },
    "subject": { "value": "Discrepancy in Input Tax Credit...", "confidence": 85 },
    "legalSection": { "value": "Section 73(1)", "confidence": 80 }
  }
}
```

**File**: `src/components/notices/NoticeIntakeWizard.tsx`

Update mapping (around line 212) to use extracted taxpayer name:
```typescript
taxpayer: {
  gstin: result.data.gstin,
  name: result.data.taxpayerName || '',  // NEW: Use extracted name
  tradeName: result.data.tradeName || '',  // NEW: Trade name
  pan: result.data.gstin ? result.data.gstin.substring(2, 12) : '',
  address: ''
}
```

Update client creation (around line 393) to use extracted name:
```typescript
const newClientData = {
  name: normalized.taxpayer?.name || normalized.taxpayer?.tradeName || 'New Client',
  // ... rest unchanged
};
```

---

### Part B: Preserve Uppercase for Legal Attributes

**File**: `src/utils/formatters.ts`

Update `normalizeCasePayload()` to:
1. Apply `toUpperCase()` to `form_type` (new field)
2. Apply `toUpperCase()` to `section_invoked` (new field)
3. NOT apply `toTitleCase()` to case `title` when it starts with a legal form code

```typescript
export const normalizeCasePayload = (payload: any): any => {
  const normalized = { ...payload };

  // Legal Form Codes that should STAY UPPERCASE
  const LEGAL_FORM_PREFIXES = ['ASMT-', 'DRC-', 'GSTR-', 'GST-', 'APPEAL-'];
  
  // Check if title starts with a legal form code - if so, skip title-casing
  const startsWithLegalCode = LEGAL_FORM_PREFIXES.some(
    prefix => normalized.title?.toUpperCase().startsWith(prefix)
  );
  
  // Title Case fields (ONLY if not a legal form code title)
  if (normalized.title && !startsWithLegalCode) {
    normalized.title = toTitleCase(normalized.title);
  }
  if (normalized.stateBenchCity) normalized.stateBenchCity = toTitleCase(normalized.stateBenchCity);
  if (normalized.state_bench_city) normalized.state_bench_city = toTitleCase(normalized.state_bench_city);
  if (normalized.stateBenchState) normalized.stateBenchState = toTitleCase(normalized.stateBenchState);
  if (normalized.state_bench_state) normalized.state_bench_state = toTitleCase(normalized.state_bench_state);

  // Uppercase fields - Legal identifiers and form codes
  if (normalized.caseNumber) normalized.caseNumber = toUpperCase(normalized.caseNumber);
  if (normalized.case_number) normalized.case_number = toUpperCase(normalized.case_number);
  if (normalized.noticeNo) normalized.noticeNo = toUpperCase(normalized.noticeNo);
  if (normalized.notice_no) normalized.notice_no = toUpperCase(normalized.notice_no);
  if (normalized.officeFileNo) normalized.officeFileNo = toUpperCase(normalized.officeFileNo);
  if (normalized.office_file_no) normalized.office_file_no = toUpperCase(normalized.office_file_no);
  
  // NEW: Form type and section should be uppercase
  if (normalized.formType) normalized.formType = toUpperCase(normalized.formType);
  if (normalized.form_type) normalized.form_type = toUpperCase(normalized.form_type);
  if (normalized.sectionInvoked) normalized.sectionInvoked = toUpperCase(normalized.sectionInvoked);
  if (normalized.section_invoked) normalized.section_invoked = toUpperCase(normalized.section_invoked);
  if (normalized.din) normalized.din = toUpperCase(normalized.din);

  return normalized;
};
```

---

### Part C: Update NoticeIntakeWizard Case Title Generation

**File**: `src/components/notices/NoticeIntakeWizard.tsx`

Update the prefilled case title (line 102) to preserve uppercase:

```typescript
const prefilled = {
  // Title preserves uppercase for form type and notice number
  title: `${(normalized.form_type || 'ASMT-10').toUpperCase()} - ${(normalized.notice_no || normalized.din || '').toUpperCase()}`,
  // ... rest unchanged
};
```

---

### Part D: Make Wizard Title Dynamic for DRC-01 Support

**File**: `src/components/notices/NoticeIntakeWizard.tsx`

Update the dialog title (around line 1041) to show detected notice type:

```typescript
<DialogTitle>
  Notice Intake Wizard - {extractedData?.notice_type?.toUpperCase() || 'GST Notice'}
</DialogTitle>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/noticeExtractionService.ts` | Add taxpayerName, tradeName, subject, legalSection to AI prompt |
| `src/utils/formatters.ts` | Add form_type, section_invoked, din to uppercase list; skip title-case for legal form titles |
| `src/components/notices/NoticeIntakeWizard.tsx` | Map taxpayer name, preserve uppercase in title generation, dynamic wizard title |
| `src/lib/notice/dataGapsResolver.ts` | Add field definitions for notice_title, section_invoked, notice_type |

---

## Expected Behavior After Fix

| Field | Before | After |
|-------|--------|-------|
| Case Title | "Asmt-10 - Zd271225125396d" | "ASMT-10 - ZD271225125396D" |
| Form Type | "Asmt-10" | "ASMT-10" |
| Notice No | "zd271225125396d" | "ZD271225125396D" |
| Section Invoked | "section 73(1)" | "SECTION 73(1)" |
| Client Name | "New Client" (default) | "Watermark Cars Private Limited" (extracted) |
| Wizard Title | "Notice Intake Wizard - ASMT-10" (hardcoded) | "Notice Intake Wizard - DRC-01" (dynamic) |

---

## DRC-01 Support Confirmation

Yes, DRC-01 notices can be processed with these changes:
- The extraction service regex already detects DRC-01 pattern
- The wizard title will dynamically show "DRC-01" when detected
- All uppercase normalization will apply equally to DRC-01, DRC-01A, etc.

---

## Testing Checklist

1. Upload ASMT-10 notice → Verify taxpayer name is extracted
2. Check case title displays as "ASMT-10 - [NOTICE_NO]" (all caps)
3. Upload DRC-01 notice → Verify wizard title shows "DRC-01"
4. Verify form_type displays as "ASMT-10" not "Asmt-10" in case cards
5. Verify section_invoked displays as "SECTION 73(1)" not "Section 73(1)"
6. Create case from wizard → Verify client name is populated
7. Edit existing case → Verify uppercase is preserved for legal fields
