

# Fix Notice OCR: Direct PDF Input to Vision API (Pipeline Replacement)

## Problem Summary

The current OCR flow fails for scanned PDFs because it attempts **browser-side PDF-to-canvas-to-image conversion**, which produces invalid images and causes Vision OCR to fail before any API call is made.

**Error Seen**: "Vision OCR failed. OpenAI: Failed to process PDF. Lovable AI: Failed to process PDF"

**Root Cause**: Both `extractWithAI()` and `extractWithLovableAI()` call `pdfToBase64Images()` which uses browser canvas rendering. This fails silently for scanned PDFs, so neither Vision API is ever called.

---

## Solution: Direct PDF Input to Vision APIs

Both OpenAI (gpt-4o) and Google Gemini (gemini-2.5-flash) now support **direct PDF file input as base64**. This eliminates the need for browser-side canvas rendering entirely.

### New Flow

```text
OLD (BROKEN):
  PDF → PDF.js → Browser Canvas → PNG Images → Vision API
                    ↑
              [FAILS HERE for scanned PDFs]

NEW (FIXED):
  PDF → Base64 encode raw file → Edge Function → Vision API (direct PDF input)
```

---

## Implementation Details

### Part 1: Create New Edge Function for Direct PDF OCR

**New file: `supabase/functions/notice-ocr-pdf/index.ts`**

This function accepts raw PDF bytes (base64) and passes them directly to Gemini 2.5 Flash with `mimeType: application/pdf`.

Key implementation:
- Accept `{ pdfBase64: string }` instead of `{ images: string[] }`
- Send to Gemini with `type: "image_url"` and `url: "data:application/pdf;base64,${pdfBase64}"`
- Gemini handles all rasterization, DPI, page sizing internally
- Return extracted fields with confidence scores

### Part 2: Update noticeExtractionService.ts

#### Change 1: Add New Direct PDF Extraction Method

```typescript
/**
 * Extract using Lovable AI with DIRECT PDF input (no browser rendering)
 * Gemini 2.5 Flash natively supports PDF files as input
 */
private async extractWithDirectPDF(file: File): Promise<{ text: string; fieldConfidence: Record<string, FieldConfidence> }> {
  console.log('📄 [Direct PDF OCR] Sending raw PDF to Lovable AI...');
  
  // Read file as base64 - NO canvas rendering
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  // Call new edge function that accepts PDF directly
  const response = await fetch(`${supabaseUrl}/functions/v1/notice-ocr-pdf`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}` 
    },
    body: JSON.stringify({ pdfBase64: base64, filename: file.name })
  });
  
  // ... process response
}
```

#### Change 2: Update OpenAI Vision to Use Direct PDF

OpenAI gpt-4o now supports direct PDF input:
```typescript
// NEW: Direct PDF input to OpenAI
{
  type: "file",
  file: {
    filename: file.name,
    file_data: `data:application/pdf;base64,${base64}`
  }
}
```

#### Change 3: Restructure extractFromPDF Flow

For scanned PDFs (isScannedPdf = true):
1. Skip `pdfToBase64Images()` entirely
2. Try `extractWithDirectPDF()` first (Lovable AI with raw PDF)
3. Fall back to OpenAI with direct PDF input
4. Remove all canvas rendering from OCR path

### Part 3: Delete Broken Code

Remove from OCR flow (keep for text-based PDFs only):
- `pdfToBase64Images()` usage in `extractWithAI()` 
- `pdfToBase64Images()` usage in `extractWithLovableAI()`
- Any retry logic that reuses browser-rendered images

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/functions/notice-ocr-pdf/index.ts` | **CREATE** | New edge function that accepts raw PDF base64 and sends to Gemini 2.5 Flash |
| `supabase/config.toml` | **MODIFY** | Add `[functions.notice-ocr-pdf]` entry |
| `src/services/noticeExtractionService.ts` | **MODIFY** | Add `extractWithDirectPDF()`, update scanned PDF flow to bypass canvas |

---

## Technical Details

### Gemini 2.5 Flash Direct PDF Input Format

```typescript
{
  model: 'google/gemini-2.5-flash',
  messages: [
    { role: 'system', content: '...' },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract all information...' },
        { 
          type: 'image_url', 
          image_url: { 
            url: 'data:application/pdf;base64,${pdfBase64}' 
          }
        }
      ]
    }
  ]
}
```

### OpenAI Direct PDF Input Format (gpt-4o)

```typescript
{
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Extract notice fields...' },
      { 
        type: 'file', 
        file: { 
          filename: 'notice.pdf',
          file_data: 'data:application/pdf;base64,${base64}' 
        }
      }
    ]
  }]
}
```

---

## Updated Extraction Flow

```text
1. User uploads PDF
2. Try PDF.js text extraction (fast, no API)
3. IF text length >= 100 chars → regex extraction (text-based PDF)
4. IF text length < 100 chars → SCANNED PDF detected:
   a. Show UI message: "Scanned notice detected. AI OCR is processing..."
   b. Read PDF as raw base64 (NO canvas rendering)
   c. Try Lovable AI (notice-ocr-pdf with direct PDF input)
   d. If fails → Try OpenAI (with direct PDF input)
   e. If both fail → Show specific error
5. Parse extracted text into notice fields
6. Return results for review
```

---

## Acceptance Criteria

| Requirement | How Verified |
|-------------|--------------|
| No browser canvas rendering for OCR | Console shows no canvas errors |
| Vision OCR called with PDF input | Edge function logs show `application/pdf` |
| ASMT-10 scanned PDF processes successfully | Extraction returns valid fields |
| OCR succeeds even when PDF.js cannot render | Works with any valid PDF |
| Clear user feedback during processing | Toast shows "AI OCR Processing..." |

---

## Security & Audit

- Original PDF stored (already implemented via upload flow)
- Raw OCR text stored in `rawText` field
- Extraction source tracked: `pdf_text` vs `ai_ocr`
- Confidence scores preserved for each field

---

## What This Fix Does NOT Include

These are explicitly out of scope as per the instruction:
- More error classification
- More PDF.js worker tweaks  
- More retry wrappers
- More fallback chains using the same canvas logic

This is a **pipeline replacement**, not an incremental improvement.

