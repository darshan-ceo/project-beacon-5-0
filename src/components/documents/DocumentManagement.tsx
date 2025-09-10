import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { DocumentModal } from '@/components/modals/DocumentModal';
import { NewFolderModal } from './NewFolderModal';
import { DocumentFilters } from './DocumentFilters';
import { DuplicateHandlerModal } from './DuplicateHandlerModal';
import { OrganizationGuide } from './OrganizationGuide';
import { RecentDocuments } from './RecentDocuments';
import { motion } from 'framer-motion';
import { dmsService } from '@/services/dmsService';
import { useAppState } from '@/contexts/AppStateContext';
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
  HelpCircle
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
import { PageHelp } from '@/components/help/PageHelp';
import { tourService } from '@/services/tourService';

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

// Remove the old mock data - we'll use the state data now

export const DocumentManagement: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'grid' | 'list'>('list');
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

  // Handle URL parameters for search, case filtering, and return context
  useEffect(() => {
    const search = searchParams.get('search');
    const caseId = searchParams.get('caseId');
    const returnTo = searchParams.get('returnTo');
    const returnCaseId = searchParams.get('returnCaseId');
    
    if (search) {
      setSearchTerm(search);
    }
    
    if (caseId) {
      setActiveFilters(prev => ({ ...prev, caseId }));
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
      localStorage.setItem('navigation-context', JSON.stringify(returnContext));
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

  // Apply filters when documents or filters change
  useEffect(() => {
    applyFilters();
  }, [state.documents, searchTerm, activeFilters]);

  const loadFolders = async () => {
    try {
      // Only load and sync localStorage folders if AppStateContext folders are empty
      if (state.folders.length === 0) {
        const folderList = await dmsService.folders.listAll();
        dispatch({ type: 'SET_FOLDERS', payload: folderList });
        console.log('Initial folders loaded from localStorage:', folderList.length);
      } else {
        console.log('Using folders from AppStateContext:', state.folders.length);
      }
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

  const applyFilters = async () => {
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

    // Search filter - improved to handle tag-specific searches
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => {
        // Search in document name
        const nameMatch = doc.name.toLowerCase().includes(searchLower);
        
        // Search in tags
        const tagMatch = doc.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        // Search in case ID/number if available
        const caseMatch = doc.caseId?.toLowerCase().includes(searchLower);
        
        return nameMatch || tagMatch || caseMatch;
      });
    }

    // Apply active filters
    if (activeFilters.caseId) {
      filtered = filtered.filter(doc => doc.caseId === activeFilters.caseId);
    }
    if (activeFilters.fileType && activeFilters.fileType !== 'all') {
      filtered = filtered.filter(doc => String(doc.type).includes(activeFilters.fileType));
    }
    if (activeFilters.uploadedBy) {
      filtered = filtered.filter(doc => doc.uploadedById === activeFilters.uploadedBy);
    }
    if (activeFilters.tags?.length > 0) {
      filtered = filtered.filter(doc => 
        activeFilters.tags.some((tag: string) => doc.tags.includes(tag))
      );
    }

    // Filter by selected folder if in folder view
    if (selectedFolder) {
      filtered = filtered.filter(doc => 
        (doc as any).folderId === selectedFolder || 
        doc.path?.includes(`folder-${selectedFolder}`) ||
        doc.path?.includes(`folders/${selectedFolder}`)
      );
    }

    setFilteredDocuments(filtered as any[]);
  };

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

  const handleDocumentView = async (doc: any) => {
    try {
      const previewUrl = await dmsService.files.getPreviewUrl(doc.id);
      window.open(previewUrl, '_blank');
      
      toast({
        title: "Opening Document",
        description: `${doc.name} opened for preview`,
      });
    } catch (error) {
      toast({
        title: "Preview Error",
        description: "Unable to preview this document. Try downloading instead.",
        variant: "destructive",
      });
    }
  };

  const handleDocumentDownload = async (doc: any) => {
    try {
      await dmsService.files.download(doc.id, doc.name);
    } catch (error) {
      // Error handling is already done in the service
    }
  };

  const handleDocumentUpload = async (file: File, options: any = {}) => {
    try {
      // Prepare options with existing documents for duplicate checking
      const uploadOptions = {
        ...options,
        existingDocuments: state.documents
      };

      const result = await dmsService.files.upload(file, uploadOptions, dispatch);
      
      if (result.success && result.document) {
        // Successful upload
        await loadFolderContents(selectedFolder);
        await loadFolders();
      } else if (result.duplicate) {
        // Handle duplicate
        setDuplicateModal({
          isOpen: true,
          file,
          existingDoc: result.duplicate.existingDoc,
          options: uploadOptions
        });
      }
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
      const updatedTags = [...doc.tags, tagName];
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

  // Return navigation handler
  const handleReturnToStageManagement = () => {
    const returnContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
    if (returnContext.returnTo === 'stage-management' && returnContext.returnCaseId) {
      // Navigate back to case and open stage management
      navigate(`/cases?caseId=${returnContext.returnCaseId}`);
      
      // Clear return context
      localStorage.removeItem('navigation-context');
      
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
  const hasReturnContext = () => {
    try {
      const returnContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
      return returnContext.returnTo === 'stage-management' && returnContext.returnCaseId;
    } catch {
      return false;
    }
  };

  // Get current case info for breadcrumb
  const getCurrentCaseInfo = () => {
    try {
      const returnContext = JSON.parse(localStorage.getItem('navigation-context') || '{}');
      const caseId = searchParams.get('caseId') || returnContext.returnCaseId;
      const currentCase = state.cases.find(c => c.id === caseId);
      return currentCase ? { id: caseId, number: currentCase.caseNumber } : null;
    } catch {
      return null;
    }
  };

  // Load initial content
  useEffect(() => {
    loadFolderContents(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Return Navigation Breadcrumb */}
      {hasReturnContext() && (
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
                  {getCurrentCaseInfo()?.number || 'Case'}
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
        className="flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Document Management</h1>
            <p className="text-muted-foreground mt-2">
              Secure document storage with version control and access management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InlineHelp module="documents" />
            <PageHelp pageId="document-management" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setNewFolderModal(true)}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button 
            variant="outline"
            onClick={() => tourService.startTour('dms-upload')}
            className="text-xs"
          >
            <HelpCircle className="mr-2 h-3 w-3" />
            Start Tour
          </Button>
          <Button 
            className="bg-primary hover:bg-primary-hover"
            onClick={() => {
              setDocumentModal({ isOpen: true, mode: 'upload', document: null });
            }}
            data-tour="upload-btn"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Documents
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
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

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents, tags, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <DocumentFilters
          onFiltersChange={setActiveFilters}
          activeFilters={activeFilters}
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
      <Tabs defaultValue="folders" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="folders">Folders</TabsTrigger>
          <TabsTrigger value="documents">All Documents</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="templates">Form Templates</TabsTrigger>
        </TabsList>

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
              {/* Current Folder Subfolders */}
              {currentSubfolders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Folders</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentSubfolders.map((folder, index) => (
                      <motion.div
                        key={folder.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileHover={{ y: -2 }}
                        className="cursor-pointer"
                        onClick={() => handleFolderClick(folder.id)}
                      >
                        <Card className="hover:shadow-lg transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <FolderOpen className="h-8 w-8 text-primary" />
                              <Badge variant="secondary" className="text-xs">
                                {folder.documentCount} files
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-foreground mb-2">{folder.name}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{folder.description}</p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              Last accessed {folder.lastAccess}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Folder Files */}
              {currentFolderFiles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Files</h3>
                  <Card>
                    <CardContent className="p-0">
                      <div className="space-y-0">
                        {currentFolderFiles.map((doc, index) => (
                          <div key={doc.id} className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${index !== currentFolderFiles.length - 1 ? 'border-b' : ''}`}>
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="text-2xl">{getFileIcon(String(doc.type))}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground truncate">{doc.name}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                               <span>{typeof doc.size === 'number' ? (doc.size / 1024).toFixed(1) + 'KB' : String(doc.size)}</span>
                               <span>Uploaded by {doc.uploadedByName}</span>
                               <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                               {(doc as any).createdAt && (
                                 <span>Created {new Date((doc as any).createdAt).toLocaleDateString()}</span>
                               )}
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  {doc.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDocumentView(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDocumentDownload(doc)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => setDocumentModal({ isOpen: true, mode: 'edit', document: doc })}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAddTag(doc, 'urgent')}>
                                    <Tag className="mr-2 h-4 w-4" />
                                    Add Tag
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDocumentDelete(doc)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Empty State */}
              {currentSubfolders.length === 0 && currentFolderFiles.length === 0 && !selectedFolder && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {state.folders.map((folder, index) => (
                    <motion.div
                      key={folder.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ y: -2 }}
                      className="cursor-pointer"
                      onClick={() => handleFolderClick(folder.id)}
                    >
                      <Card className="hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <FolderOpen className="h-8 w-8 text-primary" />
                            <Badge variant="secondary" className="text-xs">
                              {folder.documentCount} files
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">{folder.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{folder.description}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            Last accessed {folder.lastAccess}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Empty folder state */}
              {currentSubfolders.length === 0 && currentFolderFiles.length === 0 && selectedFolder && (
                <div className="text-center py-12">
                  <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">This folder is empty</h3>
                  <p className="text-muted-foreground mb-4">Start by uploading some documents</p>
                  <Button 
                    onClick={() => setDocumentModal({ isOpen: true, mode: 'upload', document: null })}
                    className="bg-primary hover:bg-primary-hover"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Documents
                  </Button>
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
          >
            <Card>
              <CardHeader>
                <CardTitle>Organized Document Library</CardTitle>
                <CardDescription>
                  Browse all documents organized in folders. Use the search and filters to find specific documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredDocuments.length === 0 ? (
                    <div className="text-center py-12">
                      <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm || Object.keys(activeFilters).length > 0 
                          ? 'No documents match your search criteria' 
                          : 'No organized documents found. Use folders to organize your documents properly.'}
                      </p>
                      {!searchTerm && Object.keys(activeFilters).length === 0 && (
                        <div className="mt-4">
                          <Button 
                            onClick={() => setDocumentModal({ isOpen: true, mode: 'upload', document: null })}
                            className="mr-2"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload to Folder
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    filteredDocuments.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{getFileIcon(String(doc.type))}</div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-foreground">{doc.name}</p>
                              <Star className="h-4 w-4 text-warning" />
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>{typeof doc.size === 'number' ? (doc.size / 1024).toFixed(1) + 'KB' : String(doc.size)}</span>
                              <span>•</span>
                              <span>v1.0</span>
                              <span>•</span>
                              <div className="flex items-center">
                                <User className="mr-1 h-3 w-3" />
                                {doc.uploadedByName || 'Unknown'}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                                Active
                              </Badge>
                              {doc.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDocumentView(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDocumentDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                •••
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                setDocumentModal({ isOpen: true, mode: 'edit', document: doc as any });
                              }}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAddTag(doc, 'new-tag')}
                              >
                                <Tag className="mr-2 h-4 w-4" />
                                Add Tags
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDocumentDelete(doc)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>
                  Documents you've recently uploaded or accessed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentDocuments documents={state.documents} />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplatesManagement />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NewFolderModal
        isOpen={newFolderModal}
        onClose={() => setNewFolderModal(false)}
        onFolderCreated={handleFolderCreated}
        parentId={selectedFolder}
      />
      
      <DocumentModal
        isOpen={documentModal.isOpen}
        mode={documentModal.mode}
        document={documentModal.document}
        selectedFolderId={selectedFolder || undefined}
        onUpload={handleDocumentUpload}
        onClose={() => setDocumentModal({ isOpen: false, mode: 'upload', document: null })}
      />

      <DuplicateHandlerModal
        isOpen={duplicateModal.isOpen}
        onClose={() => setDuplicateModal({ isOpen: false })}
        file={duplicateModal.file}
        existingDoc={duplicateModal.existingDoc}
        onReplace={handleDuplicateReplace}
        onCreateVersion={handleDuplicateVersion}
        onCancel={handleDuplicateCancel}
      />

      {/* Page Help */}
      <PageHelp pageId="document-management" />
    </div>
  );
};