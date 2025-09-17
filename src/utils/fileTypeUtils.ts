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
  const extension = normalizeFileType(fileType);
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  
  switch (extension) {
    case 'pdf':
      // Generate a minimal but valid PDF structure
      return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 180
>>
stream
BT
/F1 14 Tf
50 750 Td
(Document: ${baseName}) Tj
0 -25 Td
(Generated: ${new Date().toLocaleDateString()}) Tj
0 -30 Td
(This is a sample PDF document for demonstration) Tj
0 -20 Td
(purposes in the document management system.) Tj
0 -30 Td
(Content includes:) Tj
0 -18 Td
(- Document preview capability) Tj
0 -18 Td
(- Download functionality) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000506 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
573
%%EOF`;
    
    case 'doc':
    case 'docx':
      return `DOCUMENT: ${baseName.toUpperCase()}

Generated: ${new Date().toLocaleDateString()}

=== LEGAL DOCUMENT SAMPLE ===

Client: MultiState Logistics Limited
Case Reference: GST/2024/001
Document Type: ${extension.toUpperCase()} Document

CONTENT OVERVIEW:
This is a comprehensive sample document demonstrating the document management system's capabilities for handling Microsoft Word documents.

KEY SECTIONS:
1. Document Properties
   • File Format: ${fileType}
   • Created: ${new Date().toISOString()}
   • System: Law Firm Management Platform

2. Legal Content Sample
   • Matter: Tax Assessment Appeal
   • Jurisdiction: High Court
   • Status: Active
   
3. Document Features
   ✓ Preview functionality
   ✓ Download capability
   ✓ Search integration
   ✓ Metadata management

CONCLUSION:
This document demonstrates the system's ability to handle various document formats while maintaining proper preview and download functionality.

--- END OF DOCUMENT ---`;
    
    case 'txt':
      return `=== LEGAL TEXT DOCUMENT ===

Document: ${baseName}
Created: ${new Date().toLocaleDateString()}
File Type: Plain Text Document

CLIENT INFORMATION:
Name: MultiState Logistics Limited
Case: GST/2024/001
Matter: Tax Assessment Appeal

DOCUMENT DETAILS:
This sample text document demonstrates the document management system's 
capability to handle plain text files effectively.

CONTENT FEATURES:
- Text file processing and preview
- Search functionality integration  
- Download and sharing capabilities
- Metadata extraction and indexing

SAMPLE LEGAL CONTENT:
Subject: Notice of Appeal - Assessment Order
Date: ${new Date().toLocaleDateString()}
Reference: GST/APPEAL/2024/001

This document contains sample content relevant to legal proceedings
and demonstrates the document management workflow within the system.

TECHNICAL SPECIFICATIONS:
- Character encoding: UTF-8
- Content type: text/plain
- Generated automatically for demonstration
- Compatible with all text processors

=== END OF TEXT DOCUMENT ===`;
    
    case 'json':
      return JSON.stringify({
        documentName: baseName,
        fileType: fileType,
        generatedAt: new Date().toISOString(),
        legalDocument: {
          client: "MultiState Logistics Limited",
          caseNumber: "GST/2024/001",
          documentType: "Legal JSON Document",
          status: "Active",
          metadata: {
            tags: ["legal", "gst", "appeal"],
            confidential: false,
            version: "1.0",
            lastModified: new Date().toISOString()
          }
        },
        content: {
          title: `Sample JSON Document: ${baseName}`,
          description: "Structured legal document data for demonstration",
          sections: [
            {
              id: 1,
              title: "Case Overview",
              content: "Tax assessment appeal documentation"
            },
            {
              id: 2,
              title: "System Features",
              content: "Document management and preview capabilities"
            }
          ],
          attachments: [],
          workflow: {
            status: "draft",
            assignedTo: "Legal Team",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      }, null, 2);
    
    default:
      return `=== LEGAL DOCUMENT SAMPLE ===

Document: ${baseName}
File Type: ${extension.toUpperCase()}
Generated: ${new Date().toLocaleDateString()}

CLIENT INFORMATION:
Name: MultiState Logistics Limited
Case: GST/2024/001
Document Category: ${extension} file

DOCUMENT DESCRIPTION:
This is a sample document created by the document management system
to demonstrate file handling capabilities for "${extension}" files.

SYSTEM FEATURES DEMONSTRATED:
✓ Document preview functionality
✓ Download and sharing capability  
✓ Search and indexing integration
✓ Metadata management
✓ Content type handling

LEGAL CONTENT SAMPLE:
Matter: Tax Assessment Appeal
Court: High Court
Status: Active proceeding
Priority: Standard

TECHNICAL INFORMATION:
- Original MIME Type: ${fileType}
- Normalized Extension: ${extension}
- System: Law Firm Management Platform
- Module: Document Management System
- Generated: ${new Date().toISOString()}

This content demonstrates the system's ability to handle various
file formats while maintaining proper document management workflows.

=== END OF DOCUMENT ===`;
  }
};