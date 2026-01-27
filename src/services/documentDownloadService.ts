import { supabase } from '@/integrations/supabase/client';

interface DownloadResult {
  success: boolean;
  error?: string;
}

// Office file types that can be previewed via Microsoft Office Online Viewer
const OFFICE_PREVIEWABLE_TYPES = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

/**
 * Get MIME type from file extension
 */
export const getMimeType = (fileType: string): string => {
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
    'csv': 'text/csv',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4'
  };
  return mimeTypes[fileType?.toLowerCase()] || 'application/octet-stream';
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

/**
 * Download document as blob and trigger browser download
 * Uses blob approach to avoid cross-origin issues with the download attribute
 */
export const downloadDocumentAsBlob = async (
  filePath: string,
  fileName: string,
  fileType?: string
): Promise<DownloadResult> => {
  try {
    console.log('📥 [documentDownloadService] Starting download:', { filePath, fileName, fileType });
    
    // Method 1: Try direct download from storage (returns Blob)
    const { data: blob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (downloadError) {
      console.log('⚠️ [documentDownloadService] Direct download failed, trying signed URL:', downloadError.message);
      
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
      const detectedType = fileType || filePath.split('.').pop()?.toLowerCase();
      const mimeType = detectedType ? getMimeType(detectedType) : fetchedBlob.type || 'application/octet-stream';
      const typedBlob = new Blob([fetchedBlob], { type: mimeType });
      
      triggerDownload(typedBlob, fileName);
      console.log('✅ [documentDownloadService] Download successful via signed URL');
      return { success: true };
    }

    // Direct download succeeded - ensure correct MIME type
    const detectedType = fileType || filePath.split('.').pop()?.toLowerCase();
    const mimeType = detectedType ? getMimeType(detectedType) : blob.type || 'application/octet-stream';
    const typedBlob = new Blob([blob], { type: mimeType });
    
    triggerDownload(typedBlob, fileName);
    console.log('✅ [documentDownloadService] Download successful via direct download');
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ [documentDownloadService] Download failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Open document for preview in new tab
 * Uses blob approach for previewable types to ensure correct rendering
 */
export const previewDocument = async (
  filePath: string,
  fileName: string,
  fileType?: string
): Promise<DownloadResult> => {
  try {
    console.log('👁️ [documentDownloadService] Starting preview:', { filePath, fileName, fileType });
    
    // Determine file extension
    const fileExt = fileType || filePath.split('.').pop()?.toLowerCase();
    const nativePreviewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'];
    
    // Handle Office files via Microsoft Office Online Viewer
    if (OFFICE_PREVIEWABLE_TYPES.includes(fileExt || '')) {
      console.log('📄 [documentDownloadService] Office file detected, using Microsoft Viewer');
      
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
      return { success: true, isOfficeViewer: true } as DownloadResult & { isOfficeViewer?: boolean };
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
        
        // Revoke after delay to allow browser to load
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        console.log('✅ [documentDownloadService] Native preview opened via blob');
        return { success: true };
      }
      
      console.log('⚠️ [documentDownloadService] Blob preview failed, falling back to signed URL');
    }
    
    // Fallback: Use signed URL directly (may trigger download for unsupported types)
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

/**
 * Check if a file type uses Office Online Viewer
 */
export const isOfficePreviewable = (fileType?: string): boolean => {
  return OFFICE_PREVIEWABLE_TYPES.includes(fileType?.toLowerCase() || '');
};

export const documentDownloadService = {
  download: downloadDocumentAsBlob,
  preview: previewDocument,
  getMimeType,
  isOfficePreviewable
};
