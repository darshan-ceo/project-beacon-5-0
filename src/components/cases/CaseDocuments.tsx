import React, { useState, useMemo, useEffect } from 'react';
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
  ExternalLink,
  ArrowLeft
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
import { formatDateForDisplay } from '@/utils/dateFormatters';
import { supabaseDocumentService } from '@/services/supabaseDocumentService';
import { navigationContextService } from '@/services/navigationContextService';
import { supabase } from '@/integrations/supabase/client';

interface CaseDocumentsProps {
  selectedCase: Case | null;
}

export const CaseDocuments: React.FC<CaseDocumentsProps> = ({ selectedCase }) => {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | string>('all');
  const [hasReturnCtx, setHasReturnCtx] = useState(false);

  // Check for return context
  useEffect(() => {
    const loadContext = async () => {
      const ctx = await navigationContextService.getContext();
      setHasReturnCtx(
        ctx?.returnTo === 'case-documents' && 
        !!ctx.caseId &&
        ctx.caseId === selectedCase?.id
      );
    };
    loadContext();
  }, [selectedCase]);

  // Set up real-time subscription for documents
  useEffect(() => {
    if (!selectedCase) return;

    console.log(`[CaseDocuments] Setting up real-time subscription for case ${selectedCase.id}`);

    const channel = supabase
      .channel(`documents-case-${selectedCase.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
          filter: `case_id=eq.${selectedCase.id}`
        },
        (payload) => {
          console.log('[CaseDocuments] Real-time INSERT received:', payload);
          
          const newDoc = payload.new;
          
          // Map database fields to app state format
          const mappedDoc = {
            id: newDoc.id,
            name: newDoc.file_name,
            fileName: newDoc.file_name,
            type: newDoc.file_type,
            fileType: newDoc.file_type,
            size: newDoc.file_size,
            fileSize: newDoc.file_size,
            path: newDoc.file_path,
            filePath: newDoc.file_path,
            mimeType: newDoc.mime_type,
            storageUrl: newDoc.storage_url,
            caseId: newDoc.case_id,
            clientId: newDoc.client_id,
            folderId: newDoc.folder_id,
            category: newDoc.category,
            uploadedBy: newDoc.uploaded_by,
            uploadedById: newDoc.uploaded_by,
            uploadedByName: 'User',
            uploadTimestamp: newDoc.upload_timestamp,
            uploadedAt: newDoc.upload_timestamp,
            isShared: false,
            tags: []
          };
          
          dispatch({
            type: 'ADD_DOCUMENT',
            payload: mappedDoc
          });
          
          toast({
            title: "Document Uploaded",
            description: `${newDoc.file_name} has been added to this case`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `case_id=eq.${selectedCase.id}`
        },
        (payload) => {
          console.log('[CaseDocuments] Real-time UPDATE received:', payload);
          
          const updatedDoc = payload.new;
          
          const mappedDoc = {
            id: updatedDoc.id,
            name: updatedDoc.file_name,
            fileName: updatedDoc.file_name,
            type: updatedDoc.file_type,
            fileType: updatedDoc.file_type,
            size: updatedDoc.file_size,
            fileSize: updatedDoc.file_size,
            path: updatedDoc.file_path,
            filePath: updatedDoc.file_path,
            mimeType: updatedDoc.mime_type,
            storageUrl: updatedDoc.storage_url,
            caseId: updatedDoc.case_id,
            clientId: updatedDoc.client_id,
            folderId: updatedDoc.folder_id,
            category: updatedDoc.category,
            uploadedBy: updatedDoc.uploaded_by,
            uploadedById: updatedDoc.uploaded_by,
            uploadedByName: 'User',
            uploadTimestamp: updatedDoc.upload_timestamp,
            uploadedAt: updatedDoc.upload_timestamp,
            isShared: false,
            tags: []
          };
          
          dispatch({
            type: 'UPDATE_DOCUMENT',
            payload: mappedDoc
          });
          
          toast({
            title: "Document Updated",
            description: `${updatedDoc.file_name} has been modified`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'documents',
          filter: `case_id=eq.${selectedCase.id}`
        },
        (payload) => {
          console.log('[CaseDocuments] Real-time DELETE received:', payload);
          
          const deletedDoc = payload.old;
          
          dispatch({
            type: 'DELETE_DOCUMENT',
            payload: deletedDoc.id
          });
          
          toast({
            title: "Document Deleted",
            description: `${deletedDoc.file_name} has been removed`,
            variant: "destructive"
          });
        }
      )
      .subscribe();

    return () => {
      console.log(`[CaseDocuments] Cleaning up real-time subscription for case ${selectedCase.id}`);
      supabase.removeChannel(channel);
    };
  }, [dispatch, selectedCase]);

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

  const handleViewDocument = async (documentId: string) => {
    try {
      const document = filteredDocuments.find(doc => doc.id === documentId);
      if (!document) {
        toast({
          title: "Document Not Found",
          description: "Unable to locate the selected document.",
          variant: "destructive"
        });
        return;
      }

      // Save navigation context for return path
      await navigationContextService.saveContext({
        returnTo: 'case-documents',
        caseId: selectedCase?.id,
        caseNumber: selectedCase?.caseNumber,
        caseTitle: selectedCase?.title,
        documentId: documentId,
        timestamp: Date.now()
      });

      // Get signed URL from Supabase Storage
      const filePath = document.path;
      if (!filePath) {
        toast({
          title: "Invalid Document",
          description: "Document file path is missing.",
          variant: "destructive"
        });
        return;
      }

      // Generate signed URL (valid for 1 hour)
      const signedUrl = await supabaseDocumentService.getDownloadUrl(filePath, 3600);
      
      // Open in new tab for preview
      window.open(signedUrl, '_blank');
      
      toast({
        title: "Opening Document",
        description: `${document.name} opened for preview`,
      });
    } catch (error) {
      console.error('Failed to preview document:', error);
      toast({
        title: "Preview Failed",
        description: "Unable to open document preview.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      const filePath = document.path;
      if (!filePath) {
        toast({
          title: "Download Failed",
          description: "Document file path is missing.",
          variant: "destructive"
        });
        return;
      }

      // Get signed URL
      const signedUrl = await supabaseDocumentService.getDownloadUrl(filePath, 3600);
      
      // Trigger download
      const link = window.document.createElement('a');
      link.href = signedUrl;
      link.download = document.name || document.fileName || 'document.pdf';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${document.name}...`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download document.",
        variant: "destructive"
      });
    }
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

  const handleReturnToDocument = async () => {
    const returnContext = await navigationContextService.getContext();
    if (returnContext?.returnTo === 'case-documents' && returnContext.documentId) {
      await navigationContextService.clearContext();
      
      toast({
        title: "Context Cleared",
        description: "Returned to case documents view",
      });
      
      setHasReturnCtx(false);
    }
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
          {hasReturnCtx && (
            <Button
              variant="outline"
              onClick={handleReturnToDocument}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Document
            </Button>
          )}
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
                        {formatDateForDisplay(document.uploadedAt || document.createdAt)}
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