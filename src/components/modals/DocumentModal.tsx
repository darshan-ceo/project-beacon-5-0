import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Document, useAppState } from '@/contexts/AppStateContext';
import { dmsService } from '@/services/dmsService';
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

        if (onUpload) {
          await onUpload(formData.file, {
            folderId: formData.folderId === "none" ? undefined : formData.folderId,
            caseId: formData.caseId === "none" ? undefined : formData.caseId,
            tags: formData.tags
          });
        } else {
          const uploadOptions = {
            folderId: formData.folderId === "none" ? undefined : formData.folderId,
            caseId: formData.caseId === "none" ? undefined : formData.caseId,
            tags: formData.tags,
            existingDocuments: state.documents
          };

          const result = await dmsService.files.upload(currentUserId, formData.file, uploadOptions, dispatch);
          
          if (!result.success && result.duplicate) {
            toast({
              title: "Duplicate File",
              description: "A file with this name already exists.",
              variant: "destructive"
            });
            return;
          }
        }
      } else if (mode === 'edit' && documentData) {
        const updatedDocument: Document = {
          ...documentData,
          name: formData.name,
          caseId: formData.caseId,
          tags: formData.tags,
          isShared: formData.sharedWithClient
        };

        await dmsService.files.updateMetadata(documentData.id, {
          name: formData.name,
          tags: formData.tags
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
      <DialogContent className="max-w-beacon-modal max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {mode === 'upload' && 'Upload Document'}
            {mode === 'edit' && 'Edit Document'}
            {mode === 'view' && 'Document Details'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="overflow-y-auto max-h-[60vh]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'upload' && (
              <>
                {/* Section 1: File Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">File Selection</h3>
                  </div>
                  <div className="space-y-2">
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
                  </div>
                </div>

                {/* Section 2: Document Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Document Details</h3>
                  </div>
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
                </div>

                {/* Section 3: Associations */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Link2 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Associations</h3>
                  </div>
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
                        onValueChange={(value) => setFormData(prev => ({ ...prev, caseId: value }))}
                      >
                        <SelectTrigger id="case">
                          <SelectValue placeholder="Select case (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Case Association</SelectItem>
                          {state.cases.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.caseNumber} - {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Section 4: Tags & Sharing */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Tag className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Tags & Sharing</h3>
                  </div>
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
                </div>
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
                    <Label htmlFor="caseId">Associated Case</Label>
                    <Select 
                      value={formData.caseId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, caseId: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select case (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Case Association</SelectItem>
                        {state.cases.map((case_) => (
                          <SelectItem key={case_.id} value={case_.id}>
                            {case_.caseNumber} - {case_.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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