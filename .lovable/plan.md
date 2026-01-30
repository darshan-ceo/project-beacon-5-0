

# Fix: Notice Intake Wizard - OCR Quality, Date Formats, and Multi-Page Extraction

## Problems Identified (Comparing Actual PDF vs. Extracted Data)

### Extraction Results from Your DRC-01A Notice:

| Field | Actual Value in PDF | Extracted Value | Status |
|-------|---------------------|-----------------|--------|
| **Notice Type** | DRC-01A / ASMT-10 referenced | "ASMT-10" | ⚠️ Partial |
| **GSTIN** | Taxpayer GSTIN (not visible in Annexure-C) | "03AUMPS7699K2ZL" | ❌ **WRONG** - This is supplier's GSTIN from Table-2 |
| **Issue Date** | 31.07.2025 (format: DD.MM.YYYY) | "Not found" | ❌ Date format with dots not captured |
| **Due Date** | Not in this Annexure | "Not found" | N/A |
| **Tax Period** | F.Y. 2021-22 | '" is zero. Further' (garbage) | ❌ Wrong text captured |
| **Amount** | ₹97,06,154 (IGST+Cess) | "Not found" | ❌ Format ₹XX,XX,XXX not captured |
| **Office** | CGST Range-II, Division-III, Jalandhar | "Not found" | ❌ |
| **Legal Section** | Section 61, Section 16 | Not extracted | ❌ |
| **Taxpayer Name** | Not in this Annexure-C page | "Not found" | N/A |

### Root Causes

1. **Only First Page Processed for Vision API**
   - `pdfToBase64Image()` only renders page 1
   - Your PDF has 6 pages - key data is on pages 4-6 (discrepancy tables)
   - The first 3 pages appear to be blank "Annexure-C" headers

2. **GSTIN Extraction Picks First Match (Wrong One)**
   - AI found "03AUMPS7699K2ZL" in Table-2 (supplier GSTIN)
   - This is Aman Sood's GSTIN, not the taxpayer's
   - The taxpayer's GSTIN isn't on the Annexure pages

3. **Date Format Issues**
   - PDF uses "31.07.2025" (DD.MM.YYYY with dots)
   - Regex pattern `\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}` should work but AI isn't extracting it
   - UI date input expects YYYY-MM-DD but user wants DD-MM-YYYY

4. **Amount Format Not Recognized**
   - PDF shows "₹97,06,154/-" and "₹93,90,812" 
   - Indian lakh format (X,XX,XXX) not being parsed correctly

5. **Document Type Mismatch**
   - This is an **Annexure-C** (supporting annexure to DRC-01A)
   - NOT the main notice with taxpayer details
   - Main notice (Form GST DRC-01A) would have taxpayer info

---

## Solution

### Part A: Process Multiple PDF Pages for AI Extraction

**File**: `src/services/noticeExtractionService.ts`

Update `pdfToBase64Image()` to render multiple pages:

```typescript
// Current: Only first page
const page = await pdf.getPage(1);

// Updated: Render first 4 pages and stitch together
private async pdfToBase64Images(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const images: string[] = [];
  const maxPages = Math.min(pdf.numPages, 4); // Process up to 4 pages
  
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 }); // Slightly lower for multiple pages
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport }).promise;
    images.push(canvas.toDataURL('image/png').split(',')[1]);
  }
  
  return images;
}
```

Update the AI call to send multiple images:

```typescript
// Send all page images to Vision API
content: [
  { type: 'text', text: 'Extract all information from this GST notice...' },
  ...images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:image/png;base64,${img}` }
  }))
]
```

---

### Part B: Improve GSTIN Extraction Logic

Update the AI prompt to differentiate taxpayer vs. supplier GSTIN:

```typescript
// In the system prompt, add clarification:
`IMPORTANT GSTIN RULES:
- The TAXPAYER's GSTIN appears in the notice header or "To:" section
- Do NOT use supplier GSTINs from discrepancy tables
- Supplier GSTINs are listed in tables showing ITC details - these are NOT the taxpayer
- If taxpayer GSTIN is not visible, return empty string (not a supplier GSTIN)`
```

---

### Part C: Fix Date Input to Accept DD-MM-YYYY

**File**: `src/validation/asmt10Resolver.ts`

The `normalizeDate()` function already handles DD-MM-YYYY, but the UI shows confusing error message.

Update the warning message (line 221):

```typescript
// Current
message: 'Due Date could not be parsed. Please use YYYY-MM-DD format'

// Updated  
message: 'Due Date could not be parsed. Please use DD-MM-YYYY format (e.g., 15-02-2025)'
```

**File**: `src/components/notices/DataGapsResolver.tsx`

Change date input to text type (not native date picker) to accept DD-MM-YYYY:

```typescript
// Current (line 116)
type={gap.type === 'date' ? 'date' : gap.type === 'number' ? 'number' : 'text'}

// Updated - Always use text for date fields to accept DD-MM-YYYY
type={gap.type === 'number' ? 'number' : 'text'}
placeholder={gap.type === 'date' 
  ? 'DD-MM-YYYY (e.g., 15-02-2025)' 
  : gap.suggested 
    ? `Suggested: ${gap.suggested}` 
    : `Enter ${gap.label}`}
```

---

### Part D: Enhance Amount Extraction for Indian Lakh Format

**File**: `src/services/noticeExtractionService.ts`

Update the AI prompt to handle Indian number formats:

```typescript
// Add to system prompt:
`AMOUNT EXTRACTION:
- Extract amounts as numeric values without commas
- Handle Indian lakh format: "97,06,154" = 9706154
- Handle "/-" suffix: "₹97,06,154/-" = 9706154
- Handle "lakhs": "97.06 lakhs" = 9706000`
```

Update regex pattern for amounts (line 63):

```typescript
// Current
amount: /(?:Total\s*Amount|Amount)[\s:]*(?:Rs\.?|₹)?\s*([\d,]+)/i,

// Enhanced to capture Indian formats
amount: /(?:Total\s*(?:Tax|Amount)|Amount\s*(?:proposed|demanded)?|(?:Excess|Diff).*?(?:ITC|Tax))[\s:]*(?:Rs\.?|₹)?\s*([\d,]+(?:\/-)?)/i,
```

---

### Part E: Add Support for Period Extraction with FY Format

Update AI prompt to handle F.Y. format:

```typescript
// In system prompt:
`TAX PERIOD:
- Extract as "F.Y. 2021-22" or "April 2021 - March 2022"
- For scrutiny notices, look for "F.Y." followed by year range
- For monthly returns, look for "MM/YYYY" format`
```

---

### Part F: Detect Document Type (Main Notice vs. Annexure)

Add document type detection to warn users:

```typescript
// In system prompt, add:
`DOCUMENT TYPE DETECTION:
- Identify if this is a main notice (DRC-01, ASMT-10) or an annexure (Annexure-A, B, C)
- Return documentType: "main_notice" or "annexure"
- Annexures may not contain taxpayer details - extract what's available`

// In response structure:
"documentType": { "value": "annexure", "confidence": 90 },
"documentTypeLabel": { "value": "Annexure-C to DRC-01A", "confidence": 85 }
```

Show warning in UI when annexure is detected:

```typescript
{extractedData.documentType === 'annexure' && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      This appears to be an <strong>Annexure document</strong>, not the main notice.
      Taxpayer details may not be present. Upload the main notice (Form GST DRC-01/ASMT-10) for complete extraction.
    </AlertDescription>
  </Alert>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/noticeExtractionService.ts` | Multi-page processing, enhanced prompts, improved regex |
| `src/validation/asmt10Resolver.ts` | Update date error messages to show DD-MM-YYYY format |
| `src/components/notices/DataGapsResolver.tsx` | Change date input to text with DD-MM-YYYY placeholder |
| `src/components/notices/NoticeIntakeWizard.tsx` | Add annexure detection warning |

---

## Expected Behavior After Fix

| Issue | Before | After |
|-------|--------|-------|
| Multi-page PDFs | Only page 1 processed | First 4 pages processed |
| GSTIN extraction | Picks supplier GSTIN | Correctly identifies taxpayer vs. supplier |
| Date input | Expects YYYY-MM-DD | Accepts DD-MM-YYYY and normalizes internally |
| Amount parsing | Misses ₹97,06,154 | Correctly extracts Indian lakh format |
| Annexure detection | No warning | Shows "Annexure detected" warning |
| Tax period | Garbage text | Correctly extracts "F.Y. 2021-22" |

---

## Important Note About Your Uploaded Document

Your uploaded PDF **"Annexure-C_DRC-01A_combined_-_test_30.1.pdf"** is an **Annexure-C** (supporting document), NOT the main DRC-01A notice. This is why:

1. Taxpayer name/GSTIN isn't in the document
2. No DIN or Notice Number visible
3. The pages are "Annexure-C" explaining discrepancies

**For complete extraction, you would need to upload the main Form GST DRC-01A notice** which contains:
- Taxpayer GSTIN and name
- DIN and Notice Number
- Issue Date and Due Date
- Summary of demand

The Annexure-C contains the detailed discrepancy explanations and tables (which we can still extract for discrepancy details).

---

## Testing Checklist

1. Upload a multi-page PDF → Verify pages 2-4 are also processed
2. Upload main DRC-01A notice → Verify taxpayer GSTIN is correctly identified
3. Upload Annexure document → Verify warning message appears
4. Enter date as "15-02-2025" → Verify it's accepted without error
5. Verify amounts like "97,06,154" are parsed as 9706154
6. Verify tax period "F.Y. 2021-22" is extracted correctly
7. Verify wizard title shows "DRC-01A" for DRC-01A notices

