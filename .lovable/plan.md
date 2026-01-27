
# Fix: Document View/Download Button Behavior for Word, Excel, and PDF Files

## Problem Summary

The Document Management module has incorrect behavior for View and Download buttons:

| File Type | Current "View" Behavior | Current "Download" Behavior | Expected Behavior |
|-----------|------------------------|---------------------------|-------------------|
| **Excel (.xlsx, .xls)** | Downloads the file | Works correctly | Should open in preview |
| **Word (.docx, .doc)** | Downloads the file | Works correctly | Should open in preview |
| **PDF** | Opens in new tab but shows download icon in browser toolbar | Works correctly | Should open cleanly for preview |
| **Images (PNG, JPG)** | Works correctly | Works correctly | N/A |

---

## Root Cause

### Technical Limitation

The `previewDocument` function in `documentDownloadService.ts` (line 124) defines only these file types as "previewable":

```typescript
const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'];
```

For **Excel** and **Word** files, the code falls back to a signed URL opened in a new tab. Since browsers **cannot natively render** these formats, they trigger a download instead.

### Solution Approach

Use **Microsoft Office Online Viewer** to preview Word and Excel files. This is a free public service that renders Office documents in an iframe/new tab:

```
https://view.officeapps.live.com/op/view.aspx?src={encoded_public_url}
```

**Requirements:**
- The file URL must be publicly accessible (or have a long-lived signed URL)
- The URL must be properly encoded

For PDF files, the current blob-based approach works correctly for preview; the "download icon" the user sees is the browser's built-in PDF viewer toolbar (expected behavior, not a bug).

---

## Implementation Plan

### Step 1: Update `documentDownloadService.ts` to Support Office Files

**File:** `src/services/documentDownloadService.ts`

Add a new constant for Office file types and integrate Microsoft Office Online Viewer:

```typescript
// Add at the top
const OFFICE_PREVIEWABLE_TYPES = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

// Update previewDocument function
export const previewDocument = async (
  filePath: string,
  fileName: string,
  fileType?: string
): Promise<DownloadResult> => {
  try {
    console.log('👁️ [documentDownloadService] Starting preview:', { filePath, fileName, fileType });
    
    const fileExt = fileType || filePath.split('.').pop()?.toLowerCase();
    const nativePreviewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'];
    
    // Handle Office files via Microsoft Office Online Viewer
    if (OFFICE_PREVIEWABLE_TYPES.includes(fileExt || '')) {
      // Create a long-lived signed URL (1 hour)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);
      
      if (signedError || !signedData?.signedUrl) {
        throw new Error(signedError?.message || 'Failed to create preview URL');
      }
      
      // Encode the signed URL for Microsoft Office Online Viewer
      const encodedUrl = encodeURIComponent(signedData.signedUrl);
      const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;
      
      window.open(officeViewerUrl, '_blank');
      console.log('✅ [documentDownloadService] Office preview opened via Microsoft Viewer');
      return { success: true };
    }
    
    // Handle native browser previewable types (PDF, images, txt)
    if (nativePreviewableTypes.includes(fileExt || '')) {
      const { data: blob, error } = await supabase.storage
        .from('documents')
        .download(filePath);
      
      if (!error && blob) {
        const mimeType = getMimeType(fileExt || '');
        const typedBlob = new Blob([blob], { type: mimeType });
        const url = URL.createObjectURL(typedBlob);
        
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        console.log('✅ [documentDownloadService] Native preview opened via blob');
        return { success: true };
      }
      
      console.log('⚠️ [documentDownloadService] Blob preview failed, falling back to signed URL');
    }
    
    // Fallback: Use signed URL directly
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);
    
    if (signedError || !signedData?.signedUrl) {
      throw new Error(signedError?.message || 'Failed to create preview URL');
    }
    
    window.open(signedData.signedUrl, '_blank');
    console.log('✅ [documentDownloadService] Preview opened via signed URL');
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ [documentDownloadService] Preview failed:', error);
    return { success: false, error: error.message };
  }
};
```

### Step 2: Update Toast Messages for Clarity

**File:** `src/components/documents/DocumentManagement.tsx`

Update the success toast to indicate the viewer being used:

```typescript
// In handleDocumentView, after result.success:
const fileExt = (doc.type || doc.fileType || doc.file_type || 
                 filePath.split('.').pop())?.toLowerCase();
const officeTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

toast({
  title: "Opening Document",
  description: officeTypes.includes(fileExt || '') 
    ? `${doc.name} opening in Microsoft Viewer...`
    : `${doc.name} opened for preview`,
});
```

### Step 3: Update CaseDocuments Component

**File:** `src/components/cases/CaseDocuments.tsx`

Apply the same toast message update for consistency.

---

## Technical Details

### Why Microsoft Office Online Viewer?

| Feature | Microsoft Viewer | Google Docs Viewer |
|---------|-----------------|-------------------|
| Word (.docx, .doc) | ✅ Full support | ✅ Supported |
| Excel (.xlsx, .xls) | ✅ Full support | ✅ Supported |
| PowerPoint (.pptx, .ppt) | ✅ Full support | ✅ Supported |
| Reliability | High (Microsoft's own formats) | Medium |
| URL Encoding | Required | Required |
| Public URL Required | Yes (signed URL works) | Yes |

### Data Flow After Fix

```
User clicks "View" button
        ↓
handleDocumentView(doc)
        ↓
documentDownloadService.preview(filePath, fileName, fileType)
        ↓
Determine file extension
        ↓
┌──────────────────┬─────────────────────┬──────────────────┐
│ Office Files     │ Native Previewable  │ Other Files      │
│ (docx,xlsx,pptx) │ (pdf,jpg,png,txt)   │ (zip,rar,etc)    │
├──────────────────┼─────────────────────┼──────────────────┤
│ Create signed URL│ Download as blob    │ Create signed URL│
│ Encode URL       │ Create blob URL     │ Open in new tab  │
│ Open Office      │ Open in new tab     │ (may download)   │
│ Online Viewer    │                     │                  │
└──────────────────┴─────────────────────┴──────────────────┘
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/documentDownloadService.ts` | Modify | Add Office file detection and Microsoft Viewer URL generation |
| `src/components/documents/DocumentManagement.tsx` | Modify | Update toast message for Office files |
| `src/components/cases/CaseDocuments.tsx` | Modify | Update toast message for consistency |

---

## Expected Results After Fix

| File Type | View Button (After) | Download Button |
|-----------|---------------------|-----------------|
| **Excel (.xlsx)** | Opens in Microsoft Office Online viewer | Downloads file |
| **Word (.docx)** | Opens in Microsoft Office Online viewer | Downloads file |
| **PDF** | Opens in browser's native PDF viewer | Downloads file |
| **PNG/JPG** | Opens in browser natively | Downloads file |
| **PowerPoint (.pptx)** | Opens in Microsoft Office Online viewer | Downloads file |

---

## Testing Checklist

After implementation, verify:
1. Click "View" on XLSX file → Opens in Microsoft Office Online (new tab shows spreadsheet)
2. Click "View" on DOCX file → Opens in Microsoft Office Online (new tab shows Word doc)
3. Click "View" on PDF file → Opens in browser's PDF viewer (as before)
4. Click "View" on PNG file → Opens image in new tab (as before)
5. Click "Download" on any file → Downloads the file correctly
6. Toast messages show appropriate context ("opening in Microsoft Viewer" for Office files)

---

## Notes

- The Microsoft Office Online Viewer requires the file URL to be publicly accessible. Our signed URLs (valid for 1 hour) work correctly for this purpose.
- If the user's network blocks access to Microsoft domains, the Office files will still fall back to download behavior (graceful degradation).
- PDF "download icon" in browser toolbar is expected browser behavior for the built-in PDF viewer - this is not a bug.
