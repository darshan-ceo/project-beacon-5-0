import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Document, useAppState } from '@/contexts/AppStateContext';
import { dmsService } from '@/services/dmsService';
import { supabaseDocumentService } from '@/services/supabaseDocumentService';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Link2, Tag } from 'lucide-react';
import { TagInput } from '@/components/ui/TagInput';
import { useRBAC } from '@/hooks/useAdvancedRBAC';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: Document | null;
  mode: 'upload' | 'view' | 'edit';
  selectedFolderId?: string;
  onUpload?: (file: File, options: any) => Promise<void>;
  contextCaseId?: string;
  contextClientId?: string;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ 
  isOpen, 
  onClose, 
  document: documentData, 
  mode, 
  selectedFolderId,
  onUpload,
  contextCaseId,
  contextClientId
}) => {
  const { state, dispatch } = useAppState();
  const { currentUserId, enforcementEnabled } = useRBAC();
  const [formData, setFormData] = useState({
    name: '',
    type: 'pdf',
    clientId: 'none',
    caseId: 'none',
    folderId: selectedFolderId || 'none',
    tags: [] as string[],
    sharedWithClient: false,
    file: null as File | null
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const folderList = await dmsService.folders.listAll();
        dispatch({ type: 'SET_FOLDERS', payload: folderList });
      } catch (error) {
        console.error('Failed to load folders:', error);
      }
    };
    
    if (isOpen) {
      loadFolders();
    }

    if (documentData && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: documentData.name,
        type: documentData.type,
        clientId: documentData.clientId || 'none',
        caseId: documentData.caseId || 'none',
        folderId: (documentData as any).folderId || 'none',
        tags: documentData.tags,
        sharedWithClient: documentData.isShared,
        file: null
      });
    } else if (mode === 'upload') {
      setFormData({
        name: '',
        type: 'pdf',
        clientId: contextClientId || 'none',
        caseId: contextCaseId || 'none',
        folderId: selectedFolderId || 'none',
        tags: [],
        sharedWithClient: false,
        file: null
      });
    }
  }, [documentData, mode, isOpen, selectedFolderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === 'upload') {
        if (!formData.file) {
          toast({
            title: "Error",
            description: "Please select a file to upload.",
            variant: "destructive"
          });
          return;
        }

        // Validate at least one entity link
        const hasLink = !!(
          (formData.caseId && formData.caseId !== 'none') ||
          (formData.clientId && formData.clientId !== 'none') ||
          (formData.folderId && formData.folderId !== 'none')
        );

        if (!hasLink) {
          toast({
            title: "Missing Link",
            description: "Please link this document to a Case, Client, or Folder before uploading.",
            variant: "destructive"
          });
          return;
        }

        if (onUpload) {
          await onUpload(formData.file, {
            folderId: formData.folderId === "none" ? undefined : formData.folderId,
            clientId: formData.clientId === "none" ? undefined : formData.clientId,
            caseId: formData.caseId === "none" ? undefined : formData.caseId,
            tags: formData.tags
          });
        } else {
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

          // Upload using Supabase Document Service
          const uploadResult = await supabaseDocumentService.uploadDocument(
            formData.file,
            {
              tenant_id: profile.tenant_id,
              case_id: formData.caseId === 'none' ? undefined : formData.caseId,
              client_id: formData.clientId === 'none' ? undefined : formData.clientId,
              folder_id: formData.folderId === 'none' ? undefined : formData.folderId,
              category: 'general'
            }
          );

          // Dispatch to update UI state
          dispatch({
            type: 'ADD_DOCUMENT',
            payload: {
              id: uploadResult.id,
              name: uploadResult.file_name,
              type: uploadResult.file_type,
              size: uploadResult.file_size,
              clientId: formData.clientId === 'none' ? undefined : formData.clientId,
              caseId: formData.caseId === 'none' ? undefined : formData.caseId,
              uploadedAt: new Date().toISOString(),
              uploadedById: user.id,
              uploadedByName: profile.full_name || 'Unknown',
              tags: formData.tags || [],
              isShared: formData.sharedWithClient,
              path: uploadResult.file_path
            }
          });

          toast({
            title: "Upload Successful",
            description: `${uploadResult.file_name} has been uploaded successfully.`,
          });
        }
      } else if (mode === 'edit' && documentData) {
        await dmsService.files.updateMetadata(documentData.id, {
          name: formData.name,
          tags: formData.tags,
          clientId: formData.clientId === 'none' ? undefined : formData.clientId,
          caseId: formData.caseId === 'none' ? undefined : formData.caseId,
          folderId: formData.folderId === 'none' ? undefined : formData.folderId
        }, dispatch);
      }

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        file,
        name: prev.name || file.name,
        type: file.type.split('/')[1] || 'unknown'
      }));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh] overflow-hidden border bg-background shadow-beacon-lg rounded-beacon-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {mode === 'upload' && 'Upload Document'}
            {mode === 'edit' && 'Edit Document'}
            {mode === 'view' && 'Document Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="px-6 py-4 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'upload' && (
              <>
                {/* Section 1: File Selection */}
                <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
                  <CardHeader className="border-b border-border p-6 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      File Selection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <p className="text-sm text-muted-foreground">
                      Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Maximum size: 50MB
                    </p>
                    <div>
                      <Label htmlFor="file">Select File <span className="text-destructive">*</span></Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        required
                      />
                      {formData.file && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {formData.file.name} ({formatFileSize(formData.file.size)})
                        </p>
                        )}
                      </div>
                  </CardContent>
                </Card>

                {/* Section 2: Document Details */}
                <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
                  <CardHeader className="border-b border-border p-6 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Document Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., GST Return - March 2024"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="folder">Folder</Label>
                      <Select
                        value={formData.folderId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, folderId: value }))}
                      >
                        <SelectTrigger id="folder">
                          <SelectValue placeholder="Select folder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No folder</SelectItem>
                          {state.folders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section 3: Associations */}
                <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
                  <CardHeader className="border-b border-border p-6 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Associations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                  
                  {/* Client Association */}
                  <div>
                    <Label htmlFor="client">Associate with Client</Label>
                    {contextClientId ? (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Badge variant="outline">
                          {state.clients.find(c => c.id === contextClientId)?.name || 'Unknown Client'}
                        </Badge>
                      </div>
                    ) : (
                      <Select
                        value={formData.clientId || 'none'}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, clientId: value }));
                          // If case is selected and doesn't match new client, clear it
                          if (formData.caseId !== 'none') {
                            const selectedCase = state.cases.find(c => c.id === formData.caseId);
                            if (selectedCase && selectedCase.clientId !== value) {
                              setFormData(prev => ({ ...prev, caseId: 'none' }));
                            }
                          }
                        }}
                        disabled={formData.caseId !== 'none' && formData.caseId !== undefined}
                      >
                        <SelectTrigger id="client">
                          <SelectValue placeholder="Select client (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Client Association</SelectItem>
                          {state.clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Case Association */}
                  <div>
                    <Label htmlFor="case">Associate with Case</Label>
                    {contextCaseId ? (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Badge variant="outline">
                          {state.cases.find(c => c.id === contextCaseId)?.caseNumber || 'Unknown Case'} - {state.cases.find(c => c.id === contextCaseId)?.title}
                        </Badge>
                      </div>
                    ) : (
                      <Select
                        value={formData.caseId || 'none'}
                        onValueChange={(value) => {
                          setFormData(prev => ({ ...prev, caseId: value }));
                          // Auto-populate client from case
                          if (value !== 'none') {
                            const selectedCase = state.cases.find(c => c.id === value);
                            if (selectedCase?.clientId) {
                              setFormData(prev => ({ ...prev, clientId: selectedCase.clientId }));
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="case">
                          <SelectValue placeholder="Select case (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Case Association</SelectItem>
                          {state.cases
                            .filter(c => formData.clientId === 'none' || c.clientId === formData.clientId)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.caseNumber} - {c.title}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4: Tags & Sharing */}
                <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
                  <CardHeader className="border-b border-border p-6 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Tags & Sharing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          id="tags"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                        />
                        <Button type="button" variant="outline" onClick={handleAddTag}>
                          Add
                        </Button>
                      </div>
                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                              {tag} ×
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="share"
                        checked={formData.sharedWithClient}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sharedWithClient: checked }))}
                      />
                      <Label htmlFor="share">Share with client</Label>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Edit and View modes */}
            {mode !== 'upload' && (
              <>
                {mode === 'view' && documentData && (
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">File Size:</span> {formatFileSize(documentData.size)}
                      </div>
                      <div>
                        <span className="font-medium">Uploaded By:</span> {documentData.uploadedByName}
                      </div>
                      <div>
                        <span className="font-medium">Upload Date:</span> {new Date(documentData.uploadedAt).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">File Path:</span> {documentData.path}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="name">Document Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={mode === 'view'}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="folderId">Folder</Label>
                    <Select 
                      value={formData.folderId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, folderId: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {state.folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="clientId">Associated Client</Label>
                    <Select 
                      value={formData.clientId || 'none'} 
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, clientId: value }));
                        // If case is selected and doesn't match new client, clear it
                        if (formData.caseId !== 'none') {
                          const selectedCase = state.cases.find(c => c.id === formData.caseId);
                          if (selectedCase && selectedCase.clientId !== value) {
                            setFormData(prev => ({ ...prev, caseId: 'none' }));
                          }
                        }
                      }}
                      disabled={mode === 'view' || (formData.caseId !== 'none' && formData.caseId !== undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Client Association</SelectItem>
                        {state.clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="caseId">Associated Case</Label>
                  <Select 
                    value={formData.caseId || 'none'} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, caseId: value }));
                      // Auto-populate client from case
                      if (value !== 'none') {
                        const selectedCase = state.cases.find(c => c.id === value);
                        if (selectedCase?.clientId) {
                          setFormData(prev => ({ ...prev, clientId: selectedCase.clientId }));
                        }
                      }
                    }}
                    disabled={mode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select case (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Case Association</SelectItem>
                      {state.cases
                        .filter(c => formData.clientId === 'none' || c.clientId === formData.clientId)
                        .map((case_) => (
                          <SelectItem key={case_.id} value={case_.id}>
                            {case_.caseNumber} - {case_.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tags</Label>
                  <TagInput
                    value={formData.tags}
                    onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                    placeholder="Add tags to organize documents..."
                    disabled={mode === 'view'}
                    maxTags={8}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isShared"
                    checked={formData.sharedWithClient}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sharedWithClient: checked }))}
                    disabled={mode === 'view'}
                  />
                  <Label htmlFor="isShared">Share with client</Label>
                </div>
              </>
            )}
          </form>
        </DialogBody>

        <DialogFooter className="gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {mode === 'view' && (
            <Button 
              type="button"
              onClick={() => {
                toast({
                  title: "Download Started",
                  description: `Downloading ${documentData?.name}...`,
                });
              }}
            >
              Download
            </Button>
          )}
          {mode !== 'view' && (
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Processing..." : (mode === 'upload' ? 'Upload Document' : 'Update Document')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};