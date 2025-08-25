import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Star
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

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'xlsx' | 'jpg' | 'png';
  size: string;
  stage: 'Draft' | 'Review' | 'Approved' | 'Final';
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  lastModified: string;
  version: string;
  isStarred: boolean;
  folder: string;
  client?: string;
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

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Service Agreement - Acme Corp.pdf',
    type: 'pdf',
    size: '2.4 MB',
    stage: 'Approved',
    tags: ['contract', 'service', 'acme'],
    uploadedBy: 'John Smith',
    uploadedAt: '2024-01-15',
    lastModified: '2024-01-20',
    version: 'v2.1',
    isStarred: true,
    folder: 'Client Agreements',
    client: 'Acme Corporation Ltd'
  },
  {
    id: '2',
    name: 'Court Filing - Case #2024-001.pdf',
    type: 'pdf',
    size: '1.8 MB',
    stage: 'Final',
    tags: ['court', 'filing', 'urgent'],
    uploadedBy: 'Sarah Johnson',
    uploadedAt: '2024-01-18',
    lastModified: '2024-01-18',
    version: 'v1.0',
    isStarred: false,
    folder: 'Court Filings',
    client: 'Global Tech Solutions'
  },
  {
    id: '3',
    name: 'Evidence Photos - Location A.zip',
    type: 'jpg',
    size: '15.6 MB',
    stage: 'Review',
    tags: ['evidence', 'photos', 'investigation'],
    uploadedBy: 'Mike Wilson',
    uploadedAt: '2024-01-19',
    lastModified: '2024-01-19',
    version: 'v1.0',
    isStarred: false,
    folder: 'Evidence & Discovery',
    client: 'Metro Industries Pvt Ltd'
  }
];

export const DocumentManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'grid' | 'list'>('list');

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
          <Button variant="outline">
            <FolderOpen className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button className="bg-primary hover:bg-primary-hover">
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
        
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Tag className="mr-2 h-4 w-4" />
            Tags
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs defaultValue="folders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="folders">Folders</TabsTrigger>
          <TabsTrigger value="documents">All Documents</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="folders" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {mockFolders.map((folder, index) => (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -2 }}
                className="cursor-pointer"
                onClick={() => setSelectedFolder(folder.id)}
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
          </motion.div>
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
                  {mockDocuments.map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">{getFileIcon(doc.type)}</div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-foreground">{doc.name}</p>
                            {doc.isStarred && <Star className="h-4 w-4 text-warning fill-current" />}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.version}</span>
                            <span>•</span>
                            <div className="flex items-center">
                              <User className="mr-1 h-3 w-3" />
                              {doc.uploadedBy}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className={getStageColor(doc.stage)}>
                              {doc.stage}
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
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Tag className="mr-2 h-4 w-4" />
                              Add Tags
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
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
    </div>
  );
};