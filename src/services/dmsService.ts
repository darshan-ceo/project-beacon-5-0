import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

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
  tags: string[];
  isShared: boolean;
  path: string;
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

// Mock storage for folders and tags (in real app, this would be backend calls)
let mockFolders: Folder[] = [
  {
    id: '1',
    name: 'Litigation Docs',
    documentCount: 15,
    size: 25600000,
    createdAt: '2024-01-10',
    lastAccess: '2024-01-25',
    description: 'Legal documents for litigation cases',
    path: '/folders/litigation-docs'
  },
  {
    id: '2', 
    name: 'GSTAT',
    parentId: '1',
    documentCount: 8,
    size: 12800000,
    createdAt: '2024-01-15',
    lastAccess: '2024-01-24',
    description: 'GSTAT related documents',
    path: '/folders/litigation-docs/gstat'
  },
  {
    id: '3',
    name: 'Client Uploads',
    documentCount: 23,
    size: 35200000,
    createdAt: '2024-01-05',
    lastAccess: '2024-01-25',
    description: 'Documents uploaded by clients',
    path: '/folders/client-uploads'
  }
];

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
      return mockFolders.filter(f => f.parentId === parentId);
    },

    create: async (name: string, parentId?: string, caseId?: string): Promise<Folder> => {
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
      log('success', 'DMS', 'createFolder', { folderId: newFolder.id, name });
      
      toast({
        title: "Folder Created",
        description: `Folder "${name}" has been created successfully.`,
      });

      return newFolder;
    },

    rename: async (folderId: string, newName: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const folder = mockFolders.find(f => f.id === folderId);
      if (!folder) throw new Error('Folder not found');

      // Check for name conflicts
      const siblings = mockFolders.filter(f => f.parentId === folder.parentId && f.id !== folderId);
      if (siblings.some(f => f.name.toLowerCase() === newName.toLowerCase())) {
        throw new Error('Folder name already exists in this location');
      }

      folder.name = newName;
      log('success', 'DMS', 'renameFolder', { folderId, newName });
      
      toast({
        title: "Folder Renamed",
        description: `Folder has been renamed to "${newName}".`,
      });
    },

    delete: async (folderId: string): Promise<void> => {
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
      options: { folderId?: string; caseId?: string; stage?: string; tags?: string[] },
      dispatch: React.Dispatch<AppAction>
    ): Promise<Document> => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File type not supported. Please upload PDF, DOCX, XLSX, PNG, or JPG files.');
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size too large. Please upload files smaller than 50MB.');
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
        tags: options.tags || [],
        isShared: false,
        path: URL.createObjectURL(file)
      };

      dispatch({ type: 'ADD_DOCUMENT', payload: newDocument });

      // Update folder document count if uploaded to folder
      if (options.folderId) {
        const folder = mockFolders.find(f => f.id === options.folderId);
        if (folder) {
          folder.documentCount++;
          folder.size += file.size;
          folder.lastAccess = new Date().toISOString();
        }
      }

      log('success', 'DMS', 'uploadFile', { 
        documentId: newDocument.id, 
        fileName: file.name,
        folderId: options.folderId
      });

      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });

      return newDocument;
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
      
      // Create mock PDF blob for preview
      const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n178\n%%EOF';
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    },

    getDownloadUrl: async (documentId: string): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Return null to trigger proper blob download handling
      return '';
    },

    download: async (documentId: string, fileName: string): Promise<void> => {
      log('success', 'DMS', 'downloadFile', { documentId, fileName });
      
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create a proper PDF blob
        const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Sample Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \n0000000179 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n269\n%%EOF';
        
        // Create blob with proper content type
        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        
        // Validate blob
        if (blob.size === 0) {
          throw new Error('Generated file is empty');
        }
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        toast({
          title: "Download Complete",
          description: `${fileName} has been downloaded successfully.`,
        });
        
      } catch (error) {
        log('error', 'DMS', 'downloadFile', error);
        toast({
          title: "Download Failed",
          description: "Failed to download file. The file may be corrupted or unavailable.",
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
    return dmsService.files.upload(file, { caseId, stage: stageId, tags: [stageId] }, dispatch);
  },

  deleteDocument: async (documentId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    return dmsService.files.delete(documentId, dispatch);
  }
};