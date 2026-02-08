
# Fix Scanned PDF Flow: Route Empty Text to Vision OCR

## Problem Analysis

ASMT-10 and other GST notices are typically **scanned PDFs** (images embedded in PDF) with no text layer. The current extraction flow fails because:

| Step | What Happens | Result |
|------|--------------|--------|
| 1 | `extractWithAI()` checks for API key | Throws if no key → falls to step 2 |
| 2 | `extractWithLovableAI()` calls edge function | May fail (503/401) → falls to step 3 |
| 3 | `extractTextFromPDF()` via PDF.js | Returns **empty string** (no text layer) |
| 4 | `extractDataFromText("")` regex | Returns empty fields |
| 5 | Wizard shows "Extraction failed" | User blocked |

**The bug**: Empty PDF.js text is treated as "regex extraction success" rather than triggering Vision OCR.

---

## Solution Overview

```text
                        ┌──────────────────────┐
                        │  Extract from PDF    │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Step 1: Try PDF.js text     │
                    │ (fast, for text-based PDFs) │
                    └──────────────┬──────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │ Text length > 100? │
                         └─────────┬─────────┘
                                   │
              ┌────────NO──────────┴──────────YES────────┐
              │                                          │
              ▼                                          ▼
   ┌─────────────────────┐                    ┌──────────────────┐
   │ SCANNED PDF DETECTED│                    │ Use regex        │
   │ Route to Vision OCR │                    │ extraction       │
   └─────────┬───────────┘                    └──────────────────┘
             │
    ┌────────▼────────┐
    │ OpenAI Vision?  │
    └────────┬────────┘
             │
   ┌───NO────┴────YES───┐
   │                    │
   ▼                    ▼
┌─────────┐      ┌─────────────┐
│ Lovable │      │ OpenAI OCR  │
│ AI OCR  │      │             │
└─────────┘      └─────────────┘
```

---

## Implementation Details

### File: `src/services/noticeExtractionService.ts`

#### Change 1: Add Text Length Threshold Constant

```typescript
// Minimum text length to consider PDF as "text-based" vs "scanned"
// Scanned PDFs typically have 0-50 chars of noise, real PDFs have 100+
const MIN_TEXT_LENGTH_FOR_REGEX = 100;
```

#### Change 2: Restructure `extractFromPDF()` Method

Current flow:
1. Try OpenAI Vision → Lovable AI → PDF.js regex

New flow:
1. Try PDF.js text extraction first (fast, no API call)
2. If text length ≥ threshold → use regex extraction
3. If text length < threshold → treat as scanned PDF → route to Vision OCR
4. Vision OCR: OpenAI → Lovable AI → return with explanation

```typescript
async extractFromPDF(file: File): Promise<ExtractionResult> {
  try {
    let extractedData: ExtractedNoticeData;
    let usingAI = false;
    let errorCode: ExtractionResult['errorCode'] | undefined;
    
    // Step 1: Try PDF.js text extraction first (fast, no API call)
    let pdfText = '';
    let isScannedPdf = false;
    
    try {
      pdfText = await this.extractTextFromPDF(file);
      console.log('📄 [PDF.js] Extracted text length:', pdfText.length);
      
      // Check if this is a scanned PDF (no usable text)
      if (pdfText.length < MIN_TEXT_LENGTH_FOR_REGEX) {
        console.log('🖼️ Scanned PDF detected (text length < threshold). Routing to Vision OCR...');
        isScannedPdf = true;
      }
    } catch (pdfError) {
      console.warn('📄 [PDF.js] Text extraction failed, treating as scanned PDF:', pdfError);
      isScannedPdf = true;
    }
    
    // Step 2: Route based on PDF type
    if (isScannedPdf) {
      // Scanned PDF → Must use Vision OCR
      let visionSuccess = false;
      
      // Try OpenAI Vision first
      try {
        const aiResult = await this.extractWithAI(file);
        visionSuccess = true;
        usingAI = true;
        extractedData = /* merge aiResult */;
      } catch (aiError) {
        console.log('OpenAI Vision failed:', aiError);
        
        // Try Lovable AI as fallback
        try {
          const lovableResult = await this.extractWithLovableAI(file);
          visionSuccess = true;
          usingAI = true;
          extractedData = /* merge lovableResult */;
        } catch (lovableError) {
          console.log('Lovable AI also failed:', lovableError);
        }
      }
      
      if (!visionSuccess) {
        // No Vision OCR available - cannot process scanned PDF
        return {
          success: false,
          error: 'This is a scanned PDF with no text layer. Vision OCR is required but unavailable. Please configure an OpenAI API key.',
          errorCode: 'SCANNED_PDF_NO_OCR'
        };
      }
    } else {
      // Text-based PDF → Use regex extraction
      extractedData = this.extractDataFromText(pdfText);
      usingAI = false;
    }
    
    /* ... rest of method ... */
  }
}
```

#### Change 3: Update Error Type

Add new error code for scanned PDFs without OCR:

```typescript
interface ExtractionResult {
  errorCode?: 'INVALID_API_KEY' | 'RATE_LIMIT' | 'PDF_PARSE_ERROR' | 'SCANNED_PDF_NO_OCR' | 'UNKNOWN';
}
```

---

### File: `src/components/notices/NoticeIntakeWizardV2.tsx`

#### Change 4: Handle Scanned PDF Error in UI

Add specific user guidance for scanned PDF scenarios:

```typescript
// In handleExtractData catch block
} else if (errorMessage.includes('scanned PDF') || errorMessage.includes('SCANNED_PDF_NO_OCR')) {
  title = 'Scanned PDF Detected';
  description = 'This PDF contains images only (no text layer). Please configure an OpenAI API key above to enable OCR extraction.';
}
```

#### Change 5: Show "Using AI OCR" Status

Update the extraction toast to indicate when AI OCR is being used:

```typescript
toast({
  title: isScannedPdf ? "AI OCR Processing" : "Data extracted",
  description: isScannedPdf 
    ? "Scanned PDF detected. Using Vision OCR for extraction..." 
    : "Review the extracted information and fill any gaps.",
});
```

---

### File: `src/components/notices/NoticeIntakeWizard.tsx`

Apply the same error handling updates for V1 wizard consistency.

---

## Files to Change

| File | Changes |
|------|---------|
| `src/services/noticeExtractionService.ts` | Restructure `extractFromPDF()` to try PDF.js first, detect scanned PDFs, route to Vision OCR |
| `src/components/notices/NoticeIntakeWizardV2.tsx` | Add scanned PDF error handling, show OCR status |
| `src/components/notices/NoticeIntakeWizard.tsx` | Same error handling for V1 |

---

## Expected Behavior After Fix

| Scenario | Current | After Fix |
|----------|---------|-----------|
| Scanned PDF, OpenAI configured | ❌ Fails | ✅ Uses OpenAI Vision |
| Scanned PDF, no API key | ❌ Fails silently | ✅ Clear error: "Configure API key for OCR" |
| Text-based PDF | ✅ Works | ✅ Works (faster - regex first) |
| Scanned PDF, Lovable AI only | ❌ Fails | ✅ Uses Lovable AI Vision |

---

## Technical Notes

- **Text threshold (100 chars)**: Chosen because real notices have 500+ chars, while scanned PDFs produce 0-50 chars of OCR noise from PDF.js
- **Performance improvement**: Text-based PDFs now skip API calls entirely and use fast regex extraction
- **Error clarity**: Users see actionable messages like "Configure OpenAI API key for scanned PDFs"
