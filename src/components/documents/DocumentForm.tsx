import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Document, useAppState } from '@/contexts/AppStateContext';
import { Upload, FileText, Link2, Tag } from 'lucide-react';
import { TagInput } from '@/components/ui/TagInput';
import { secureLog } from '@/utils/secureLogger';

export interface DocumentFormData {
  name: string;
  type: string;
  clientId: string;
  caseId: string;
  folderId: string;
  category: string;
  tags: string[];
  sharedWithClient: boolean;
  file: File | null;
}

export interface DocumentFormProps {
  formData: DocumentFormData;
  setFormData: React.Dispatch<React.SetStateAction<DocumentFormData>>;
  mode: 'upload' | 'view' | 'edit';
  documentData?: Document | null;
  localClients: any[];
}

export const DocumentForm: React.FC<DocumentFormProps> = ({
  formData,
  setFormData,
  mode,
  documentData,
  localClients,
}) => {
  const { state } = useAppState();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Compute whether document has at least one required link
  const hasLink = !!(
    (formData.caseId && formData.caseId !== 'none') ||
    (formData.clientId && formData.clientId !== 'none') ||
    (formData.folderId && formData.folderId !== 'none')
  );

  if (mode === 'view' && documentData) {
    return (
      <div className="space-y-6">
        <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
          <CardHeader className="border-b border-border p-6 pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>File Name</Label>
                <p className="text-sm mt-1">{documentData.name}</p>
              </div>
              <div>
                <Label>Type</Label>
                <p className="text-sm mt-1">{documentData.type?.toUpperCase()}</p>
              </div>
              <div>
                <Label>Size</Label>
                <p className="text-sm mt-1">{formatFileSize(documentData.size)}</p>
              </div>
              <div>
                <Label>Uploaded</Label>
                <p className="text-sm mt-1">{new Date(documentData.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>
            {documentData.tags && documentData.tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {documentData.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                    onValueChange={(value) => {
                      secureLog.debug('Folder selected', { folderId: value });
                      setFormData(prev => ({ ...prev, folderId: value }));
                    }}
                  >
                    <SelectTrigger id="folder">
                      <SelectValue placeholder="Select folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No folder</SelectItem>
                      {state.folders && state.folders.length > 0 ? (
                        state.folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          No folders available
                        </div>
                      )}
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
              {/* Association notice with dynamic warning */}
              <div className={`rounded-lg border p-4 ${
                formData.caseId === 'none' && formData.clientId === 'none' && formData.folderId === 'none'
                  ? 'border-destructive bg-destructive/10'
                  : 'border-border bg-muted/50'
              }`}>
                <div className="flex gap-2">
                  <FileText className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    formData.caseId === 'none' && formData.clientId === 'none' && formData.folderId === 'none'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }`} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Document Association</p>
                    <p className="text-xs text-muted-foreground">
                      Documents must be linked to at least one: Case, Client, or Folder.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    disabled={formData.caseId !== 'none' && formData.caseId !== undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Client Association</SelectItem>
                      {localClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name || client.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Label>Tags</Label>
                <TagInput
                  value={formData.tags}
                  onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                  placeholder="Add tags to organize documents..."
                  maxTags={8}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isShared"
                  checked={formData.sharedWithClient}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sharedWithClient: checked }))}
                />
                <Label htmlFor="isShared">Share with client</Label>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {mode === 'edit' && (
        <>
          {/* Edit mode - Document Details */}
          <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
            <CardHeader className="border-b border-border p-6 pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div>
                <Label htmlFor="name">Document Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Associations */}
          <Card className="rounded-beacon-lg border bg-card shadow-beacon-md">
            <CardHeader className="border-b border-border p-6 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Associations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Associated Client</Label>
                  <Select 
                    value={formData.clientId || 'none'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Client Association</SelectItem>
                      {localClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name || client.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="caseId">Associated Case</Label>
                  <Select 
                    value={formData.caseId || 'none'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, caseId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select case" />
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
                  maxTags={8}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isShared"
                  checked={formData.sharedWithClient}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sharedWithClient: checked }))}
                />
                <Label htmlFor="isShared">Share with client</Label>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
