import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { canPerformAction } from '@/utils/portalPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Search,
  Calendar,
  User,
  Eye,
  FolderOpen,
  Loader2,
  Filter
} from 'lucide-react';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  storage_url: string | null;
  case_id: string | null;
  client_id: string | null;
  uploaded_by: string;
  upload_timestamp: string;
  category: string | null;
  document_status: string | null;
  remarks: string | null;
}

interface Case {
  id: string;
  case_number: string;
  title: string;
}

interface ClientDocumentLibraryProps {
  clientId: string;
  cases?: Case[];
  initialCaseId?: string | null;
}

export const ClientDocumentLibrary: React.FC<ClientDocumentLibraryProps> = ({ 
  clientId,
  cases = [],
  initialCaseId
}) => {
  const { portalSession, isAuthenticated } = usePortalAuth();
  const { clientAccess } = useClientPortal();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId || 'all');

  useEffect(() => {
    if (initialCaseId) {
      setSelectedCaseId(initialCaseId);
    }
  }, [initialCaseId]);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Check download permission (requires portal auth + appropriate role)
  const canDownload = isAuthenticated && portalSession?.isAuthenticated && 
    canPerformAction(clientAccess?.portalRole, 'canDownloadDocuments');

  const fetchDocuments = useCallback(async () => {
    if (!isAuthenticated || !clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get all case IDs for this client to also fetch case-linked documents
      const clientCaseIds: string[] = cases.map(c => c.id);
      
      console.log('[PortalDocs] Fetching documents for client:', clientId);
      console.log('[PortalDocs] Client case IDs:', clientCaseIds);
      
      // Strategy: Fetch documents that are either:
      // 1. Directly tagged to this client (client_id = clientId), OR
      // 2. Linked to one of the client's cases (case_id IN clientCaseIds)
      // This ensures documents uploaded to cases (without explicit client_id) are visible
      
      let allDocs: Document[] = [];
      
      // Query 1: Documents directly tagged to client
      const { data: clientDocs, error: clientDocsError } = await portalSupabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .order('upload_timestamp', { ascending: false });
      
      if (clientDocsError) {
        console.error('[PortalDocs] Error fetching client-tagged docs:', clientDocsError);
      } else {
        console.log('[PortalDocs] Client-tagged documents:', clientDocs?.length || 0);
        allDocs = [...(clientDocs || [])];
      }
      
      // Query 2: Documents linked to client's cases (if case IDs available)
      if (clientCaseIds.length > 0) {
        const { data: caseDocs, error: caseDocsError } = await portalSupabase
          .from('documents')
          .select('*')
          .in('case_id', clientCaseIds)
          .order('upload_timestamp', { ascending: false });
        
        if (caseDocsError) {
          console.error('[PortalDocs] Error fetching case-linked docs:', caseDocsError);
        } else {
          console.log('[PortalDocs] Case-linked documents:', caseDocs?.length || 0);
          // Merge and dedupe
          const existingIds = new Set(allDocs.map(d => d.id));
          for (const doc of (caseDocs || [])) {
            if (!existingIds.has(doc.id)) {
              allDocs.push(doc);
              existingIds.add(doc.id);
            }
          }
        }
      }
      
      // Apply case filter if specific case selected
      let filteredDocs = allDocs;
      if (selectedCaseId !== 'all') {
        filteredDocs = allDocs.filter(d => d.case_id === selectedCaseId);
      }
      
      // Sort by upload timestamp descending
      filteredDocs.sort((a, b) => 
        new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime()
      );
      
      console.log('[PortalDocs] Total documents after merge:', filteredDocs.length);
      setDocuments(filteredDocs);
    } catch (error) {
      console.error('Portal error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedCaseId, isAuthenticated, cases]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filter documents based on search and type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.category?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || 
                         doc.file_type?.toLowerCase() === selectedFilter.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  // Group documents by category
  const documentsByCategory = filteredDocuments.reduce((acc, doc) => {
    const category = doc.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const handleDownload = async (document: Document) => {
    if (!canDownload) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to download documents',
        variant: 'destructive'
      });
      return;
    }

    try {
      setDownloading(document.id);
      
      let downloadError: Error | null = null;
      let blob: Blob | null = null;

      console.log('Portal attempting download:', document.file_path);

      // First attempt: direct download using portal client
      const { data, error } = await portalSupabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) {
        console.log('Portal direct download failed:', error.message);
        
        // Second attempt: create signed URL via portal client
        const { data: signedData, error: signedError } = await portalSupabase.storage
          .from('documents')
          .createSignedUrl(document.file_path, 3600);
        
        if (signedError) {
          console.log('Portal signed URL creation failed:', signedError.message);
          downloadError = signedError;
        } else if (signedData?.signedUrl) {
          try {
            const response = await fetch(signedData.signedUrl);
            if (response.ok) {
              blob = await response.blob();
            } else {
              downloadError = new Error(`Failed to fetch: ${response.status}`);
            }
          } catch (fetchError) {
            downloadError = fetchError as Error;
          }
        }

        // Third attempt: try storage_url if available
        if (!blob && document.storage_url) {
          try {
            const response = await fetch(document.storage_url);
            if (response.ok) {
              blob = await response.blob();
            }
          } catch (e) {
            console.log('Storage URL fetch failed:', e);
          }
        }
      } else {
        blob = data;
      }

      if (!blob) {
        const errorMessage = downloadError?.message || 'Unable to download file';
        console.error('Portal download failed:', errorMessage);
        throw new Error(errorMessage);
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `Downloading ${document.file_name}...`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Unable to download the document. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = (document: Document) => {
    toast({
      title: 'Document Preview',
      description: `${document.file_name} - ${formatFileSize(document.file_size)}`,
    });
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

  const getStatusBadge = (status: string | null) => {
    const statusColors: Record<string, string> = {
      'Approved': 'bg-success/10 text-success',
      'Pending Review': 'bg-warning/10 text-warning',
      'Rejected': 'bg-destructive/10 text-destructive',
    };
    
    return (
      <Badge variant="outline" className={statusColors[status || ''] || ''}>
        {status || 'Unknown'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Document Library</h2>
          <p className="text-muted-foreground">
            {documents.length} documents available
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDocuments}>
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
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
        
        {cases.length > 0 && (
          <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by case" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cases</SelectItem>
              {cases.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.case_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <Select value={selectedFilter} onValueChange={setSelectedFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="doc">DOC</SelectItem>
            <SelectItem value="docx">DOCX</SelectItem>
            <SelectItem value="jpg">Images</SelectItem>
            <SelectItem value="xlsx">Excel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents Content */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm || selectedFilter !== 'all' || selectedCaseId !== 'all' 
                ? 'No Documents Found' 
                : 'No Documents Yet'}
            </h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || selectedFilter !== 'all' || selectedCaseId !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Documents shared with you will appear here.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(documentsByCategory).map(([category, docs]) => (
            <motion.div 
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getFileTypeIcon(category)}
                    <span>{category}</span>
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
                          {getFileTypeIcon(doc.file_type)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {doc.file_name}
                            </h4>
                            <div className="flex items-center flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(doc.upload_timestamp).toLocaleDateString()}
                              </span>
                              {doc.document_status && getStatusBadge(doc.document_status)}
                            </div>
                            {doc.remarks && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {doc.remarks}
                              </p>
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
                          {canDownload && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownload(doc)}
                              disabled={downloading === doc.id}
                            >
                              {downloading === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          )}
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
          <CardTitle className="text-base">Document Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Documents are organized by category and status</p>
          <p>• "Pending Review" documents are being reviewed by your legal team</p>
          <p>• "Approved" documents have been verified and processed</p>
          <p>• Contact your legal team if you need additional documents</p>
        </CardContent>
      </Card>
    </div>
  );
};
