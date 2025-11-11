import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { DocumentModal } from '@/components/modals/DocumentModal';
import { NewFolderModal } from './NewFolderModal';
import { UnifiedDocumentSearch } from './UnifiedDocumentSearch';
import { DuplicateHandlerModal } from './DuplicateHandlerModal';
import { OrganizationGuide } from './OrganizationGuide';
import { RecentDocuments } from './RecentDocuments';
import { motion } from 'framer-motion';
import { dmsService } from '@/services/dmsService';
import { supabaseDocumentService } from '@/services/supabaseDocumentService';
import { supabase } from '@/integrations/supabase/client';
import { storageManager } from '@/data/StorageManager';
import { useAppState } from '@/contexts/AppStateContext';
import { navigationContextService } from '@/services/navigationContextService';
import { 
  Upload, 
  FolderOpen, 
  File, 
  Search, 
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Tag,
  Clock,
  User,
  Shield,
  Star,
  ChevronRight,
  Home,
  Plus,
  ArrowRight,
  HelpCircle,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplatesManagement } from './TemplatesManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { InlineHelp } from '@/components/help/InlineHelp';
import { ContextualPageHelp } from '@/components/help/ContextualPageHelp';

import { NoticeIntakeWizard } from '@/components/notices/NoticeIntakeWizard';
import { featureFlagService } from '@/services/featureFlagService';
import { HelpButton } from '@/components/ui/help-button';

interface LocalDocument {
  id: string;
  name: string;
  type: string | number;
  size: string | number;
  caseId: string;
  clientId: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  tags: string[];
  isShared: boolean;
  path: string;
}

interface Folder {
  id: string;
  name: string;
  documentCount: number;
  lastAccess: string;
  description: string;
}

// Mock data
const mockFolders: Folder[] = [
  {
    id: '1',
    name: 'Client Agreements',
    documentCount: 45,
    lastAccess: '2 hours ago',
    description: 'Legal agreements and contracts with clients'
  },
  {
    id: '2',
    name: 'Court Filings',
    documentCount: 128,
    lastAccess: '1 day ago',
    description: 'Documents filed with various courts'
  },
  {
    id: '3',
    name: 'Evidence & Discovery',
    documentCount: 67,
    lastAccess: '3 days ago',
    description: 'Evidence materials and discovery documents'
  },
  {
    id: '4',
    name: 'Legal Research',
    documentCount: 89,
    lastAccess: '1 week ago',
    description: 'Research documents and case studies'
  }
];

export const DocumentManagement: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { currentUserId } = useAdvancedRBAC();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState('overview');
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [currentFolderFiles, setCurrentFolderFiles] = useState<LocalDocument[]>([]);
  const [currentSubfolders, setCurrentSubfolders] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<LocalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [documentModal, setDocumentModal] = useState<{ isOpen: boolean; mode: 'upload' | 'edit' | 'view'; document?: any }>({
    isOpen: false,
    mode: 'upload',
    document: null
  });
  const [newFolderModal, setNewFolderModal] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    file?: File;
    existingDoc?: any;
    options?: any;
  }>({ isOpen: false });
  const [noticeIntakeModal, setNoticeIntakeModal] = useState(false);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Draft': return 'bg-legal-draft text-foreground';
      case 'Review': return 'bg-legal-pending text-foreground';
      case 'Approved': return 'bg-legal-approved text-foreground';
      case 'Final': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'doc': return '📝';
      case 'xlsx': return '📊';
      case 'jpg':
      case 'png': return '🖼️';
      default: return '📁';
    }
  };

  // Handle URL parameters for search, case filtering, action, and return context
  useEffect(() => {
    const search = searchParams.get('search');
    const caseId = searchParams.get('caseId');
    const action = searchParams.get('action');
    const returnTo = searchParams.get('returnTo');
    const returnCaseId = searchParams.get('returnCaseId');
    const openTemplateBuilder = searchParams.get('openTemplateBuilder');
    const filterParam = searchParams.get('filter');
    
    // Handle filter=today drill-down from dashboard
    if (filterParam === 'today') {
      setActiveTab('recent');
      const today = new Date().toISOString().split('T')[0];
      setActiveFilters(prev => ({ 
        ...prev, 
        dateFrom: today,
        dateTo: today 
      }));
    }
    
    if (search) {
      setSearchTerm(search);
      setDocumentSearchTerm(search);
      // Switch to "All Documents" tab to show search results
      setActiveTab('all-documents');
    }
    
    if (caseId) {
      setActiveFilters(prev => ({ ...prev, caseId }));
    }

    // Handle action parameter to auto-open upload modal
    if (action === 'upload') {
      setDocumentModal({
        isOpen: true,
        mode: 'upload',
        document: null
      });
      
      // Clear action parameter from URL to prevent re-opening modal on refresh
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('action');
      navigate(`?${newSearchParams.toString()}`, { replace: true });
    }

    // Handle template builder redirect
    if (openTemplateBuilder === '1') {
      setActiveTab('templates');
      // Clear the parameter
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('openTemplateBuilder');
      navigate(`?${newSearchParams.toString()}`, { replace: true });
    }

    // Store return context if present
    if (returnTo && returnCaseId) {
      const returnContext = {
        returnTo,
        returnCaseId,
        returnStage: searchParams.get('returnStage'),
        fromUrl: window.location.pathname + window.location.search,
        timestamp: Date.now()
      };
      navigationContextService.saveContext(returnContext);
    }
  }, [searchParams]);

  // Load data on component mount
  useEffect(() => {
    loadFolders();
    loadTags();
    // Convert state documents to local format
    const convertedDocs = state.documents.map(doc => ({
      ...doc,
      type: doc.type || 'pdf',
      size: doc.size || 0,
      uploadedByName: doc.uploadedByName || 'Unknown',
      uploadedBy: doc.uploadedByName || 'Unknown',
      createdAt: (doc as any).createdAt || doc.uploadedAt
    }));
    setFilteredDocuments(convertedDocs);
  }, [state.documents]);

  // Define applyFilters function first
  const applyFilters = useCallback(async () => {
    // Convert state documents to local format for filtering
    const convertedDocs = state.documents.map(doc => ({
      ...doc,
      type: doc.type || 'pdf',
      size: doc.size || 0,
      uploadedByName: doc.uploadedByName || 'Unknown',
      uploadedBy: doc.uploadedByName || 'Unknown',
      createdAt: (doc as any).createdAt || doc.uploadedAt
    }));
    
    let filtered = [...convertedDocs];

    // Search filter - enhanced to search client names and case titles
    if (documentSearchTerm) {
      const searchLower = documentSearchTerm.toLowerCase();
      filtered = filtered.filter(doc => {
        // Search in document name
        const nameMatch = doc.name.toLowerCase().includes(searchLower);
        
        // Search in tags
        const tagMatch = doc.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        
        // Search in case ID/number if available
        const caseMatch = doc.caseId?.toLowerCase().includes(searchLower);
        
        // Search in client name
        let clientNameMatch = false;
        if (doc.clientId) {
          const client = state.clients.find(c => c.id === doc.clientId);
          if (client) {
            clientNameMatch = client.name.toLowerCase().includes(searchLower);
          }
        }
        
        // Search in case title and case number
        let caseTitleMatch = false;
        if (doc.caseId) {
          const caseData = state.cases.find(c => c.id === doc.caseId);
          if (caseData) {
            caseTitleMatch = 
              caseData.title?.toLowerCase().includes(searchLower) ||
              caseData.caseNumber?.toLowerCase().includes(searchLower);
          }
        }
        
        return nameMatch || tagMatch || caseMatch || clientNameMatch || caseTitleMatch;
      });
    }

    // Apply active filters
    if (activeFilters.clientId && activeFilters.clientId !== 'all') {
      filtered = filtered.filter(doc => doc.clientId === activeFilters.clientId);
    }
    if (activeFilters.folderId && activeFilters.folderId !== 'all') {
      filtered = filtered.filter(doc => 
        (doc as any).folderId === activeFilters.folderId || 
        doc.path?.includes(`folder-${activeFilters.folderId}`) ||
        doc.path?.includes(`folders/${activeFilters.folderId}`)
      );
    }
    if (activeFilters.fileSize && activeFilters.fileSize !== 'all') {
      filtered = filtered.filter(doc => {
        const size = typeof doc.size === 'string' ? parseInt(doc.size) : doc.size;
        if (activeFilters.fileSize === 'small') {
          return size < 1024 * 1024; // <1MB
        } else if (activeFilters.fileSize === 'medium') {
          return size >= 1024 * 1024 && size <= 10 * 1024 * 1024; // 1-10MB
        } else if (activeFilters.fileSize === 'large') {
          return size > 10 * 1024 * 1024; // >10MB
        }
        return true;
      });
    }
    if (activeFilters.caseId && activeFilters.caseId !== 'all') {
      filtered = filtered.filter(doc => doc.caseId === activeFilters.caseId);
    }
    if (activeFilters.fileType && activeFilters.fileType !== 'all') {
      filtered = filtered.filter(doc => String(doc.type).includes(activeFilters.fileType));
    }
    if (activeFilters.uploadedBy && activeFilters.uploadedBy !== 'all') {
      filtered = filtered.filter(doc => doc.uploadedByName === activeFilters.uploadedBy);
    }
    if (activeFilters.tags?.length > 0) {
      filtered = filtered.filter(doc => 
        activeFilters.tags.some((tag: string) => doc.tags?.includes(tag))
      );
    }

    // Filter by selected folder ONLY when actively in folder view (activeTab === 'folders')
    if (selectedFolder && activeTab === 'folders') {
      console.log(`📁 Applying folder filter: ${selectedFolder}, documents before filter:`, filtered.length);
      filtered = filtered.filter(doc => 
        (doc as any).folderId === selectedFolder || 
        doc.path?.includes(`folder-${selectedFolder}`) ||
        doc.path?.includes(`folders/${selectedFolder}`)
      );
      console.log(`📁 Documents after folder filter:`, filtered.length);
    }

    console.log(`📊 Filter results: ${filtered.length}/${convertedDocs.length} documents`, {
      searchTerm: documentSearchTerm,
      activeFilters,
      selectedFolder: activeTab === 'folders' ? selectedFolder : 'ignored',
      activeTab
    });
    
    setFilteredDocuments(filtered as any[]);
  }, [state.documents, documentSearchTerm, activeFilters, selectedFolder, activeTab]);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadFolders = async () => {
    try {
      // Always refresh folders to ensure we have the latest data, including defaults
      const folderList = await dmsService.folders.listAll();
      dispatch({ type: 'SET_FOLDERS', payload: folderList });
      console.log('Folders loaded and synchronized:', folderList.map(f => f.name));
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const loadTags = async () => {
    try {
      const tagList = await dmsService.tags.list();
      setTags(tagList);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  // Remove the duplicate applyFilters function definition since it's now defined above

   const loadFolderContents = async (folderId: string | null) => {
    setLoading(true);
    console.log(`Loading folder contents for: ${folderId || 'root'}`);
    try {
      // Load subfolders
      const subfolders = await dmsService.folders.list(folderId || undefined);
      console.log(`Found ${subfolders.length} subfolders:`, subfolders.map(f => f.name));
      setCurrentSubfolders(subfolders);
      
      // Load files in this folder (filter from state documents)
      const folderFiles = state.documents.filter(doc => {
        const docWithFolder = doc as any;
        return folderId 
          ? docWithFolder.folderId === folderId ||
            doc.path?.includes(`folder-${folderId}`) ||
            doc.path?.includes(`folders/${folderId}`)
          : !docWithFolder.folderId && !doc.path?.includes('folder-');
      }).map(doc => ({
        ...doc,
        type: doc.type || 'pdf',
        size: doc.size || 0,
        uploadedByName: doc.uploadedByName || 'Unknown',
        uploadedBy: doc.uploadedByName || 'Unknown',
        createdAt: (doc as any).createdAt || doc.uploadedAt
      }));
      
      setCurrentFolderFiles(folderFiles as LocalDocument[]);
      
      console.log(`[DMS] openFolder OK id=${folderId || 'root'} subfolders=${subfolders.length} files=${folderFiles.length}`);
    } catch (error) {
      console.log(`[DMS] openFolder ERR reason=${error}`);
      toast({
        title: "Error",
        description: "Failed to load folder contents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (folderId: string) => {
    try {
      const folder = await dmsService.folders.get(folderId);
      if (folder) {
        setSelectedFolder(folderId);
        setCurrentPath([...currentPath, folder.name]);
        await loadFolderContents(folderId);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBreadcrumbClick = async (index: number) => {
    if (index === -1) {
      // Navigate to root
      setSelectedFolder(null);
      setCurrentPath([]);
      await loadFolderContents(null);
    } else {
      // Navigate to specific path level
      const newPath = currentPath.slice(0, index + 1);
      setCurrentPath(newPath);
      // In a real app, you'd need to derive folderId from path
      await loadFolderContents(null);
    }
  };

  const handleFolderCreated = async (newFolder: any) => {
    console.log('Folder created:', newFolder);
    // Refresh folders from service to ensure UI is up to date
    await loadFolders();
    // Always refresh current folder contents to update the view
    await loadFolderContents(selectedFolder);
    console.log('Folder contents refreshed after creation');
  };

  const handleDocumentView = useCallback(async (doc: any) => {
    try {
      // Try unified storage first
      const documentRepository = storageManager.getDocumentRepository();
      const fullDoc = await documentRepository.getWithAttachments(doc.id);
      
      if (fullDoc && fullDoc.content) {
        const previewUrl = documentRepository.createPreviewUrl(fullDoc);
        window.open(previewUrl, '_blank');
        
        toast({
          title: "Opening Document",
          description: `${doc.name} opened for preview`,
        });
        return;
      }
      
      // Fallback to legacy dmsService
      const previewUrl = await dmsService.files.getPreviewUrl(doc.id);
      window.open(previewUrl, '_blank');
      
      toast({
        title: "Opening Document",
        description: `${doc.name} opened for preview`,
      });
    } catch (error) {
      console.error('Document preview error:', error);
      toast({
        title: "Preview Error",
        description: "Unable to preview this document. Try downloading instead.",
        variant: "destructive",
      });
    }
  }, []);

  const handleDocumentDownload = useCallback(async (doc: any) => {
    try {
      // Try unified storage first
      const documentRepository = storageManager.getDocumentRepository();
      const fullDoc = await documentRepository.getWithAttachments(doc.id);
      
      if (fullDoc && fullDoc.content) {
        documentRepository.downloadDocument(fullDoc);
        return;
      }
      
      // Fallback to legacy dmsService
      await dmsService.files.download(doc.id, doc.name);
    } catch (error) {
      console.error('Document download error:', error);
      toast({
        title: "Download Error",
        description: "Unable to download this document. Please try again.",
        variant: "destructive",
      });
    }
  }, []);

  const handleDocumentUpload = async (file: File, options: any = {}) => {
    console.log('📥 [DocumentManagement] Received upload request:', {
      fileName: file.name,
      options: {
        caseId: options.caseId,
        clientId: options.clientId,
        folderId: options.folderId
      }
    });

    try {
      // Early validation: at least one link must be provided
      if (!options.caseId && !options.clientId && !options.folderId) {
        const missing = [];
        if (!options.caseId) missing.push('Case');
        if (!options.clientId) missing.push('Client');
        if (!options.folderId) missing.push('Folder');
        
        throw new Error(`Missing required association. Please select at least one: ${missing.join(', ')}`);
      }

      // Get current user and tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to upload documents');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('Unable to determine tenant context');
      }

      const metadata = {
        tenant_id: profile.tenant_id,
        case_id: options.caseId,
        client_id: options.clientId,
        folder_id: options.folderId,
        category: 'general'
      };

      console.log('🚀 [DocumentManagement] Calling supabaseDocumentService.uploadDocument with metadata:', metadata);

      // Upload using Supabase Document Service
      const uploadResult = await supabaseDocumentService.uploadDocument(file, metadata);

      // Dispatch to update UI state
      dispatch({
        type: 'ADD_DOCUMENT',
        payload: {
          id: uploadResult.id,
          name: uploadResult.file_name,
          type: uploadResult.file_type,
          size: uploadResult.file_size,
          clientId: options.clientId,
          caseId: options.caseId,
          uploadedAt: new Date().toISOString(),
          uploadedById: user.id,
          uploadedByName: profile.full_name || 'Unknown',
          tags: options.tags || [],
          isShared: false,
          path: uploadResult.file_path
        }
      });

      toast({
        title: "Upload Successful",
        description: `${uploadResult.file_name} has been uploaded successfully.`,
      });

      // Refresh folder contents
      await loadFolderContents(selectedFolder);
      await loadFolders();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateReplace = async () => {
    if (duplicateModal.file && duplicateModal.existingDoc && duplicateModal.options) {
      try {
        await dmsService.files.handleDuplicate(
          duplicateModal.file,
          'replace',
          duplicateModal.existingDoc,
          duplicateModal.options,
          dispatch
        );
        await loadFolderContents(selectedFolder);
        setDuplicateModal({ isOpen: false });
      } catch (error: any) {
        toast({
          title: "Replace Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDuplicateVersion = async () => {
    if (duplicateModal.file && duplicateModal.existingDoc && duplicateModal.options) {
      try {
        await dmsService.files.handleDuplicate(
          duplicateModal.file,
          'version',
          duplicateModal.existingDoc,
          duplicateModal.options,
          dispatch
        );
        await loadFolderContents(selectedFolder);
        setDuplicateModal({ isOpen: false });
      } catch (error: any) {
        toast({
          title: "Version Creation Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDuplicateCancel = () => {
    setDuplicateModal({ isOpen: false });
  };

  const handleDocumentDelete = async (doc: any) => {
    if (confirm(`Are you sure you want to delete ${doc.name}? This action cannot be undone.`)) {
      try {
        await dmsService.files.delete(doc.id, dispatch);
        // Remove from filtered list immediately
        setFilteredDocuments(prev => prev.filter(d => d.id !== doc.id));
        // Reload current folder
        await loadFolderContents(selectedFolder);
      } catch (error) {
        // Error already handled in service
      }
    }
  };

  const handleAddTag = async (doc: any, tagName: string) => {
    try {
      const updatedTags = [...(doc.tags || []), tagName];
      await dmsService.files.updateMetadata(doc.id, { tags: updatedTags }, dispatch);
      
      // Update local state
      setFilteredDocuments(prev => 
        prev.map(d => d.id === doc.id ? { ...d, tags: updatedTags } : d)
      );
    } catch (error) {
      // Error already handled in service
    }
  };

  const navigateToHome = async () => {
    setSelectedFolder(null);
    setCurrentPath([]);
    await loadFolderContents(null);
  };

  const handleResetFilters = () => {
    setDocumentSearchTerm('');
    setActiveFilters({});
    setSelectedFolder(null);
    console.log('🔄 All filters reset');
    toast({
      title: "Filters Reset",
      description: "All document filters have been cleared.",
    });
  };

  // Return navigation handler
  const handleReturnToStageManagement = async () => {
    const returnContext = await navigationContextService.getContext();
    if (returnContext?.returnTo === 'stage-management' && returnContext.returnCaseId) {
      navigate(`/cases?caseId=${returnContext.returnCaseId}`);
      await navigationContextService.clearContext();
      
      // Signal to reopen stage dialog after navigation
      setTimeout(() => {
        const event = new CustomEvent('reopen-stage-dialog', { 
          detail: { 
            caseId: returnContext.returnCaseId,
            stageId: returnContext.returnStage 
          } 
        });
        window.dispatchEvent(event);
      }, 100);
    }
  };

  // Check if we have return context
  const [hasReturnCtx, setHasReturnCtx] = useState(false);
  const [currentCaseInfo, setCurrentCaseInfo] = useState<{ id: string; number: string } | null>(null);
  
  useEffect(() => {
    const loadContext = async () => {
      const ctx = await navigationContextService.getContext();
      setHasReturnCtx(ctx?.returnTo === 'stage-management' && !!ctx.returnCaseId);
      
      const caseId = searchParams.get('caseId') || ctx?.returnCaseId;
      if (caseId) {
        const currentCase = state.cases.find(c => c.id === caseId);
        setCurrentCaseInfo(currentCase ? { id: caseId, number: currentCase.caseNumber } : null);
      }
    };
    loadContext();
  }, [searchParams, state.cases]);

  // Load initial content
  useEffect(() => {
    loadFolderContents(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Return Navigation Breadcrumb */}
      {hasReturnCtx && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-secondary/10 border border-secondary/20 rounded-lg p-3"
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  Cases
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  {currentCaseInfo?.number || 'Case'}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink className="cursor-pointer" onClick={handleReturnToStageManagement}>
                  Stage Management
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Documents</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">
              Viewing documents from Case Stage Management
              {searchTerm && <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded">Search: {searchTerm}</span>}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReturnToStageManagement}
              className="h-8"
            >
              <ArrowRight className="mr-2 h-3 w-3" />
              Back to Case Stage
            </Button>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Document Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Secure document storage with version control and access management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ContextualPageHelp
              pageId="document-management" 
              activeTab={activeTab} 
              variant="resizable" 
            />
            <InlineHelp module="documents" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            onClick={handleResetFilters}
            size="sm"
          >
            <X className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Reset Filters</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => setNewFolderModal(true)}
            size="sm"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">New Folder</span>
          </Button>
          <Button 
            className="bg-primary hover:bg-primary-hover"
            onClick={() => {
              setDocumentModal({ isOpen: true, mode: 'upload', document: null });
            }}
            data-tour="upload-btn"
            size="sm"
          >
            <Upload className="mr-0 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Add Document</span>
            <span className="xs:hidden sr-only">Add</span>
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">1,247</p>
              </div>
              <File className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-foreground">23</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                <p className="text-2xl font-bold text-foreground">24.8 GB</p>
              </div>
              <Shield className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Folders</p>
                <p className="text-2xl font-bold text-foreground">16</p>
              </div>
              <FolderOpen className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Organization Guide */}
      <OrganizationGuide />

      {/* Unified Document Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <UnifiedDocumentSearch
          onSearch={(query) => setDocumentSearchTerm(query)}
          onFiltersChange={setActiveFilters}
          activeFilters={activeFilters}
          searchTerm={documentSearchTerm}
          onSearchTermChange={setDocumentSearchTerm}
          clients={state.clients}
          cases={state.cases}
          folders={state.folders}
          uploaders={Array.from(new Set(state.documents.map(d => d.uploadedByName).filter(Boolean)))}
        />
      </motion.div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleBreadcrumbClick(-1)}
          className="p-1 h-auto"
        >
          <Home className="h-4 w-4" />
        </Button>
        {currentPath.map((pathItem, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBreadcrumbClick(index)}
              className="p-1 h-auto font-medium text-foreground hover:text-primary"
            >
              {pathItem}
            </Button>
          </React.Fragment>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        // Clear folder selection when leaving folders tab to prevent filter issues
        if (value !== 'folders') {
          setSelectedFolder(null);
          console.log(`📁 Cleared folder selection when switching to tab: ${value}`);
        }
      }} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 p-1 h-auto min-w-[400px]">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="folders" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">Folders</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">
              <span className="hidden sm:inline">All Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap">
              <span className="hidden sm:inline">Form Templates</span>
              <span className="sm:hidden">Forms</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Document Management Overview</CardTitle>
                <CardDescription>
                  Central hub for all document management activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setDocumentModal({ isOpen: true, mode: 'upload', document: null })}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Documents
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setNewFolderModal(true)}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Create New Folder
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setActiveTab('documents')}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        Advanced Search
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-3">Recent Activity</h3>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>5 documents uploaded today</div>
                      <div>3 folders created this week</div>
                      <div>12 documents shared</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <RecentDocuments documents={filteredDocuments.slice(0, 10).map(doc => ({ 
              ...doc, 
              type: String(doc.type),
              size: typeof doc.size === 'string' ? parseInt(doc.size) || 0 : doc.size
            }))} />
          </motion.div>
        </TabsContent>

        <TabsContent value="folders" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Organization Guide */}
              <OrganizationGuide />
              
              {/* Unified Search for Folders */}
              <UnifiedDocumentSearch
                onSearch={(query) => setDocumentSearchTerm(query)}
                onFiltersChange={setActiveFilters}
                activeFilters={activeFilters}
                searchTerm={documentSearchTerm}
                onSearchTermChange={setDocumentSearchTerm}
                placeholder="Search folder contents by title, tag, content, client, case... (Press Ctrl+F to focus)"
                clients={state.clients}
                cases={state.cases}
                folders={state.folders}
                uploaders={Array.from(new Set(state.documents.map(d => d.uploadedByName).filter(Boolean)))}
              />
              {/* Current Folder Subfolders */}
              {currentSubfolders.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Folders</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentSubfolders.map((folder) => (
                      <Card 
                        key={folder.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleFolderClick(folder.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <FolderOpen className="h-8 w-8 text-primary" />
                            <div className="flex-1">
                              <h4 className="font-medium">{folder.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {folder.documentCount || 0} files
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Current Folder Files */}
              {currentFolderFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Files</h3>
                  <div className="space-y-2">
                    {currentFolderFiles.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(String(doc.type))}</span>
                          <div>
                            <h4 className="font-medium">{doc.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {doc.uploadedByName} • {doc.uploadedAt}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleDocumentView(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDocumentDownload(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setDocumentModal({ isOpen: true, mode: 'edit', document: doc })}>
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => console.log('Add tag', doc)}>
                                Add Tag
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDocumentDelete(doc)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Empty state */}
              {currentSubfolders.length === 0 && currentFolderFiles.length === 0 && (
                <div className="text-center py-12">
                  <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
                  <p className="text-muted-foreground mb-4">
                    This folder is empty. Start by uploading documents or creating subfolders.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setDocumentModal({ isOpen: true, mode: 'upload' })}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Documents
                    </Button>
                    <Button variant="outline" onClick={() => setNewFolderModal(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      New Folder
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Organization Guide */}
            <OrganizationGuide />
            
            {/* Unified Search for All Documents */}
            <UnifiedDocumentSearch
              onSearch={(query) => setDocumentSearchTerm(query)}
              onFiltersChange={setActiveFilters}
              activeFilters={activeFilters}
              searchTerm={documentSearchTerm}
              onSearchTermChange={setDocumentSearchTerm}
              placeholder="Search all documents by title, tag, content, client, case... (Press Ctrl+F to focus)"
              clients={state.clients}
              cases={state.cases}
              folders={state.folders}
              uploaders={Array.from(new Set(state.documents.map(d => d.uploadedByName).filter(Boolean)))}
            />
            {filteredDocuments.length > 0 ? (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getFileIcon(String(doc.type))}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{doc.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{doc.uploadedByName}</span>
                          <span>•</span>
                          <span>{doc.uploadedAt}</span>
                          {doc.tags?.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex gap-1">
                                {doc.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.tags.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{doc.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDocumentView(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDocumentDownload(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setDocumentModal({ isOpen: true, mode: 'edit', document: doc })}>
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Add tag', doc)}>
                            Add Tag
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDocumentDelete(doc)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-4">
                  {documentSearchTerm || Object.keys(activeFilters).length > 0 
                    ? "Try adjusting your search or filters" 
                    : "Start by uploading your first document"
                  }
                </p>
                <Button onClick={() => setDocumentModal({ isOpen: true, mode: 'upload' })}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Documents
                </Button>
              </div>
            )}
          </motion.div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesManagement />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <DocumentModal
        isOpen={documentModal.isOpen}
        mode={documentModal.mode}
        document={documentModal.document}
        selectedFolderId={selectedFolder || undefined}
        onClose={() => setDocumentModal({ isOpen: false, mode: 'upload', document: null })}
        onUpload={handleDocumentUpload}
        contextCaseId={searchParams.get('caseId') || undefined}
      />

      <NewFolderModal
        isOpen={newFolderModal}
        onClose={() => setNewFolderModal(false)}
        onFolderCreated={handleFolderCreated}
      />

      <DuplicateHandlerModal
        isOpen={duplicateModal.isOpen}
        file={duplicateModal.file}
        existingDoc={duplicateModal.existingDoc}
        onClose={handleDuplicateCancel}
        onReplace={handleDuplicateReplace}
        onCreateVersion={handleDuplicateVersion}
        onCancel={handleDuplicateCancel}
      />

      {/* Notice Intake Wizard */}
      {featureFlagService.isEnabled('notice_intake_v1') && (
        <NoticeIntakeWizard
          isOpen={noticeIntakeModal}
          onClose={() => setNoticeIntakeModal(false)}
        />
      )}
    </div>
  );
};