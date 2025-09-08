import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Document, useAppState } from '@/contexts/AppStateContext';
import { dmsService } from '@/services/dmsService';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: Document | null;
  mode: 'upload' | 'view' | 'edit';
  selectedFolderId?: string;
  onUpload?: (file: File, options: any) => Promise<void>;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ 
  isOpen, 
  onClose, 
  document: documentData, 
  mode, 
  selectedFolderId,
  onUpload 
}) => {
  const { state, dispatch } = useAppState();
  const [formData, setFormData] = useState({
    name: '',
    type: 'pdf',
    caseId: 'none',
    folderId: selectedFolderId || 'none',
    tags: [] as string[],
    isShared: false,
    file: null as File | null
  });
  const [newTag, setNewTag] = useState('');
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load folders on component mount
    const loadFolders = async () => {
      try {
        const folderList = await dmsService.folders.list();
        setFolders(folderList);
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
        isShared: documentData.isShared,
        file: null
      });
    } else if (mode === 'upload') {
      setFormData({
        name: '',
        type: 'pdf',
        caseId: 'none',
        folderId: selectedFolderId || 'none',
        tags: [],
        isShared: false,
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
          // Use the parent component's upload handler
          await onUpload(formData.file, {
            folderId: formData.folderId === "none" ? undefined : formData.folderId,
            caseId: formData.caseId === "none" ? undefined : formData.caseId,
            tags: formData.tags
          });
        } else {
          // Fallback to direct upload
          const uploadOptions = {
            folderId: formData.folderId === "none" ? undefined : formData.folderId,
            caseId: formData.caseId === "none" ? undefined : formData.caseId,
            tags: formData.tags,
            existingDocuments: state.documents
          };

          const result = await dmsService.files.upload(formData.file, uploadOptions, dispatch);
          
          if (!result.success && result.duplicate) {
            // Handle duplicates through parent component
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
          isShared: formData.isShared
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
      <DialogContent className="max-w-2xl" data-tour="document-metadata">
        <DialogHeader>
          <DialogTitle>
            {mode === 'upload' && 'Upload Document'}
            {mode === 'edit' && 'Edit Document'}
            {mode === 'view' && 'Document Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'upload' && (
            <div>
              <Label htmlFor="file">Select File</Label>
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
          )}

          {mode === 'view' && documentData && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
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
            <Label htmlFor="name">Document Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={mode === 'view'}
              required
            />
          </div>

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
                {folders.map((folder) => (
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
              data-tour="case-selector-dms"
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

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                disabled={mode === 'view'}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              {mode !== 'view' && (
                <Button type="button" onClick={handleAddTag} size="sm">
                  Add Tag
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                  {mode !== 'view' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isShared"
              checked={formData.isShared}
              onChange={(e) => setFormData(prev => ({ ...prev, isShared: e.target.checked }))}
              disabled={mode === 'view'}
            />
            <Label htmlFor="isShared">Share with client</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode === 'view' && (
              <Button 
                type="button"
                onClick={() => {
                  // In a real app, this would download the file
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
              <Button type="submit" disabled={loading}>
                {loading ? "Processing..." : (mode === 'upload' ? 'Upload Document' : 'Update Document')}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};