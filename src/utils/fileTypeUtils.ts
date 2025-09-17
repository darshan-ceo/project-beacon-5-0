/**
 * File type utilities for consistent MIME type and extension handling
 */

export const FILE_TYPE_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar'
};

export const EXTENSION_TO_MIME: Record<string, string> = {
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed'
};

/**
 * Normalize MIME type to file extension
 */
export const normalizeFileType = (mimeType: string): string => {
  return FILE_TYPE_MAP[mimeType.toLowerCase()] || mimeType.split('/').pop() || 'unknown';
};

/**
 * Get MIME type from file extension
 */
export const getMimeFromExtension = (extension: string): string => {
  const ext = extension.toLowerCase().replace('.', '');
  return EXTENSION_TO_MIME[ext] || 'application/octet-stream';
};

/**
 * Generate sample document content based on file type
 */
export const generateSampleContent = (fileName: string, fileType: string): string => {
  const type = normalizeFileType(fileType);
  
  switch (type) {
    case 'pdf':
      return `Sample PDF Document: ${fileName}\n\nThis is a sample PDF document for demonstration purposes.\n\nContents:\n- Legal brief outline\n- Case references\n- Supporting documentation\n\nGenerated: ${new Date().toISOString()}`;
    
    case 'doc':
    case 'docx':
      return `Sample Word Document: ${fileName}\n\nDocument Content:\n\n1. Introduction\n2. Case Summary\n3. Legal Arguments\n4. Conclusion\n\nThis is sample content for demonstration.`;
    
    case 'txt':
      return `Sample Text File: ${fileName}\n\nThis is a plain text document with sample content.\nUseful for notes, transcripts, or simple documentation.`;
    
    default:
      return `Sample Document: ${fileName}\n\nFile Type: ${type}\nContent: This is sample content for demonstration purposes.\nGenerated: ${new Date().toISOString()}`;
  }
};