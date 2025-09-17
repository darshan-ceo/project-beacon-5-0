import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { HashService } from './hashService';

// Use the Document interface from AppStateContext
interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  caseId: string;
  clientId: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  createdAt?: string; // Make optional for backwards compatibility
  tags: string[];
  isShared: boolean;
  path: string;
  content?: string; // Base64 encoded file content
  folderId?: string; // Associated folder ID
}

// New Folder interface
interface Folder {
  id: string;
  name: string;
  parentId?: string;
  caseId?: string;
  documentCount: number;
  size: number;
  createdAt: string;
  lastAccess: string;
  description?: string;
  path: string;
}

// Tag interface
interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  usageCount: number;
}

// New upload result type for handling duplicates
export interface UploadResult {
  success: boolean;
  document?: Document;
  duplicate?: {
    action: 'replace' | 'version';
    existingDoc: Document;
  };
}

// Enhanced upload options with existing documents for duplicate checking
interface UploadOptions {
  folderId?: string;
  caseId?: string;
  stage?: string;
  tags?: string[];
  existingDocuments?: Document[];
}

// Filter options for document search
interface DocumentFilter {
  caseId?: string;
  folderId?: string;
  stage?: string;
  fileType?: string;
  tags?: string[];
  uploadedBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Predefined folder structure for better organization
// Initialize mock data with persistence
const initializeMockFolders = (): Folder[] => {
  const stored = localStorage.getItem('mockFolders');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse stored folders, using defaults');
    }
  }
  
  return [
    {
      id: 'litigation-docs',
      name: 'Litigation Documents',
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'Court filings, pleadings, and legal documents',
      path: '/folders/litigation-docs'
    },
    {
      id: 'gstat-docs', 
      name: 'GST Assessment',
      parentId: 'litigation-docs',
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'GSTAT and GST assessment documents',
      path: '/folders/litigation-docs/gstat'
    },
    {
      id: 'appeals-docs',
      name: 'Appeals',
      parentId: 'litigation-docs', 
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'Appeal documents and orders',
      path: '/folders/litigation-docs/appeals'
    },
    {
      id: 'client-uploads',
      name: 'Client Documents',
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'Documents uploaded by clients',
      path: '/folders/client-uploads'
    },
    {
      id: 'internal-docs',
      name: 'Internal Documents', 
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'Templates, research, and internal documents',
      path: '/folders/internal-docs'
    },
    {
      id: 'templates',
      name: 'Templates',
      parentId: 'internal-docs',
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'Document templates and forms',
      path: '/folders/internal-docs/templates'
    }
  ];
};

let mockFolders: Folder[] = initializeMockFolders();

// Save to localStorage whenever mockFolders changes
const saveMockFolders = () => {
  try {
    localStorage.setItem('mockFolders', JSON.stringify(mockFolders));
  } catch (error) {
    console.warn('Failed to save folders to localStorage:', error);
  }
};

let mockTags: Tag[] = [
  { id: '1', name: 'urgent', color: '#ef4444', createdAt: '2024-01-10', usageCount: 12 },
  { id: '2', name: 'appeal', color: '#3b82f6', createdAt: '2024-01-10', usageCount: 8 },
  { id: '3', name: 'evidence', color: '#10b981', createdAt: '2024-01-12', usageCount: 15 },
  { id: '4', name: 'order', color: '#f59e0b', createdAt: '2024-01-15', usageCount: 6 }
];

const isDev = import.meta.env.DEV;

const log = (level: 'success' | 'error', tab: string, action: string, details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : 'color: red';
  console.log(`%c[Cases] ${tab} ${action} ${level}`, color, details);
};

export const dmsService = {
// Folder Management
  folders: {
    list: async (parentId?: string): Promise<Folder[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Load folders from localStorage to get all folders including user-created ones
      const storedFolders = localStorage.getItem('dms_folders');
      const allFolders = storedFolders ? JSON.parse(storedFolders) : mockFolders;
      
      return allFolders.filter(f => f.parentId === parentId);
    },

    listAll: async (): Promise<Folder[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Load folders from localStorage to get all folders including user-created ones
      const storedFolders = localStorage.getItem('dms_folders');
      const allFolders = storedFolders ? JSON.parse(storedFolders) : mockFolders;
      
      return [...allFolders];
    },

    create: async (
      name: string, 
      parentId?: string, 
      caseId?: string,
      dispatch?: React.Dispatch<AppAction>
    ): Promise<Folder> => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Validate unique name within parent
      const siblings = mockFolders.filter(f => f.parentId === parentId);
      if (siblings.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Folder name already exists in this location');
      }

      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        name,
        parentId,
        caseId,
        documentCount: 0,
        size: 0,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        path: parentId ? `${mockFolders.find(f => f.id === parentId)?.path}/${name.toLowerCase().replace(/\s+/g, '-')}` : `/folders/${name.toLowerCase().replace(/\s+/g, '-')}`
      };

      mockFolders.push(newFolder);
      saveMockFolders(); // Persist to localStorage
      
      // Sync with AppStateContext for persistence
      if (dispatch) {
        dispatch({ type: 'ADD_FOLDER', payload: newFolder });
      }
      
      log('success', 'DMS', 'createFolder', { folderId: newFolder.id, name });
      
      toast({
        title: "Folder Created",
        description: `Folder "${name}" has been created successfully.`,
      });

      return newFolder;
    },

    rename: async (
      folderId: string, 
      newName: string,
      dispatch?: React.Dispatch<AppAction>
    ): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const folder = mockFolders.find(f => f.id === folderId);
      if (!folder) throw new Error('Folder not found');

      // Check for name conflicts
      const siblings = mockFolders.filter(f => f.parentId === folder.parentId && f.id !== folderId);
      if (siblings.some(f => f.name.toLowerCase() === newName.toLowerCase())) {
        throw new Error('Folder name already exists in this location');
      }

      folder.name = newName;
      saveMockFolders(); // Persist to localStorage
      
      // Sync with AppStateContext for persistence
      if (dispatch) {
        dispatch({ type: 'UPDATE_FOLDER', payload: { id: folderId, name: newName } });
      }
      
      log('success', 'DMS', 'renameFolder', { folderId, newName });
      
      toast({
        title: "Folder Renamed",
        description: `Folder has been renamed to "${newName}".`,
      });
    },

    delete: async (
      folderId: string,
      dispatch?: React.Dispatch<AppAction>
    ): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const folder = mockFolders.find(f => f.id === folderId);
      if (!folder) throw new Error('Folder not found');

      if (folder.documentCount > 0) {
        throw new Error('Cannot delete folder containing documents');
      }

      const hasSubfolders = mockFolders.some(f => f.parentId === folderId);
      if (hasSubfolders) {
        throw new Error('Cannot delete folder containing subfolders');
      }

      mockFolders = mockFolders.filter(f => f.id !== folderId);
      saveMockFolders(); // Persist to localStorage
      
      // Sync with AppStateContext for persistence
      if (dispatch) {
        dispatch({ type: 'DELETE_FOLDER', payload: folderId });
      }
      
      log('success', 'DMS', 'deleteFolder', { folderId });
      
      toast({
        title: "Folder Deleted",
        description: "Folder has been deleted successfully.",
      });
    },

    get: async (folderId: string): Promise<Folder | null> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockFolders.find(f => f.id === folderId) || null;
    }
  },

  // File Management  
  files: {
    upload: async (
      file: File,
      options: UploadOptions,
      dispatch: React.Dispatch<AppAction>
    ): Promise<UploadResult> => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validate file type - Extended support for AI drafts
      const allowedTypes = [
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'image/png', 
        'image/jpeg',
        'text/plain', // Support for AI drafts
        'text/html' // Support for HTML drafts
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported. Allowed types: PDF, DOCX, XLSX, PNG, JPG, TXT, HTML`);
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size too large. Please upload files smaller than 50MB.');
      }

      // Check for duplicates
      const existingDocs = options.existingDocuments || [];
      const duplicateCheck = await HashService.checkDuplicate(file, existingDocs);
      
      if (duplicateCheck.isDuplicate) {
        // Return duplicate info for user decision
        return {
          success: false,
          duplicate: {
            action: 'replace',
            existingDoc: duplicateCheck.existingDoc!
          }
        };
      }

      // Get folder path for proper organization
      const folder = mockFolders.find(f => f.id === options.folderId);
      const documentPath = folder ? `${folder.path}/${file.name}` : `/documents/${file.name}`;

      // Convert file content to base64 for storage with comprehensive validation
      let base64Content: string;
      
      try {
        if (file.type.startsWith('image/') || file.type.includes('application/')) {
          // For binary files (images, PDFs, Office docs), use FileReader for proper encoding
          base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              if (!result) {
                reject(new Error('FileReader returned empty result'));
                return;
              }
              
              // Remove data URL prefix to get just the base64 content
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              
              // Validate base64 content
              if (!base64 || base64.length === 0) {
                reject(new Error('Base64 content is empty after processing'));
                return;
              }
              
              // Test if base64 is valid by trying to decode a small portion
              try {
                atob(base64.substring(0, Math.min(100, base64.length)));
                log('success', 'DMS', 'uploadFileEncoding', { 
                  fileName: file.name, 
                  originalSize: file.size, 
                  base64Size: base64.length,
                  type: file.type 
                });
                resolve(base64);
              } catch (decodeError) {
                reject(new Error(`Invalid base64 content: ${decodeError.message}`));
              }
            };
            reader.onerror = () => reject(new Error('Failed to read file content'));
            reader.readAsDataURL(file);
          });
        } else {
          // For text files, use array buffer method
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          base64Content = btoa(String.fromCharCode(...uint8Array));
          
          // Validate text file base64
          if (!base64Content || base64Content.length === 0) {
            throw new Error('Text file base64 encoding resulted in empty content');
          }
          
          log('success', 'DMS', 'uploadFileEncoding', { 
            fileName: file.name, 
            originalSize: file.size, 
            base64Size: base64Content.length,
            type: file.type,
            method: 'arrayBuffer' 
          });
        }
        
        // Final validation
        if (!base64Content) {
          throw new Error('Base64 content is undefined after encoding');
        }
        
      } catch (encodingError) {
        log('error', 'DMS', 'uploadFileEncoding', { 
          fileName: file.name, 
          error: encodingError.message,
          type: file.type 
        });
        throw new Error(`File encoding failed: ${encodingError.message}`);
      }

      const newDocument: Document = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        caseId: options.caseId || '',
        clientId: '', // Will be derived from case
        uploadedById: 'emp-1',
        uploadedByName: 'Current User',
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        tags: options.tags || [],
        isShared: false,
        path: documentPath,
        content: base64Content,
        folderId: options.folderId
      };

      dispatch({ type: 'ADD_DOCUMENT', payload: newDocument });

      // Update folder statistics
      if (folder) {
        folder.documentCount++;
        folder.size += file.size;
        folder.lastAccess = new Date().toISOString();
        saveMockFolders();
      }

      log('success', 'DMS', 'uploadFile', { 
        documentId: newDocument.id, 
        fileName: file.name,
        folderId: options.folderId,
        path: documentPath
      });

      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded to ${folder?.name || 'Documents'}.`,
      });

      return {
        success: true,
        document: newDocument
      };
    },

    // Handle duplicate file resolution
    handleDuplicate: async (
      file: File,
      action: 'replace' | 'version',
      existingDoc: Document,
      options: UploadOptions,
      dispatch: React.Dispatch<AppAction>
    ): Promise<Document> => {
      const folder = mockFolders.find(f => f.id === options.folderId);
      const documentPath = folder ? folder.path : '/folders/unorganized';

      if (action === 'replace') {
        // Update existing document
        const updatedDoc = {
          ...existingDoc,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          path: `${documentPath}/${file.name}`,
          tags: [...new Set([...existingDoc.tags, ...(options.tags || [])])] // Merge tags
        };

        dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDoc });

        toast({
          title: "File Replaced",
          description: `${file.name} has been updated with the new version.`,
        });

        return updatedDoc;
      } else {
        // Create new version
        const existingDocs = options.existingDocuments || [];
        const versionedName = HashService.getVersionedName(file.name, existingDocs);

        const newDocument: Document = {
          id: `doc-${Date.now()}`,
          name: versionedName,
          type: file.type,
          size: file.size,
          caseId: options.caseId || '',
          clientId: '',
          uploadedById: 'emp-1',
          uploadedByName: 'Current User',
          uploadedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          tags: [...new Set([...existingDoc.tags, ...(options.tags || [])])],
          isShared: false,
          path: `${documentPath}/${versionedName}`,
          folderId: options.folderId
        };

        dispatch({ type: 'ADD_DOCUMENT', payload: newDocument });

        if (folder) {
          folder.documentCount++;
          folder.size += file.size;
          folder.lastAccess = new Date().toISOString();
        }

        toast({
          title: "New Version Created",
          description: `Created ${versionedName} as a new version.`,
        });

        return newDocument;
      }
    },

    updateMetadata: async (
      documentId: string, 
      updates: { name?: string; tags?: string[] },
      dispatch: React.Dispatch<AppAction>
    ): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));

      const updatedDoc = { id: documentId, ...updates };
      dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDoc });

      log('success', 'DMS', 'updateMetadata', { documentId, updates });
      
      toast({
        title: "Document Updated",
        description: "Document metadata has been updated successfully.",
      });
    },

    getPreviewUrl: async (documentId: string): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        // Get the document from state to retrieve actual content
        const appData = JSON.parse(localStorage.getItem('lawfirm_app_data') || '{}');
        const documents = appData.documents || [];
        const foundDocument = documents.find((doc: Document) => doc.id === documentId);
        
        if (foundDocument && foundDocument.content) {
          log('success', 'DMS', 'getPreviewUrl', { 
            documentId, 
            hasContent: true, 
            size: foundDocument.size, 
            type: foundDocument.type,
            contentLength: foundDocument.content.length 
          });
          
          let blob: Blob;
          
          try {
            if (foundDocument.type.startsWith('image/') || foundDocument.type.includes('application/')) {
              // For binary files, validate and create blob from base64
              if (!foundDocument.content || foundDocument.content.trim() === '') {
                throw new Error('Base64 content is empty');
              }
              
              // Validate base64 format
              try {
                atob(foundDocument.content.substring(0, 100)); // Test decode small portion
              } catch (decodeError) {
                throw new Error(`Invalid base64 content: ${decodeError.message}`);
              }
              
              // Create data URL and convert to blob
              const dataUrl = `data:${foundDocument.type};base64,${foundDocument.content}`;
              const response = await fetch(dataUrl);
              blob = await response.blob();
              
              if (blob.size === 0) {
                throw new Error('Blob conversion resulted in empty blob');
              }
              
            } else {
              // For text files, decode base64 directly
              const binaryString = atob(foundDocument.content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              blob = new Blob([bytes], { type: foundDocument.type || 'application/octet-stream' });
            }
            
            log('success', 'DMS', 'getPreviewUrl', { 
              documentId, 
              blobSize: blob.size, 
              blobType: blob.type,
              originalSize: foundDocument.size 
            });
            
            return URL.createObjectURL(blob);
            
          } catch (blobError) {
            log('error', 'DMS', 'getPreviewUrl', { 
              documentId, 
              error: 'Blob creation failed', 
              details: blobError.message 
            });
            throw new Error(`Failed to create blob: ${blobError.message}`);
          }
        }
        
        log('error', 'DMS', 'getPreviewUrl', { documentId, reason: 'Document not found or no content' });
        
        // Get document info for fallback content
        const appData2 = JSON.parse(localStorage.getItem('lawfirm_app_data') || '{}');
        const documents2 = appData2.documents || [];
        const docInfo = documents2.find((doc: Document) => doc.id === documentId);
        
        // Create appropriate fallback based on file type
        if (docInfo?.type.startsWith('image/')) {
          // Create a simple placeholder image
          const canvas = globalThis.document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 300;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, 400, 300);
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Image Preview Unavailable', 200, 150);
            ctx.fillText(docInfo.name || 'Unknown Image', 200, 180);
          }
          
          return new Promise(resolve => {
            canvas.toBlob(blob => {
              if (blob) {
                resolve(URL.createObjectURL(blob));
              } else {
                // Fallback to PDF if canvas fails
                const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Image Preview Unavailable) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \n0000000179 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n267\n%%EOF';
                const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
                resolve(URL.createObjectURL(pdfBlob));
              }
            }, 'image/png');
          });
        } else {
          // Fallback to PDF for non-image files
          const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Document Preview Unavailable) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \n0000000179 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n267\n%%EOF';
          const blob = new Blob([pdfContent], { type: 'application/pdf' });
          return URL.createObjectURL(blob);
        }
      } catch (error) {
        log('error', 'DMS', 'getPreviewUrl', { documentId, error: error.message });
        
        // Final fallback
        const errorPdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 28\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Preview Error) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \n0000000179 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n251\n%%EOF';
        const blob = new Blob([errorPdfContent], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      }
    },

    getDownloadUrl: async (documentId: string): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Return null to trigger proper blob download handling
      return '';
    },

    download: async (documentId: string, fileName: string): Promise<void> => {
      try {
        log('success', 'DMS', 'downloadFile', { documentId, fileName, action: 'start' });
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the document from state to retrieve actual content
        const appData = JSON.parse(localStorage.getItem('lawfirm_app_data') || '{}');
        const documents = appData.documents || [];
        
        // Import file type utilities for better content generation
        const { generateSampleContent } = await import('@/utils/fileTypeUtils');
        const foundDocument = documents.find((doc: Document) => doc.id === documentId);
        
        let blob: Blob;
        
        if (foundDocument && foundDocument.content && foundDocument.content.trim() !== '') {
          log('success', 'DMS', 'downloadFile', { 
            documentId, 
            hasStoredContent: true, 
            originalSize: foundDocument.size, 
            type: foundDocument.type,
            contentLength: foundDocument.content.length 
          });
          
          try {
            // Validate base64 content first
            try {
              atob(foundDocument.content.substring(0, 100)); // Test decode small portion
            } catch (decodeError) {
              throw new Error(`Invalid base64 content in storage: ${decodeError.message}`);
            }
            
            if (foundDocument.type.startsWith('image/') || foundDocument.type.includes('application/')) {
              // For binary files, content is properly base64 encoded - convert to blob via data URL
              const dataUrl = `data:${foundDocument.type};base64,${foundDocument.content}`;
              const response = await fetch(dataUrl);
              blob = await response.blob();
              
              if (blob.size === 0) {
                throw new Error('Data URL conversion resulted in empty blob');
              }
              
            } else {
              // For text files, decode base64 directly
              const binaryString = atob(foundDocument.content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              blob = new Blob([bytes], { type: foundDocument.type || 'application/octet-stream' });
            }
            
            log('success', 'DMS', 'downloadFile', { 
              documentId, 
              blobCreated: true, 
              blobSize: blob.size, 
              expectedSize: foundDocument.size 
            });
            
          } catch (contentError) {
            log('error', 'DMS', 'downloadFile', { 
              documentId, 
              error: 'Content processing failed', 
              details: contentError.message 
            });
            throw new Error(`Failed to process stored content: ${contentError.message}`);
          }
        } else {
          log('error', 'DMS', 'downloadFile', { documentId, reason: 'No document found or no content, using fallback' });
          
          // Generate realistic file content based on file type
          const fileExt = fileName.split('.').pop()?.toLowerCase();
          
          if (fileExt === 'pdf') {
          // Generate enhanced PDF content
            const { generateSampleContent } = await import('@/utils/fileTypeUtils');
            const pdfContent = generateSampleContent(fileName, 'application/pdf');
            blob = new Blob([pdfContent], { type: 'application/pdf' });
          } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExt || '')) {
            // Generate placeholder image for missing image files
            const canvas = globalThis.document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Create a colorful placeholder
              ctx.fillStyle = '#e5e7eb';
              ctx.fillRect(0, 0, 400, 300);
              ctx.fillStyle = '#6b7280';
              ctx.font = '16px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('Placeholder Image', 200, 140);
              ctx.fillText(fileName, 200, 160);
              ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, 200, 180);
            }
            
            // Convert canvas to blob
            blob = await new Promise(resolve => {
              canvas.toBlob(canvasBlob => {
                resolve(canvasBlob || new Blob([''], { type: 'image/png' }));
              }, `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`);
            });
          } else {
            // Use enhanced sample content generation
            const { generateSampleContent, getMimeFromExtension } = await import('@/utils/fileTypeUtils');
            const mimeType = getMimeFromExtension(fileExt || '');
            const mockContent = generateSampleContent(fileName, mimeType);
            blob = new Blob([mockContent], { type: mimeType });
          }
        }
        
        // Validate blob
        if (blob.size === 0) {
          throw new Error('Generated file is empty');
        }
        
        log('success', 'DMS', 'downloadFile', { documentId, blobSize: blob.size, blobType: blob.type });
        
        // Create download link using global document object
        const url = URL.createObjectURL(blob);
        const downloadLink = globalThis.document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        globalThis.document.body.appendChild(downloadLink);
        downloadLink.click();
        globalThis.document.body.removeChild(downloadLink);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        log('success', 'DMS', 'downloadFile', { documentId, fileName, action: 'complete' });
        
        toast({
          title: "Download Complete",
          description: `${fileName} has been downloaded successfully.`,
        });
        
      } catch (error) {
        log('error', 'DMS', 'downloadFile', { documentId, fileName, error: error.message });
        toast({
          title: "Download Failed",
          description: `Failed to download ${fileName}. ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }
    },

    delete: async (documentId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
      try {
        dispatch({ type: 'DELETE_DOCUMENT', payload: documentId });
        log('success', 'DMS', 'deleteFile', { documentId });
        
        toast({
          title: "Document Deleted",
          description: "Document has been deleted successfully.",
        });
      } catch (error) {
        log('error', 'DMS', 'deleteFile', error);
        toast({
          title: "Error",
          description: "Failed to delete document. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },

    list: async (filter: DocumentFilter): Promise<Document[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get documents from localStorage (app state)
      const appData = JSON.parse(localStorage.getItem('lawfirm_app_data') || '{}');
      const documents: Document[] = appData.documents || [];
      
      // Apply filters
      let filteredDocs = documents;
      
      if (filter.caseId) {
        filteredDocs = filteredDocs.filter(doc => doc.caseId === filter.caseId);
      }
      
      if (filter.folderId) {
        filteredDocs = filteredDocs.filter(doc => doc.folderId === filter.folderId);
      }
      
      if (filter.stage) {
        filteredDocs = filteredDocs.filter(doc => doc.tags.includes(filter.stage));
      }
      
      if (filter.fileType) {
        filteredDocs = filteredDocs.filter(doc => doc.type === filter.fileType);
      }
      
      if (filter.tags && filter.tags.length > 0) {
        filteredDocs = filteredDocs.filter(doc => 
          filter.tags!.some(tag => doc.tags.includes(tag))
        );
      }
      
      if (filter.uploadedBy) {
        filteredDocs = filteredDocs.filter(doc => doc.uploadedById === filter.uploadedBy);
      }
      
      if (filter.dateRange) {
        const start = new Date(filter.dateRange.start);
        const end = new Date(filter.dateRange.end);
        filteredDocs = filteredDocs.filter(doc => {
          const uploadDate = new Date(doc.uploadedAt);
          return uploadDate >= start && uploadDate <= end;
        });
      }
      
      log('success', 'DMS', 'listFiles', { filter, count: filteredDocs.length });
      return filteredDocs;
    },

    search: async (filter: DocumentFilter): Promise<Document[]> => {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Mock search implementation - in real app would call backend
      log('success', 'DMS', 'searchFiles', { filter });
      
      // Return mock results based on filter
      return [];
    }
  },

  // Tag Management
  tags: {
    list: async (): Promise<Tag[]> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return [...mockTags];
    },

    create: async (name: string, color: string = '#3b82f6'): Promise<Tag> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check if tag already exists
      if (mockTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Tag already exists');
      }

      const newTag: Tag = {
        id: `tag-${Date.now()}`,
        name: name.toLowerCase(),
        color,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };

      mockTags.push(newTag);
      log('success', 'DMS', 'createTag', { tagId: newTag.id, name });
      
      toast({
        title: "Tag Created",
        description: `Tag "${name}" has been created successfully.`,
      });

      return newTag;
    },

    delete: async (tagId: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      mockTags = mockTags.filter(t => t.id !== tagId);
      log('success', 'DMS', 'deleteTag', { tagId });
      
      toast({
        title: "Tag Deleted",
        description: "Tag has been deleted successfully.",
      });
    }
  },

  // Legacy methods for backward compatibility
  uploadForCaseStage: async (
    file: File, 
    caseId: string, 
    stageId: string, 
    dispatch: React.Dispatch<AppAction>
  ): Promise<Document> => {
    const result = await dmsService.files.upload(
      file, 
      { caseId, stage: stageId, tags: [stageId] }, 
      dispatch
    );
    
    if (result.success && result.document) {
      return result.document;
    } else {
      throw new Error('Upload failed or resulted in duplicate');
    }
  },

  deleteDocument: async (documentId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    return dmsService.files.delete(documentId, dispatch);
  }
};