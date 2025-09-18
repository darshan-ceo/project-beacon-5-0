import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Upload,
  Search,
  Filter,
  Calendar,
  FileIcon,
  Plus,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { useAppState, Case } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

interface CaseDocumentsProps {
  selectedCase: Case | null;
}

export const CaseDocuments: React.FC<CaseDocumentsProps> = ({ selectedCase }) => {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | string>('all');

  // Filter documents associated with the selected case
  const caseDocuments = useMemo(() => {
    if (!selectedCase) return [];
    
    return state.documents?.filter(doc => doc.caseId === selectedCase.id) || [];
  }, [state.documents, selectedCase]);

  // Apply search and filter
  const filteredDocuments = useMemo(() => {
    return caseDocuments.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || doc.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [caseDocuments, searchTerm, filterType]);

  // Get unique document types for filter
  const documentTypes = useMemo(() => {
    const types = new Set(caseDocuments.map(doc => doc.type));
    return Array.from(types);
  }, [caseDocuments]);

  const handleViewDocument = (documentId: string) => {
    // Navigate to document management with specific document selected
    navigate(`/documents?documentId=${documentId}`);
  };

  const handleDownloadDocument = (document: any) => {
    // Implement download logic
    toast({
      title: "Download Started",
      description: `Downloading ${document.name}...`,
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    // Implement delete logic
    toast({
      title: "Document Deleted",
      description: "Document has been removed from the case.",
    });
  };

  const handleUploadToCase = () => {
    // Navigate to document management with case pre-selected
    navigate(`/documents?caseId=${selectedCase?.id}&action=upload`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-destructive" />;
      case 'doc':
      case 'docx':
        return <FileIcon className="h-4 w-4 text-primary" />;
      case 'xls':
      case 'xlsx':
        return <FileIcon className="h-4 w-4 text-success" />;
      default:
        return <FileIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!selectedCase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Case Selected</h3>
          <p className="text-muted-foreground">
            Please select a case from the Overview tab to view its documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Case Documents</h2>
          <p className="text-muted-foreground">
            Documents associated with {selectedCase.caseNumber} - {selectedCase.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/documents')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            All Documents
          </Button>
          <Button
            onClick={handleUploadToCase}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">{caseDocuments.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">PDF Files</p>
                <p className="text-2xl font-bold text-foreground">
                  {caseDocuments.filter(doc => doc.type === 'pdf').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent Uploads</p>
                <p className="text-2xl font-bold text-foreground">
                  {caseDocuments.filter(doc => {
                    const uploadDate = new Date(doc.uploadedAt || doc.createdAt);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return uploadDate > weekAgo;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatFileSize(caseDocuments.reduce((total, doc) => total + (doc.size || 0), 0))}
                </p>
              </div>
              <FileIcon className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {documentTypes.length > 0 && (
            <FilterDropdown
              label="Type"
              options={documentTypes.map(type => ({ value: type, label: type.toUpperCase() }))}
              value={filterType}
              onChange={setFilterType}
              icon={<Filter className="h-4 w-4" />}
            />
          )}
        </div>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({filteredDocuments.length})
          </CardTitle>
          <CardDescription>
            All documents associated with this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Documents Found</h3>
              <p className="text-muted-foreground mb-4">
                {caseDocuments.length === 0 
                  ? "No documents have been uploaded for this case yet."
                  : "No documents match your search criteria."
                }
              </p>
              <Button onClick={handleUploadToCase} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Upload First Document
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        {getFileIcon(document.type)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {document.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {document.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatFileSize(document.size || 0)}
                      </TableCell>
                      <TableCell>
                        {new Date(document.uploadedAt || document.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {document.tags?.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(document.tags?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(document.tags?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(document.id)}
                            title="View Document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadDocument(document)}
                            title="Download Document"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(document.id)}
                            title="Delete Document"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};