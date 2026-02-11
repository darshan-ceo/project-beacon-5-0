

# Fix: Document Preview Blocked by Chrome (ERR_BLOCKED_BY_CLIENT)

## Problem

When clicking the View (eye) button on a document in the Documents tab, Chrome shows "This page has been blocked by Chrome" with error `ERR_BLOCKED_BY_CLIENT`. The download button works fine.

## Root Cause

The `previewDocument` function in `documentDownloadService.ts` creates a `blob:` URL via `URL.createObjectURL()` and opens it with `window.open(url, '_blank')`. Browser extensions (ad blockers) and Chrome's built-in popup blocker frequently block `window.open()` calls with `blob:` URLs, resulting in the blocked page.

## Fix

Replace the blob URL approach with **signed URLs** for preview. Signed URLs are standard HTTPS URLs served from the storage backend -- they are never blocked by ad blockers or popup blockers.

### File: `src/services/documentDownloadService.ts`

Update the `previewDocument` function to use signed URLs for all previewable types instead of blob URLs:

**Current flow (broken):**
1. Download file as blob
2. Create blob URL via `URL.createObjectURL()`
3. `window.open(blobUrl)` -- BLOCKED by Chrome

**New flow (reliable):**
1. Create signed URL from storage (valid 1 hour)
2. `window.open(signedUrl)` -- Standard HTTPS, never blocked

For PDFs and images, the signed URL approach works natively in all browsers -- Chrome will render PDFs inline and display images directly.

```typescript
// BEFORE (blocked):
if (nativePreviewableTypes.includes(fileExt || '')) {
  const { data: blob } = await supabase.storage.from('documents').download(filePath);
  const url = URL.createObjectURL(typedBlob);
  window.open(url, '_blank');  // BLOCKED
}

// AFTER (reliable):
if (nativePreviewableTypes.includes(fileExt || '')) {
  const { data: signedData } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600);
  window.open(signedData.signedUrl, '_blank');  // Standard HTTPS - works
}
```

This also simplifies the code by removing the blob download step and the cleanup timer for revoking object URLs.

## Files to Modify

1. **`src/services/documentDownloadService.ts`** -- Replace blob-based preview with signed URL approach for native previewable types (PDF, images, text)

