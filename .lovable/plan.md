
# Fix Notice OCR - PDF.js Worker Fallback Not Working

## Problem Summary

Despite file size displaying correctly (3.1 KB), the extraction still fails with "Failed to extract text from PDF". The issue is that the current worker fallback implementation is **incorrect** for PDF.js v5.

## Root Cause Analysis

### What's Happening
1. **Worker Loading Fails** - The PDF.js web worker (`pdf.worker.min.mjs`) fails to load due to browser CSP restrictions, network issues, or extension blocking
2. **Incorrect Fallback** - The current code uses `useWorkerFetch: false` which does NOT disable the worker - it only disables the Fetch API inside the worker thread
3. **Both Attempts Fail** - Since both attempts still try to use the broken worker, extraction fails

### Why Current Fallback Doesn't Work
```typescript
// Current code (WRONG)
const pdf = await pdfjsLib.getDocument({ 
  data: arrayBuffer, 
  useWorkerFetch: false,  // This doesn't disable the worker!
  isEvalSupported: false
}).promise;
```

The `useWorkerFetch` option tells PDF.js not to use Fetch API in the worker for loading CMaps/fonts - it doesn't disable the worker itself.

---

## Solution

### Approach: Clear workerSrc on Fallback

PDF.js v5+ automatically uses a "fake worker" (main-thread processing) when:
- `GlobalWorkerOptions.workerSrc` is not set AND
- No `worker` option is provided to `getDocument()`

The fix is to temporarily clear `workerSrc` before the retry attempt to trigger the internal fake worker mechanism.

---

## Technical Implementation

### File: `src/services/noticeExtractionService.ts`

#### Step 1: Update the `loadPdf()` Method

Replace the current retry logic with a proper fake-worker fallback:

```typescript
private async loadPdf(arrayBuffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  console.log('📄 [PDF.js] Loading PDF, buffer size:', arrayBuffer.byteLength);
  
  if (arrayBuffer.byteLength === 0) {
    const error = new Error('PDF file is empty (0 bytes)') as PDFLoadError;
    error.category = 'file_empty';
    error.technicalDetails = 'ArrayBuffer has 0 bytes';
    throw error;
  }
  
  // Check PDF header (%PDF-)
  const header = new Uint8Array(arrayBuffer.slice(0, 5));
  const headerString = String.fromCharCode(...header);
  console.log('📄 [PDF.js] File header:', headerString);
  
  if (headerString !== '%PDF-') {
    console.warn('📄 [PDF.js] Invalid PDF header:', headerString);
    const error = new Error('File does not have a valid PDF header') as PDFLoadError;
    error.category = 'invalid_pdf';
    error.technicalDetails = `Header: "${headerString}" (expected "%PDF-")`;
    throw error;
  }
  
  // Try with worker first
  try {
    console.log('📄 [PDF.js] Attempting load with worker...');
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    console.log('📄 [PDF.js] Worker mode succeeded, pages:', pdf.numPages);
    return pdf;
  } catch (workerError) {
    const classified = this.classifyPDFError(workerError);
    console.warn('📄 [PDF.js] Worker mode failed:', classified.technicalDetails);
    
    // Don't retry for password-protected or invalid PDFs
    if (classified.category === 'password_protected' || classified.category === 'invalid_pdf') {
      const error = new Error(classified.userMessage) as PDFLoadError;
      error.category = classified.category;
      error.technicalDetails = classified.technicalDetails;
      throw error;
    }
    
    // Retry WITHOUT worker by temporarily clearing workerSrc
    // This triggers PDF.js's internal fake-worker (main-thread processing)
    try {
      console.log('📄 [PDF.js] Retrying with fake worker (main thread)...');
      
      // Save and clear workerSrc to force fake worker
      const originalWorkerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc;
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      
      try {
        const pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          // Don't pass a worker - PDF.js will use main thread
        }).promise;
        console.log('📄 [PDF.js] Fake worker mode succeeded, pages:', pdf.numPages);
        return pdf;
      } finally {
        // Restore workerSrc for future attempts
        pdfjsLib.GlobalWorkerOptions.workerSrc = originalWorkerSrc;
      }
    } catch (noWorkerError) {
      const retryClassified = this.classifyPDFError(noWorkerError);
      console.error('📄 [PDF.js] Both modes failed:', retryClassified.technicalDetails);
      
      const error = new Error(retryClassified.userMessage) as PDFLoadError;
      error.category = retryClassified.category;
      error.technicalDetails = `Worker: ${classified.technicalDetails} | Fake worker: ${retryClassified.technicalDetails}`;
      throw error;
    }
  }
}
```

---

## Alternative Approach: Import Legacy Build

If the fake-worker fallback doesn't work reliably, use the legacy build that's designed for better compatibility:

```typescript
// Option B: Use legacy build for fallback
import * as pdfjsLibLegacy from 'pdfjs-dist/legacy/build/pdf.mjs';

// In fallback code:
const pdf = await pdfjsLibLegacy.getDocument({ data: arrayBuffer }).promise;
```

---

## Expected Outcome

After this fix:
1. **Worker mode tried first** - Fast, uses Web Worker for parsing
2. **If worker fails** - Automatically falls back to main-thread parsing (slower but works)
3. **Clear error messages** - Password, invalid PDF, etc. are detected and reported
4. **Extraction proceeds** - Either to OpenAI Vision or regex fallback

---

## Files to Change

| File | Changes |
|------|---------|
| `src/services/noticeExtractionService.ts` | Update `loadPdf()` to clear `workerSrc` before retry instead of using `useWorkerFetch` |

---

## Validation Steps

1. Hard refresh the page
2. Upload the same 3.1 KB PDF
3. File size should show correctly (already working)
4. Console should show:
   - `📄 [PDF.js] Attempting load with worker...`
   - `📄 [PDF.js] Worker mode failed: [error details]`
   - `📄 [PDF.js] Retrying with fake worker (main thread)...`
   - `📄 [PDF.js] Fake worker mode succeeded, pages: 1`
5. Extraction should complete (either via OpenAI or regex fallback)
