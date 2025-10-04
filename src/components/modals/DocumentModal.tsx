import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Document, useAppState } from '@/contexts/AppStateContext';
import { dmsService } from '@/services/dmsService';
import { FieldTooltip } from '@/components/ui/field-tooltip';
import { TagInput } from '@/components/ui/TagInput';
import { useRBAC } from '@/hooks/useAdvancedRBAC';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load folders on component mount
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
      // PHASE 3B: RBAC Security Check
      const { currentUserId } = useRBAC(); // Get actual logged-in user
      
      if (mode === 'upload') {
        if (!formData.file) {
          toast({
            title: "Error",
            description: "Please select a file to upload.",
            variant: "destructive"
          });
          return;
        }
        
        // Validate document upload permission
        const { policyEngine, secureDataAccess } = await import('@/security/policyEngine');
        
        const canUpload = await policyEngine.evaluatePermission(currentUserId, 'documents', 'write');
        if (!canUpload.allowed) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to upload documents.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        // If document is linked to a case, validate case access
        if (formData.caseId && formData.caseId !== 'none') {
          const caseAccess = await secureDataAccess.secureGet(
            currentUserId,
            'cases',
            formData.caseId,
            async (id) => state.cases.find(c => c.id === id) || null
          );
          
          if (!caseAccess) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to upload documents for this case.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
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

          const result = await dmsService.files.upload(currentUserId, formData.file, uploadOptions, dispatch);
          
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
      <DialogContent className="max-w-beacon-modal max-h-[90vh]" data-tour="document-metadata">
        <DialogHeader>
          <DialogTitle>
            {mode === 'upload' && 'Upload Document'}
            {mode === 'edit' && 'Edit Document'}
            {mode === 'view' && 'Document Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" data-tour="upload-form">
          {mode === 'upload' && (
            <div>
              <div className="flex items-center gap-1">
                <Label htmlFor="file">Select File</Label>
                <FieldTooltip formId="upload-document" fieldId="file" />
              </div>
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
            <div className="flex items-center gap-1">
              <Label htmlFor="name">Document Name</Label>
              <FieldTooltip formId="upload-document" fieldId="name" />
            </div>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={mode === 'view'}
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-1">
              <Label htmlFor="folderId">Folder</Label>
              <FieldTooltip formId="upload-document" fieldId="folder" />
            </div>
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
            <div className="flex items-center gap-1">
              <Label htmlFor="caseId">Associated Case</Label>
              <FieldTooltip formId="upload-document" fieldId="case-association" />
            </div>
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
            <div className="flex items-center gap-1">
              <Label>Tags</Label>
              <FieldTooltip formId="upload-document" fieldId="tags" />
            </div>
            <TagInput
              value={formData.tags}
              onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
              placeholder="Add tags to organize documents..."
              disabled={mode === 'view'}
              maxTags={8}
            />
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
        </form>

        <DialogFooter className="gap-3">
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
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Processing..." : (mode === 'upload' ? 'Upload Document' : 'Update Document')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};