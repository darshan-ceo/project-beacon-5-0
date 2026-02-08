
# Fix: Scanned PDF Extraction Fails Despite OpenAI API Key Being Configured

## Problem Summary

When uploading a scanned ASMT-10 PDF with OpenAI Vision API configured:
- UI correctly shows "OpenAI Vision Active" badge
- File size shows correctly (3.1 KB)  
- But extraction fails with: "Vision OCR is required but unavailable. Please configure an OpenAI API key"

This error is **misleading** - the API key IS configured, but something else is failing.

---

## Root Cause Analysis

The extraction flow for scanned PDFs is:

```text
1. Try extractWithAI(file)       ← OpenAI Vision
   └─> pdfToBase64Images(file)   ← Convert PDF pages to PNG
   └─> fetch OpenAI API

2. If fails → Try extractWithLovableAI(file)  ← Lovable AI fallback
   └─> pdfToBase64Images(file)               ← SAME conversion
   └─> fetch edge function

3. If both fail → Show "Vision OCR unavailable"
```

**Critical Bug**: Both Vision paths call `pdfToBase64Images()` which uses `loadPdf()`. If PDF.js worker fails during image rendering (not just text extraction), BOTH paths fail before any API call is made.

**Evidence**: No edge function logs for `notice-ocr` - meaning the Lovable AI call never reached the server.

**Why this happens**:
- `loadPdf()` was fixed for text extraction with fake-worker fallback
- BUT `pdfToBase64Images()` needs to RENDER pages to canvas, which may have different failure modes
- Canvas rendering might fail silently even if document loading succeeds

---

## Solution

### Part 1: Fix Error Message Specificity

The error message must distinguish between:
- **API key not configured** → "Please configure an OpenAI API key"
- **API call failed** → "Vision OCR call failed: [specific error]"  
- **PDF rendering failed** → "Could not convert PDF to images for OCR"

### Part 2: Preserve and Surface Actual Errors

Currently errors are logged but the final message is always generic. Need to:
1. Capture the actual error from each failed attempt
2. Include it in the final error message
3. Help users and developers diagnose the real issue

### Part 3: Add Robust Error Handling in pdfToBase64Images

Add try-catch around canvas rendering to detect render failures separately from load failures.

---

## Implementation Details

### File: `src/services/noticeExtractionService.ts`

#### Change 1: Track Error Details in extractFromPDF

```typescript
// In the scanned PDF path, track specific errors
let openAiError: string = '';
let lovableAiError: string = '';

try {
  const aiResult = await this.extractWithAI(file);
  // ... success
} catch (aiError) {
  openAiError = aiError instanceof Error ? aiError.message : JSON.stringify(aiError);
  console.log('⚠️ [Scanned PDF] OpenAI Vision failed:', openAiError);
  // ... continue to Lovable AI
}

try {
  const lovableResult = await this.extractWithLovableAI(file);
  // ... success
} catch (lovableError) {
  lovableAiError = lovableError instanceof Error ? lovableError.message : JSON.stringify(lovableError);
  console.log('❌ [Scanned PDF] Lovable AI also failed:', lovableAiError);
}

// If no Vision OCR succeeded
if (!visionSuccess) {
  // Build specific error message based on what failed
  let errorMessage = 'This is a scanned PDF with no text layer. ';
  
  if (openAiError.includes('not configured')) {
    errorMessage += 'Vision OCR requires an OpenAI API key. Please configure it above.';
  } else if (openAiError.includes('canvas') || openAiError.includes('render')) {
    errorMessage += 'Could not render PDF pages for OCR. Try a different browser or file.';
  } else if (openAiError.includes('401') || openAiError.includes('invalid')) {
    errorMessage += 'Your OpenAI API key appears invalid. Please check and update it.';
  } else {
    errorMessage += `Vision OCR failed. OpenAI: ${openAiError || 'unavailable'}. Lovable AI: ${lovableAiError || 'unavailable'}`;
  }
  
  return {
    success: false,
    error: errorMessage,
    errorCode: errorCode || 'SCANNED_PDF_NO_OCR',
    isScannedPdf: true
  };
}
```

#### Change 2: Add Error Handling to pdfToBase64Images

```typescript
private async pdfToBase64Images(file: File): Promise<string[]> {
  // ... existing code ...
  
  const images: string[] = [];
  const maxPages = Math.min(pdf.numPages, 4);
  
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error(`Failed to get canvas context for page ${pageNum}`);
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      } as any).promise;
      
      const dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error(`Canvas render produced empty image for page ${pageNum}`);
      }
      
      images.push(dataUrl.split(',')[1]);
    } catch (pageError) {
      console.error(`🖼️ [pdfToBase64Images] Failed to render page ${pageNum}:`, pageError);
      // Continue with other pages, but log the failure
    }
  }
  
  if (images.length === 0) {
    throw new Error('Could not render any PDF pages to images. Canvas rendering failed.');
  }
  
  console.log('🖼️ [pdfToBase64Images] Successfully converted', images.length, 'pages to images');
  return images;
}
```

---

## Files to Change

| File | Changes |
|------|---------|
| `src/services/noticeExtractionService.ts` | Track specific errors, improve error messages, add canvas render validation |

---

## Expected Behavior After Fix

| Scenario | Current | After Fix |
|----------|---------|-----------|
| OpenAI key not configured | "Configure API key" | Same (correct) |
| OpenAI key invalid | "Configure API key" | "Your API key appears invalid" |
| PDF render failed | "Configure API key" | "Could not render PDF for OCR" |
| API call failed (network) | "Configure API key" | "Vision OCR failed: [network error]" |
| Lovable AI also fails | Same generic message | Shows both error details |

---

## Debug Benefits

With these changes, when extraction fails the user will see:
- **Specific error type** (config, auth, render, network)
- **Actionable guidance** based on failure mode
- **Both error messages** if both paths fail

And in console logs, developers will see:
- Exact error from OpenAI Vision attempt
- Exact error from Lovable AI attempt  
- Whether the issue is in PDF rendering or API calls
