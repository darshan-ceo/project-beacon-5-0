import { AppAction } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { HashService } from './hashService';
import { idbStorage } from '@/utils/idb';
import { setItem, getItem, loadAppState, saveAppState } from '@/data/storageShim';

const isDev = import.meta.env.DEV;

const log = (tab: string, action: string, level: string = 'info', details?: any) => {
  if (!isDev) return;
  const color = level === 'success' ? 'color: green' : level === 'error' ? 'color: red' : 'color: blue';
  console.log(`%c[DMS] ${tab} ${action} ${level}`, color, details);
};

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
  // Canonical default structure (do not read from localStorage)
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
      id: 'gst-assessment',
      name: 'GST Assessment',
      parentId: 'litigation-docs',
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'GST assessment related documents',
      path: '/folders/litigation-docs/gst-assessment'
    },
    {
      id: 'appeals',
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
      id: 'client-docs',
      name: 'Client Documents',
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'Client-related documents organized by case',
      path: '/folders/client-docs'
    },
    {
      id: 'client-uploads',
      name: 'Client Uploads',
      parentId: 'client-docs',
      documentCount: 0,
      size: 0,
      createdAt: '2024-01-01',
      lastAccess: new Date().toISOString(),
      description: 'Documents uploaded by clients via portal',
      path: '/folders/client-docs/uploads'
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
const saveMockFolders = async () => {
  try {
    await setItem('mockFolders', mockFolders);
  } catch (error) {
    console.warn('Failed to save folders to storage:', error);
  }
};

// Initialize persistent tags with IndexedDB fallback
const getDefaultTags = (): Tag[] => [
  { id: '1', name: 'urgent', color: '#ef4444', createdAt: '2024-01-10', usageCount: 12 },
  { id: '2', name: 'appeal', color: '#3b82f6', createdAt: '2024-01-10', usageCount: 8 },
  { id: '3', name: 'evidence', color: '#10b981', createdAt: '2024-01-12', usageCount: 15 },
  { id: '4', name: 'order', color: '#f59e0b', createdAt: '2024-01-15', usageCount: 6 }
];

let mockTags: Tag[] = [];

// Initialize tags from storage
const initializeTags = async (): Promise<void> => {
  try {
    // Try IndexedDB first
    const storedTags = await idbStorage.get('dms_tags');
    if (Array.isArray(storedTags) && storedTags.length > 0) {
      mockTags = storedTags;
      return;
    }

    // Fallback to storageShim
    const localTags = await getItem<Tag[]>('dms_tags');
    if (localTags && Array.isArray(localTags) && localTags.length > 0) {
      mockTags = localTags;
      // Migrate to IndexedDB
      await idbStorage.set('dms_tags', mockTags);
      return;
    }

    // Use defaults if no stored tags
    mockTags = getDefaultTags();
    await idbStorage.set('dms_tags', mockTags);
    await setItem('dms_tags', mockTags);
  } catch (error) {
    console.warn('Failed to initialize tags, using defaults:', error);
    mockTags = getDefaultTags();
  }
};

// Save tags to persistent storage
const saveTags = async (): Promise<void> => {
  try {
    await idbStorage.set('dms_tags', mockTags);
    await setItem('dms_tags', mockTags);
  } catch (error) {
    console.warn('Failed to save tags:', error);
  }
};

// Initialize tags immediately
initializeTags();

// Helper function to calculate actual document counts for folders
const calculateFolderDocumentCounts = async (folders: Folder[]): Promise<Folder[]> => {
  // Get documents from both IndexedDB and in-memory state
  const appData = await loadAppState();
  const inMemoryDocs = appData.documents || [];
  const idbDocs = await idbStorage.get('documents') || [];
  
  // Combine and deduplicate by ID
  const documentMap = new Map();
  [...idbDocs, ...inMemoryDocs].forEach(doc => {
    if (doc && doc.id) {
      documentMap.set(doc.id, doc);
    }
  });
  const documents = Array.from(documentMap.values());
  
  // Calculate counts for each folder
  const folderCounts = new Map<string, number>();
  
  for (const doc of documents) {
    // Count documents where doc.folderId matches folder.id
    if (doc.folderId) {
      folderCounts.set(doc.folderId, (folderCounts.get(doc.folderId) || 0) + 1);
    }
    
    // Also count documents where doc.path starts with folder.path (for nested documents)
    if (doc.path && typeof doc.path === 'string') {
      for (const folder of folders) {
        if (folder.path && doc.path.startsWith(folder.path)) {
          folderCounts.set(folder.id, (folderCounts.get(folder.id) || 0) + 1);
        }
      }
    }
  }
  
  // Update folder documentCount
  return folders.map(folder => ({
    ...folder,
    documentCount: folderCounts.get(folder.id) || 0
  }));
};

export const dmsService = {
// Folder Management
  folders: {
    list: async (parentId?: string): Promise<Folder[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get all folders with proper fallback chain
      let allFolders = await dmsService.folders.listAll();
      
      // Calculate actual document counts
      const foldersWithCounts = await calculateFolderDocumentCounts(allFolders);
      
      return foldersWithCounts.filter((f: Folder) => f.parentId === parentId);
    },

    listAll: async (): Promise<Folder[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Try multiple sources in order: localStorage -> IndexedDB -> defaults
      let allFolders: any[] | null = null;
      
      // First try storageShim
      try {
        const storedFolders = await getItem<Folder[]>('dms_folders');
        if (storedFolders && Array.isArray(storedFolders)) {
          allFolders = storedFolders;
        }
      } catch (error) {
        console.warn('Failed to parse storageShim folders:', error);
        allFolders = null;
      }
      
      // Then try IndexedDB if localStorage failed
      if (!allFolders || !Array.isArray(allFolders) || allFolders.length === 0) {
        try {
          const idbFolders = await idbStorage.get('folders');
          if (Array.isArray(idbFolders) && idbFolders.length > 0) {
            allFolders = idbFolders;
          }
        } catch (error) {
          console.warn('Failed to load folders from IndexedDB:', error);
        }
      }
      
      // Fall back to canonical defaults if both failed
      if (!allFolders || !Array.isArray(allFolders) || allFolders.length === 0) {
        console.log('Using canonical default folders');
        allFolders = [...initializeMockFolders()];
      }
      
      // MIGRATION: normalize to the 3-folder system and remap legacy IDs/paths without deleting user data
      const canonicalDefaults = initializeMockFolders();
      const allowedTopLevel = new Set(['litigation-docs', 'client-docs', 'internal-docs']);
      const legacyIdMap: Record<string, string> = {
        '1': 'litigation-docs',
        '2': 'gst-assessment', // old GSTAT id
        '3': 'client-uploads',
        'gstat-docs': 'gst-assessment',
        'appeals-docs': 'appeals',
      };
      const nameHints: Array<{ test: (n: string) => boolean; target: { id: string; parentId?: string; name?: string; path?: string } }> = [
        { test: (n) => /gstat|gst.?assessment/i.test(n), target: { id: 'gst-assessment', parentId: 'litigation-docs', name: 'GST Assessment', path: '/folders/litigation-docs/gst-assessment' } },
        { test: (n) => /appeal/i.test(n), target: { id: 'appeals', parentId: 'litigation-docs', name: 'Appeals', path: '/folders/litigation-docs/appeals' } },
        { test: (n) => /client\s*uploads?/i.test(n), target: { id: 'client-uploads', parentId: 'client-docs', name: 'Client Uploads', path: '/folders/client-docs/uploads' } },
        { test: (n) => /template/i.test(n), target: { id: 'templates', parentId: 'internal-docs', name: 'Templates', path: '/folders/internal-docs/templates' } },
        { test: (n) => /litigation/i.test(n), target: { id: 'litigation-docs', name: 'Litigation Documents', path: '/folders/litigation-docs' } },
      ];

      // Build normalized folder map
      const mapById = new Map<string, Folder>();
      const upsert = (f: Folder) => {
        mapById.set(f.id, f);
      };

      // Start with existing folders (normalize legacy ones)
      for (const f of allFolders as Folder[]) {
        let nf: Folder = { ...f } as Folder;
        if (nf.id && legacyIdMap[nf.id]) {
          const targetId = legacyIdMap[nf.id];
          nf.id = targetId as any;
        }
        // Name-driven normalization
        const hint = nameHints.find(h => h.test(nf.name || ''));
        if (hint) {
          nf = { ...nf, ...hint.target, createdAt: nf.createdAt || new Date().toISOString(), lastAccess: nf.lastAccess || new Date().toISOString(), documentCount: nf.documentCount ?? 0, size: nf.size ?? 0 } as Folder;
        }
        // Ensure subfolders have correct parents
        if (nf.id === 'client-uploads') nf.parentId = 'client-docs';
        if (nf.id === 'templates') nf.parentId = 'internal-docs';
        // Ensure only 3 top-level
        if (!nf.parentId && !allowedTopLevel.has(nf.id)) {
          // Move unknown top-level under Client Documents by default
          nf.parentId = 'client-docs';
          nf.path = `/folders/client-docs/${(nf.name || 'folder').toLowerCase().replace(/\s+/g, '-')}`;
        }
        upsert(nf);
      }

      // Ensure canonical defaults exist
      for (const df of canonicalDefaults) {
        if (!mapById.has(df.id)) {
          upsert({ ...df });
        } else {
          // Also ensure correct parent/path for canonical items
          const cur = mapById.get(df.id)!;
          const fixed = { ...cur };
          if (df.parentId && cur.parentId !== df.parentId) fixed.parentId = df.parentId;
          if (cur.path !== df.path) fixed.path = df.path;
          if (cur.name !== df.name) fixed.name = df.name;
          mapById.set(df.id, fixed);
        }
      }

      const normalizedFolders = Array.from(mapById.values());

      // Update documents to match new folder ids/paths
      try {
        let documents = await idbStorage.get('documents');
        if (!Array.isArray(documents)) documents = [];
        let updated = 0;
        const pathRewrites: Array<{ from: RegExp; to: string }> = [
          { from: /\/folders\/litigation-docs\/gstat/gi, to: '/folders/litigation-docs/gst-assessment' },
          { from: /\/folders\/client-uploads/gi, to: '/folders/client-docs/uploads' },
          { from: /\/folders\/appeals-docs/gi, to: '/folders/litigation-docs/appeals' },
        ];
        const idMap = legacyIdMap;
        for (const d of documents) {
          if (d.folderId && idMap[d.folderId]) {
            d.folderId = idMap[d.folderId];
            updated++;
          }
          if (typeof d.path === 'string') {
            let newPath = d.path;
            for (const rw of pathRewrites) {
              newPath = newPath.replace(rw.from, rw.to);
            }
            if (newPath !== d.path) {
              d.path = newPath;
              updated++;
            }
          }
        }
        if (updated > 0) {
          await idbStorage.set('documents', documents);
          // Mirror into storageShim app state cache if present
          try {
            const appState = await loadAppState();
            if (appState && Array.isArray(appState.documents)) {
              appState.documents = documents as any;
              await saveAppState({ documents: appState.documents });
            }
          } catch {}
          console.log(`[DMS] Migrated ${updated} document references to canonical folders`);
        }
      } catch (err) {
        console.warn('Failed to migrate document folder references:', err);
      }

      // Sync normalized folders to storage and internal cache
      const finalFolders = normalizedFolders;
      try {
        await setItem('dms_folders', finalFolders);
        await idbStorage.set('folders', finalFolders);
        // Keep internal cache in sync for path lookups
        mockFolders = [...finalFolders];
        await saveMockFolders();
        console.log('Folders normalized and synchronized to all storage layers');
      } catch (error) {
        console.warn('Failed to sync folders to storage:', error);
      }
      
      // Calculate actual document counts before returning
      const foldersWithCounts = await calculateFolderDocumentCounts(finalFolders);
      
      return foldersWithCounts;
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

      // Add to all storage layers
      mockFolders.push(newFolder);
      saveMockFolders(); // Persist to localStorage
      
      // Also update dms_folders for consistency
      try {
        const allFolders = await dmsService.folders.listAll();
        allFolders.push(newFolder);
        await setItem('dms_folders', allFolders);
        await idbStorage.set('folders', allFolders);
      } catch (error) {
        console.warn('Failed to sync new folder to storage:', error);
      }
      
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
      const allFolders = await dmsService.folders.listAll();
      return allFolders.find(f => f.id === folderId) || null;
    }
  },

  // File Management  
  files: {
    upload: async (
      userId: string, // PHASE 3B: Added for RBAC
      file: File,
      options: UploadOptions,
      dispatch: React.Dispatch<AppAction>
    ): Promise<UploadResult> => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // PHASE 3B: RBAC Security Check
      try {
        // BYPASS: Skip RBAC for system/automated operations and demo users
        const isDemoMode = userId === 'system' || userId.startsWith('demo-') || userId === 'demo-user';

        if (!isDemoMode) {
          const { policyEngine, secureDataAccess } = await import('@/security/policyEngine');
          
          console.log('[DMS] RBAC check for production user:', { userId, fileName: file.name });
          
          // Check: Can user upload documents?
          const canUpload = await policyEngine.evaluatePermission(userId, 'documents', 'write');
          if (!canUpload.allowed) {
            throw new Error('Permission denied: Cannot upload documents');
          }
          
          // If document is linked to a case, validate case access
          if (options.caseId) {
            const { storageManager } = await import('@/data/StorageManager');
            const storage = storageManager.getStorage();
            const caseData = await storage.getById('cases', options.caseId);
            
            if (!caseData) {
              throw new Error('Case not found');
            }
            
            const caseAccess = await secureDataAccess.secureGet(
              userId,
              'cases',
              options.caseId,
              async (id) => caseData
            );
            
            if (!caseAccess) {
              throw new Error('Access denied: Cannot upload documents for this case');
            }
          }
        } else {
          // Demo mode - log for audit trail
          console.log('[DMS] Demo mode upload - RBAC bypassed:', {
            userId,
            fileName: file.name,
            caseId: options.caseId,
            stage: options.stage
          });
        }
      } catch (error: any) {
        console.error('[DMS] RBAC check failed:', error);
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }

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

      // Immediate persistence to prevent data loss
      try {
        const persistenceService = await import('@/services/persistenceService');
        await persistenceService.persistenceService.create('documents', newDocument);
        console.log('📄 Document immediately persisted:', newDocument.name);
      } catch (persistError) {
        console.warn('📄 Immediate persistence failed, relying on autosave:', persistError);
      }

      // Trigger task bundle automation for document_received
      if (options.caseId) {
        try {
          const { taskBundleTriggerService } = await import('./taskBundleTriggerService');
          const { StorageManager } = await import('@/data/StorageManager');
          
          // Get case data for automation
          const storage = StorageManager.getInstance().getStorage();
          const caseData = await storage.getById('cases', options.caseId) as any;
          
          if (caseData) {
            await taskBundleTriggerService.triggerTaskBundles(
              {
                id: caseData.id,
                caseNumber: caseData.caseNumber,
                clientId: caseData.clientId,
                assignedToId: caseData.assignedToId || 'emp-1',
                assignedToName: caseData.assignedToName || 'Current User',
                currentStage: caseData.currentStage || options.stage || 'Any Stage',
                noticeType: caseData.noticeType,
                clientTier: caseData.clientTier
              },
              'document_received',
              caseData.currentStage as any,
              dispatch
            );
            
            console.log(`[DMS] Task bundle automation triggered for document: ${file.name}`);
          }
        } catch (error) {
          console.error('[DMS] Failed to trigger task bundle automation:', error);
          // Don't fail the upload if automation fails
        }
      }

      // Add timeline entry for document upload (only if case-linked)
      if (options.caseId) {
        try {
          const { timelineService } = await import('./timelineService');
          await timelineService.addEntry({
            caseId: options.caseId,
            type: 'doc_saved',
            title: 'Document Uploaded',
            description: `${file.name} uploaded to ${folder?.name || 'case documents'}`,
            createdBy: userId === 'system' ? 'System' : 'Current User',
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              folderId: options.folderId,
              stage: options.stage,
              tags: options.tags
            }
          });
          console.log(`[DMS] Timeline entry added for document: ${file.name}`);
        } catch (error) {
          console.warn('[DMS] Failed to add timeline entry:', error);
          // Don't fail upload if timeline logging fails
        }
      }
      
      // Always log upload success for debugging
      console.log('[DMS] Document uploaded successfully:', {
        fileName: file.name,
        documentId: newDocument.id,
        caseLinked: !!options.caseId,
        timelineLogged: !!options.caseId,
        uploadedBy: userId
      });

      // Audit trail for system operations
      if (userId === 'system') {
        console.log('[AUDIT] System document upload:', {
          timestamp: new Date().toISOString(),
          documentId: newDocument.id,
          fileName: file.name,
          caseId: options.caseId,
          stage: options.stage,
          source: 'automated_workflow'
        });
      }

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

        // Immediate persistence for updates
        try {
          const persistenceService = await import('@/services/persistenceService');
          await persistenceService.persistenceService.update('documents', updatedDoc.id, updatedDoc);
          console.log('📄 Document update immediately persisted:', updatedDoc.name);
        } catch (persistError) {
          console.warn('📄 Immediate persistence failed for update, relying on autosave:', persistError);
        }

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
        const appData = await loadAppState();
        let documents = appData.documents || [];
        if (!documents || documents.length === 0) {
          try {
            const idbDocs = await idbStorage.get('documents');
            documents = Array.isArray(idbDocs) ? idbDocs : [];
          } catch {}
        }
        const foundDocument: any = documents.find((doc: any) => doc.id === documentId);
        
        if (foundDocument && foundDocument.content) {
          log('success', 'DMS', 'getPreviewUrl', { 
            documentId, 
            hasContent: true, 
            size: foundDocument.size, 
            type: foundDocument.type || 'unknown',
            contentLength: foundDocument.content.length 
          });
          
          let blob: Blob;
          
          try {
            const docType = foundDocument.type || 'application/octet-stream';
            if (docType.startsWith('image/') || docType.includes('application/')) {
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
              const dataUrl = `data:${docType};base64,${foundDocument.content}`;
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
              blob = new Blob([bytes], { type: docType });
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
        const appData2 = await loadAppState();
        const documents2 = appData2.documents || [];
        const docInfo: any = documents2.find((doc: any) => doc.id === documentId);
        
        // Create appropriate fallback based on file type
        if (docInfo && docInfo.type && docInfo.type.startsWith('image/')) {
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
        const appData = await loadAppState();
        let documents = appData.documents || [];
        if (!documents || documents.length === 0) {
          try {
            const idbDocs = await idbStorage.get('documents');
            documents = Array.isArray(idbDocs) ? idbDocs : [];
          } catch {}
        }
        
        // Import file type utilities for better content generation
        const { generateSampleContent } = await import('@/utils/fileTypeUtils');
        const foundDocument: any = documents.find((doc: any) => doc.id === documentId);
        
        let blob: Blob;
        
        if (foundDocument && foundDocument.content && foundDocument.content.trim() !== '') {
          log('success', 'DMS', 'downloadFile', { 
            documentId, 
            hasStoredContent: true, 
            originalSize: foundDocument.size, 
            type: foundDocument.type || 'unknown',
            contentLength: foundDocument.content.length 
          });
          
          try {
            // Validate base64 content first
            try {
              atob(foundDocument.content.substring(0, 100)); // Test decode small portion
            } catch (decodeError) {
              throw new Error(`Invalid base64 content in storage: ${decodeError.message}`);
            }
            
            const docType = foundDocument.type || 'application/octet-stream';
            if (docType.startsWith('image/') || docType.includes('application/')) {
              // For binary files, content is properly base64 encoded - convert to blob via data URL
              const dataUrl = `data:${docType};base64,${foundDocument.content}`;
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
              blob = new Blob([bytes], { type: docType });
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
      
      // Get documents from app state
      const appData = await loadAppState();
      let documents: any[] = appData.documents || [];
      if (!documents || documents.length === 0) {
        try {
          const idbDocs = await idbStorage.get('documents');
          documents = Array.isArray(idbDocs) ? idbDocs : [];
        } catch {}
      }
      
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
      return filteredDocs as Document[];
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
      
      // Ensure tags are initialized
      if (mockTags.length === 0) {
        await initializeTags();
      }
      
      return [...mockTags];
    },

    create: async (name: string, color: string = '#3b82f6'): Promise<Tag> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const normalizedName = name.toLowerCase().trim();
      
      // Check if tag already exists
      if (mockTags.some(t => t.name.toLowerCase() === normalizedName)) {
        // Return existing tag instead of throwing error
        const existingTag = mockTags.find(t => t.name.toLowerCase() === normalizedName)!;
        // Increment usage count
        existingTag.usageCount++;
        await saveTags();
        return existingTag;
      }

      const newTag: Tag = {
        id: `tag-${Date.now()}`,
        name: normalizedName,
        color,
        createdAt: new Date().toISOString(),
        usageCount: 1
      };

      mockTags.push(newTag);
      await saveTags();
      
      log('success', 'DMS', 'createTag', { tagId: newTag.id, name: normalizedName });

      return newTag;
    },

    incrementUsage: async (tagName: string): Promise<void> => {
      const tag = mockTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
      if (tag) {
        tag.usageCount++;
        await saveTags();
      }
    },

    delete: async (tagId: string): Promise<void> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const tagToDelete = mockTags.find(t => t.id === tagId);
      if (!tagToDelete) return;
      
      mockTags = mockTags.filter(t => t.id !== tagId);
      await saveTags();
      
      log('success', 'DMS', 'deleteTag', { tagId });
      
      toast({
        title: "Tag Deleted",
        description: `Tag "${tagToDelete.name}" has been deleted successfully.`,
      });
    },

    getMostUsed: async (limit: number = 10): Promise<Tag[]> => {
      if (mockTags.length === 0) {
        await initializeTags();
      }
      
      return [...mockTags]
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit);
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
      'system', // PHASE 3B: System upload for backward compatibility
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