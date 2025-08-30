import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Upload, 
  Search,
  Filter,
  Calendar,
  User,
  Eye,
  FolderOpen
} from 'lucide-react';
import { dmsService } from '@/services/dmsService';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  caseId?: string;
  clientId?: string;
  uploadedBy: string;
  uploadedAt: string;
  tags: string[];
  shared: boolean;
  path: string;
}

interface ClientDocumentLibraryProps {
  documents: Document[];
  clientId: string;
}

export const ClientDocumentLibrary: React.FC<ClientDocumentLibraryProps> = ({ 
  documents, 
  clientId 
}) => {
  const { state, dispatch } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);

  // Filter documents based on search and type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || 
                         doc.type.toLowerCase().includes(selectedFilter.toLowerCase());
    
    return matchesSearch && matchesFilter;
  });

  // Group documents by type
  const documentsByType = filteredDocuments.reduce((acc, doc) => {
    const type = doc.type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // Get first active case for this client
      const clientCase = state.cases.find(c => c.clientId === clientId);
      if (!clientCase) {
        toast({
          title: "No Active Case",
          description: "Please contact your legal team to set up a case first",
          variant: "destructive"
        });
        return;
      }

      await dmsService.uploadForCaseStage(file, clientCase.id, 'Client Upload', dispatch);
      
      toast({
        title: "Upload Successful",
        description: "Your document has been uploaded and is being processed",
      });

      // Reset file input
      event.target.value = '';
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (document: Document) => {
    // Mock download functionality
    toast({
      title: "Download Started",
      description: `Downloading ${document.name}...`,
    });

    // Simulate download
    const link = globalThis.document.createElement('a');
    link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(
      `Mock document content for: ${document.name}\nType: ${document.type}\nSize: ${document.size} bytes`
    )}`;
    link.download = document.name;
    globalThis.document.body.appendChild(link);
    link.click();
    globalThis.document.body.removeChild(link);
  };

  const handlePreview = (document: Document) => {
    toast({
      title: "Preview Opening",
      description: `Opening preview for ${document.name}`,
    });
    // In real app, would open document preview modal/window
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: string) => {
    return <FileText className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with Upload */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Document Library</h2>
          <p className="text-muted-foreground">
            {documents.length} documents available
          </p>
        </div>
        
        <div className="relative">
          <Input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id="file-upload"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <Button 
            asChild
            disabled={isUploading}
            className="bg-primary hover:bg-primary-hover"
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </label>
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
        >
          <option value="all">All Types</option>
          <option value="pdf">PDF</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
          <option value="contract">Contracts</option>
        </select>
      </div>

      {/* Documents Content */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm || selectedFilter !== 'all' ? 'No Documents Found' : 'No Documents Yet'}
            </h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || selectedFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Upload your first document to get started.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(documentsByType).map(([type, docs]) => (
            <motion.div 
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getFileTypeIcon(type)}
                    <span>{type}</span>
                    <Badge variant="secondary">{docs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    {docs.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          {getFileTypeIcon(doc.type)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {doc.name}
                            </h4>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                              <span>{formatFileSize(doc.size)}</span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {doc.uploadedBy}
                              </span>
                            </div>
                            {doc.tags.length > 0 && (
                              <div className="flex space-x-1 mt-2">
                                {doc.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {doc.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{doc.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Guidelines */}
      <Card className="bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Maximum file size: 10MB</p>
          <p>• Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG</p>
          <p>• Files are automatically associated with your active case</p>
          <p>• Your legal team will be notified of new uploads</p>
        </CardContent>
      </Card>
    </div>
  );
};