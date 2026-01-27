

# Fix: Document Download and View Functionality Not Working

## Problem Summary

The Document Management module has download and view issues where:
1. Download shows "success" message but downloaded files appear corrupted or can't be opened
2. Different behavior observed for PNG, Excel, and PDF files
3. View functionality sometimes fails to open documents properly

## Root Cause Analysis

After thorough investigation, I identified **three critical issues**:

### Issue 1: Cross-Origin Download Attribute Limitation

**Current Implementation** (Lines 703-711 in `DocumentManagement.tsx`):
```typescript
const signedUrl = await supabaseDocumentService.getDownloadUrl(filePath, 3600);

// Trigger download using anchor tag with download attribute
const link = document.createElement('a');
link.href = signedUrl;
link.download = doc.name || doc.fileName || 'document.pdf';
document.body.appendChild(link);
link.click();
```

**Problem**: The HTML5 `download` attribute **does not work for cross-origin URLs**. When the browser encounters a signed URL from Supabase (`myncxddatwvtyiioqekh.supabase.co`), the `download` attribute is ignored. Instead of downloading, the browser:
- Opens the URL in the current tab or new window
- May show a corrupted preview if MIME type is misinterpreted
- For binary files (Excel, images), the browser may fail to handle them correctly

### Issue 2: Missing MIME Type Metadata

From database query results:
```
file_name: Whats Xpress and Geo Xpress.png
mime_type: <nil>  ← Missing!
storage_url: <nil>  ← Missing!
```

Some documents (especially employee documents) are uploaded without proper `mime_type` and `storage_url` fields. When these files are downloaded, the browser doesn't know how to handle them.

### Issue 3: Inconsistent Storage Path Formats

Documents have different `file_path` formats:
- Standard: `tenant_id/document_id.ext`
- Employee docs: `tenant_id/employees/empId/docType/timestamp-filename.ext`

The current code handles `file_path` correctly, but the missing metadata causes issues downstream.

---

## Solution: Blob-Based Download Approach

Replace the problematic anchor-tag approach with a **fetch + blob** approach that:
1. Fetches the file content via signed URL
2. Creates a local blob with correct MIME type
3. Downloads using `createObjectURL` (same-origin, no cross-origin issues)

This is the same pattern used successfully in `ClientDocumentLibrary.tsx` (lines 200-258).

---

## Implementation Plan

### Step 1: Create Robust Download/View Utility

**File: `src/services/documentDownloadService.ts`** (New)

Create a dedicated service for document operations:

```typescript
import { supabase } from '@/integrations/supabase/client';

interface DownloadResult {
  success: boolean;
  error?: string;
}

/**
 * Get MIME type from file extension
 */
const getMimeType = (fileType: string): string => {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'csv': 'text/csv'
  };
  return mimeTypes[fileType?.toLowerCase()] || 'application/octet-stream';
};

/**
 * Download document as blob and trigger browser download
 */
export const downloadDocumentAsBlob = async (
  filePath: string,
  fileName: string,
  fileType?: string
): Promise<DownloadResult> => {
  try {
    // Method 1: Try direct download from storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (downloadError) {
      console.log('Direct download failed, trying signed URL:', downloadError.message);
      
      // Method 2: Fallback to signed URL + fetch
      const { data: signedData, error: signedError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);
      
      if (signedError || !signedData?.signedUrl) {
        throw new Error(signedError?.message || 'Failed to create signed URL');
      }
      
      const response = await fetch(signedData.signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const fetchedBlob = await response.blob();
      
      // Ensure correct MIME type
      const mimeType = fileType ? getMimeType(fileType) : fetchedBlob.type || 'application/octet-stream';
      const typedBlob = new Blob([fetchedBlob], { type: mimeType });
      
      triggerDownload(typedBlob, fileName);
      return { success: true };
    }

    // Direct download succeeded - ensure correct MIME type
    const mimeType = fileType ? getMimeType(fileType) : blob.type || 'application/octet-stream';
    const typedBlob = new Blob([blob], { type: mimeType });
    
    triggerDownload(typedBlob, fileName);
    return { success: true };
    
  } catch (error: any) {
    console.error('Document download failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Open document for preview in new tab
 */
export const previewDocument = async (
  filePath: string,
  fileName: string,
  fileType?: string
): Promise<DownloadResult> => {
  try {
    // For PDFs and images, try direct blob approach for reliable preview
    const fileExt = fileType || filePath.split('.').pop()?.toLowerCase();
    const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'];
    
    if (previewableTypes.includes(fileExt || '')) {
      const { data: blob, error } = await supabase.storage
        .from('documents')
        .download(filePath);
      
      if (!error && blob) {
        const mimeType = getMimeType(fileExt || '');
        const typedBlob = new Blob([blob], { type: mimeType });
        const url = URL.createObjectURL(typedBlob);
        
        window.open(url, '_blank');
        
        // Revoke after delay to allow browser to load
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return { success: true };
      }
    }
    
    // Fallback: Use signed URL (works for most browsers)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600);
    
    if (signedError || !signedData?.signedUrl) {
      throw new Error(signedError?.message || 'Failed to create preview URL');
    }
    
    window.open(signedData.signedUrl, '_blank');
    return { success: true };
    
  } catch (error: any) {
    console.error('Document preview failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Trigger browser download from blob
 */
const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const documentDownloadService = {
  download: downloadDocumentAsBlob,
  preview: previewDocument,
  getMimeType
};
```

### Step 2: Update DocumentManagement Handlers

**File: `src/components/documents/DocumentManagement.tsx`**

Replace the current `handleDocumentView` and `handleDocumentDownload` functions:

**Lines 656-730** - Replace with:

```typescript
import { documentDownloadService } from '@/services/documentDownloadService';

// ... inside component ...

const handleDocumentView = useCallback(async (doc: any) => {
  try {
    console.log('📖 [DocumentManagement] Attempting to preview document:', {
      id: doc.id,
      name: doc.name,
      filePath: doc.filePath || doc.file_path
    });

    const filePath = doc.filePath || doc.file_path;
    if (!filePath) {
      throw new Error('No file path available for preview');
    }

    const fileType = doc.type || doc.fileType || doc.file_type || 
                     filePath.split('.').pop()?.toLowerCase();
    
    const result = await documentDownloadService.preview(
      filePath,
      doc.name || doc.fileName || 'document',
      fileType
    );

    if (!result.success) {
      throw new Error(result.error || 'Preview failed');
    }

    toast({
      title: "Opening Document",
      description: `${doc.name} opened for preview`,
    });

  } catch (error: any) {
    console.error('❌ [DocumentManagement] Preview error:', error);
    toast({
      title: "Preview Error",
      description: error.message || "Unable to preview this document. Try downloading instead.",
      variant: "destructive",
    });
  }
}, []);

const handleDocumentDownload = useCallback(async (doc: any) => {
  try {
    console.log('⬇️ [DocumentManagement] Attempting to download document:', {
      id: doc.id,
      name: doc.name,
      filePath: doc.filePath || doc.file_path
    });

    const filePath = doc.filePath || doc.file_path;
    if (!filePath) {
      throw new Error('No file path available for download');
    }

    const fileType = doc.type || doc.fileType || doc.file_type || 
                     filePath.split('.').pop()?.toLowerCase();
    const fileName = doc.name || doc.fileName || `document.${fileType || 'bin'}`;

    toast({
      title: "Preparing Download",
      description: `Downloading ${fileName}...`,
    });

    const result = await documentDownloadService.download(
      filePath,
      fileName,
      fileType
    );

    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }

    toast({
      title: "Download Complete",
      description: `${fileName} downloaded successfully`,
    });

  } catch (error: any) {
    console.error('❌ [DocumentManagement] Download error:', error);
    toast({
      title: "Download Error",
      description: error.message || "Unable to download this document.",
      variant: "destructive",
    });
  }
}, []);
```

### Step 3: Update CaseDocuments Handlers

**File: `src/components/cases/CaseDocuments.tsx`**

Update the `handlePreviewDocument` and `handleDownloadDocument` functions to use the same service (around lines 240-320).

### Step 4: Fix Employee Document Uploads

**File: `src/services/employeeDocumentService.ts`**

Ensure `mime_type` is always set during upload. Add to the upload logic:

```typescript
// Ensure mime_type is set
const mimeType = file.type || getMimeTypeFromExtension(file.name.split('.').pop() || '');

// Include in database record
mime_type: mimeType,
```

---

## Technical Details

### Why Blob Approach Works

| Approach | Cross-Origin | MIME Handling | Reliability |
|----------|--------------|---------------|-------------|
| Anchor + download attr | Fails for cross-origin | Browser dependent | Low |
| Signed URL + window.open | Works (view only) | Browser dependent | Medium |
| **Blob + createObjectURL** | Works (same-origin blob) | Explicit control | High |

### Data Flow After Fix

```
User clicks Download/View
        ↓
documentDownloadService called
        ↓
supabase.storage.download(filePath)  ← First attempt: direct blob
        ↓
If fails → createSignedUrl + fetch  ← Fallback
        ↓
Create typed Blob with correct MIME
        ↓
URL.createObjectURL(blob)  ← Same-origin URL!
        ↓
Trigger download or open in new tab
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/documentDownloadService.ts` | Create | New service for reliable downloads |
| `src/components/documents/DocumentManagement.tsx` | Modify | Update handlers (lines 656-730) |
| `src/components/cases/CaseDocuments.tsx` | Modify | Update handlers (lines 240-320) |
| `src/components/documents/RecentDocuments.tsx` | No change | Already uses passed callbacks |
| `src/services/employeeDocumentService.ts` | Modify | Ensure mime_type is set on upload |

---

## Expected Results

| Scenario | Before | After |
|----------|--------|-------|
| Download PDF | Shows success but file corrupted | File downloads correctly |
| Download Excel | Corrupted or opens in browser | Downloads as valid .xlsx |
| Download PNG | May show inline instead of download | Downloads correctly |
| View PDF | Sometimes fails | Opens in new tab reliably |
| View image | May show decode error | Displays correctly |
| Employee docs (missing mime_type) | Fails to open | Downloads with detected MIME |

---

## Testing Checklist

After implementation, verify:
1. PDF download - opens in viewer correctly
2. Excel download - opens in Excel/compatible app
3. PNG/JPG download - opens in image viewer
4. PDF preview - opens in new browser tab
5. Image preview - displays correctly
6. Employee documents - download despite missing metadata
7. Large files (>1MB) - download completes without corruption

