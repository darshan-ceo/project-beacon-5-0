import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { DocumentModal } from '@/components/modals/DocumentModal';
import { NewFolderModal } from './NewFolderModal';
import { DocumentFilters } from './DocumentFilters';
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
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'grid' | 'list'>('list');
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [folders, setFolders] = useState<any[]>([]);
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
      uploadedBy: doc.uploadedByName || 'Unknown'
    }));
    setFilteredDocuments(convertedDocs);
  }, [state.documents]);

  // Apply filters when documents or filters change
  useEffect(() => {
    applyFilters();
  }, [state.documents, searchTerm, activeFilters]);

  const loadFolders = async () => {
    try {
      const folderList = await dmsService.folders.list();
      setFolders([...state.folders, ...folderList]);
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

  const applyFilters = () => {
    // Convert state documents to local format for filtering
    const convertedDocs = state.documents.map(doc => ({
      ...doc,
      type: doc.type || 'pdf',
      size: doc.size || 0,
      uploadedByName: doc.uploadedByName || 'Unknown',
      uploadedBy: doc.uploadedByName || 'Unknown'
    }));
    
    let filtered = [...convertedDocs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
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

    setFilteredDocuments(filtered as any[]);
  };

  const loadFolderContents = async (folderId: string | null) => {
    setLoading(true);
    try {
      // Load subfolders
      const subfolders = await dmsService.folders.list(folderId || undefined);
      setCurrentSubfolders(subfolders);
      
      // Load files in this folder (filter from state documents)
      const folderFiles = state.documents.filter(doc => 
        folderId ? doc.path?.includes(`folder-${folderId}`) : !doc.path?.includes('folder-')
      ).map(doc => ({
        ...doc,
        type: doc.type || 'pdf',
        size: doc.size || 0,
        uploadedByName: doc.uploadedByName || 'Unknown',
        uploadedBy: doc.uploadedByName || 'Unknown'
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

  const handleFolderCreated = (newFolder: any) => {
    dispatch({ type: 'ADD_FOLDER', payload: newFolder });
    setFolders(prev => [...prev, newFolder]);
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

  const handleDocumentDelete = async (doc: any) => {
    if (confirm(`Are you sure you want to delete ${doc.name}? This action cannot be undone.`)) {
      try {
        await dmsService.files.delete(doc.id, dispatch);
        // Remove from filtered list immediately
        setFilteredDocuments(prev => prev.filter(d => d.id !== doc.id));
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

  // Load initial content
  useEffect(() => {
    loadFolderContents(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Management</h1>
          <p className="text-muted-foreground mt-2">
            Secure document storage with version control and access management
          </p>
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
            className="bg-primary hover:bg-primary-hover"
            onClick={() => {
              setDocumentModal({ isOpen: true, mode: 'upload', document: null });
            }}
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="folders">Folders</TabsTrigger>
          <TabsTrigger value="documents">All Documents</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
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
                                  <span>{typeof doc.size === 'number' ? `${(doc.size / 1024).toFixed(1)} KB` : doc.size}</span>
                                  <span>Uploaded by {doc.uploadedByName}</span>
                                  <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
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
                  {folders.map((folder, index) => (
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
                <CardTitle>Document Library</CardTitle>
                <CardDescription>
                  All documents with advanced search and filtering
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
                          : 'No documents found'}
                      </p>
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
                <CardTitle>Recently Accessed</CardTitle>
                <CardDescription>
                  Documents you've viewed or modified recently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Recent documents will appear here</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NewFolderModal
        isOpen={newFolderModal}
        onClose={() => setNewFolderModal(false)}
        parentId={selectedFolder}
        onFolderCreated={handleFolderCreated}
      />

      <DocumentModal
        isOpen={documentModal.isOpen}
        onClose={() => setDocumentModal({ isOpen: false, mode: 'upload', document: null })}
        mode={documentModal.mode}
        document={documentModal.document}
      />
    </div>
  );
};