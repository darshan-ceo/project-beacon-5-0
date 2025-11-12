import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  X, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  FolderOpen,
  User,
  Briefcase
} from 'lucide-react';
import { useAppState } from '@/contexts/AppStateContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categorizeDocument, cleanFilename, type DocumentCategory } from '@/services/documentCategorizationService';
import { uploadDocumentsBulk, type BulkUploadProgress } from '@/services/supabaseDocumentService';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FileWithCategory {
  file: File;
  category: DocumentCategory;
  confidence: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
}

interface BulkDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCaseId?: string;
  defaultClientId?: string;
  defaultFolderId?: string;
}

export const BulkDocumentUploadModal: React.FC<BulkDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  defaultCaseId,
  defaultClientId,
  defaultFolderId,
}) => {
  const { state, dispatch } = useAppState();
  const [files, setFiles] = useState<FileWithCategory[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tenantId, setTenantId] = useState<string>('');
  
  // Batch settings
  const [batchCaseId, setBatchCaseId] = useState<string>(defaultCaseId || 'none');
  const [batchClientId, setBatchClientId] = useState<string>(defaultClientId || 'none');
  const [batchFolderId, setBatchFolderId] = useState<string>(defaultFolderId || 'none');

  // Fetch tenant ID from profiles table
  const fetchTenantId = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching tenant_id:', profileError);
        return;
      }

      if (profile?.tenant_id) {
        setTenantId(profile.tenant_id);
        console.log('📋 [BulkUploadModal] Tenant ID fetched:', profile.tenant_id);
      }
    } catch (error) {
      console.error('Error in fetchTenantId:', error);
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFiles([]);
      setIsAnalyzing(false);
      setIsUploading(false);
      setUploadProgress(0);
      setBatchCaseId(defaultCaseId || 'none');
      setBatchClientId(defaultClientId || 'none');
      setBatchFolderId(defaultFolderId || 'none');
      fetchTenantId();
    }
  }, [isOpen, defaultCaseId, defaultClientId, defaultFolderId]);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsAnalyzing(true);
    const fileArray = Array.from(selectedFiles);

    // Initialize files with pending status
    const initialFiles: FileWithCategory[] = fileArray.map(file => ({
      file,
      category: 'Miscellaneous' as DocumentCategory,
      confidence: 0,
      status: 'pending' as const,
      progress: 0,
    }));

    setFiles(initialFiles);

    // Categorize files in parallel
    try {
      const categorizedFiles = await Promise.all(
        fileArray.map(async (file, index) => {
          const result = await categorizeDocument(file.name);
          return {
            file,
            category: result.category,
            confidence: result.confidence,
            status: 'pending' as const,
            progress: 0,
          };
        })
      );

      setFiles(categorizedFiles);
    } catch (error) {
      console.error('Categorization error:', error);
      toast({
        title: "Categorization Warning",
        description: "Some files couldn't be auto-categorized. Please review manually.",
        variant: "default",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleCategoryChange = (index: number, category: DocumentCategory) => {
    setFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], category, confidence: 1.0 };
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    // Validate tenant ID
    if (!tenantId) {
      toast({
        title: "Unable to Upload",
        description: "Unable to determine tenant context. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate at least one association
    if (batchCaseId === 'none' && batchClientId === 'none' && batchFolderId === 'none') {
      toast({
        title: "Missing Association",
        description: "Please select at least one: Case, Client, or Folder",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const metadata = {
      tenant_id: tenantId,
      case_id: batchCaseId !== 'none' ? batchCaseId : undefined,
      client_id: batchClientId !== 'none' ? batchClientId : undefined,
      folder_id: batchFolderId !== 'none' ? batchFolderId : undefined,
    };

    const filesWithMetadata = files.map(f => ({
      file: f.file,
      metadata: {
        ...metadata,
        category: f.category,
      },
    }));

    try {
      const results = await uploadDocumentsBulk(
        filesWithMetadata,
        (progress: BulkUploadProgress) => {
          setUploadProgress((progress.completed / progress.total) * 100);
          
          // Update individual file statuses
          setFiles(prev => {
            const updated = [...prev];
            progress.results.forEach((result, index) => {
              if (updated[index]) {
                if (result.success) {
                  updated[index].status = 'success';
                } else if (result.error) {
                  updated[index].status = 'error';
                  updated[index].error = result.error;
                }
              }
            });
            return updated;
          });
        }
      );

      // Dispatch successful uploads to state
      results.forEach((result, index) => {
        if (result.success && result.document) {
          dispatch({
            type: 'ADD_DOCUMENT',
            payload: {
              id: result.document.id,
              fileName: result.document.file_name,
              fileType: result.document.file_type,
              fileSize: result.document.file_size,
              filePath: result.document.file_path,
              mimeType: result.document.mime_type,
              storageUrl: result.document.storage_url,
              caseId: batchCaseId !== 'none' ? batchCaseId : '',
              clientId: batchClientId !== 'none' ? batchClientId : '',
              folderId: batchFolderId !== 'none' ? batchFolderId : undefined,
              uploadedBy: state.userProfile?.id || '',
              uploadTimestamp: new Date().toISOString(),
              tags: [],
              isShared: false,
              category: files[index].category,
            },
          });
        }
      });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      toast({
        title: "Upload Complete",
        description: `${successCount} files uploaded successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount === files.length) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: FileWithCategory['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryBadgeClass = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-500/10 text-green-700 border-green-500/20';
    if (confidence >= 0.5) return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    return 'bg-red-500/10 text-red-700 border-red-500/20';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Document Upload</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* File Selection Area */}
          {files.length === 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/5"
            >
              <input
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                id="bulk-file-input"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
              />
              <label htmlFor="bulk-file-input" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  Supports: PDF, DOC, DOCX, JPG, PNG, XLSX • Max 20 files
                </p>
              </label>
            </div>
          )}

          {/* Batch Settings */}
          {files.length > 0 && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Apply these settings to all {files.length} files. Select at least one: Case, Client, or Folder.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Case (Optional)
                  </Label>
                  <Select value={batchCaseId} onValueChange={setBatchCaseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {state.cases.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.caseNumber} - {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client (Optional)
                  </Label>
                  <Select value={batchClientId} onValueChange={setBatchClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {state.clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Folder (Optional)
                  </Label>
                  <Select value={batchFolderId} onValueChange={setBatchFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {state.folders.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-2">
                {files.map((fileItem, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border bg-card",
                      fileItem.status === 'error' && "border-destructive"
                    )}
                  >
                    {getStatusIcon(fileItem.status)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {cleanFilename(fileItem.file.name)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(fileItem.file.size / 1024).toFixed(1)} KB
                      </p>
                      {fileItem.error && (
                        <p className="text-xs text-destructive mt-1">{fileItem.error}</p>
                      )}
                    </div>

                    <Select
                      value={fileItem.category}
                      onValueChange={(value) => handleCategoryChange(index, value as DocumentCategory)}
                      disabled={isUploading || fileItem.status === 'success'}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Notice">Notice</SelectItem>
                        <SelectItem value="Reply">Reply</SelectItem>
                        <SelectItem value="Adjournment">Adjournment</SelectItem>
                        <SelectItem value="Order">Order</SelectItem>
                        <SelectItem value="Submission">Submission</SelectItem>
                        <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                      </SelectContent>
                    </Select>

                    <Badge variant="outline" className={getCategoryBadgeClass(fileItem.confidence)}>
                      {Math.round(fileItem.confidence * 100)}%
                    </Badge>

                    {!isUploading && fileItem.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading files...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {files.length > 0 && `${files.length} file${files.length > 1 ? 's' : ''} selected`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || isUploading || isAnalyzing}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {files.length} Files
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
