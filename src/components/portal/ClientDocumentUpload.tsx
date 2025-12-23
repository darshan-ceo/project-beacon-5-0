import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { canPerformAction } from '@/utils/portalPermissions';
import { v4 as uuidv4 } from 'uuid';

interface ClientDocumentUploadProps {
  clientId: string;
  caseId?: string;
  onUploadComplete?: () => void;
}

export const ClientDocumentUpload: React.FC<ClientDocumentUploadProps> = ({
  clientId,
  caseId,
  onUploadComplete
}) => {
  const { portalSession, isAuthenticated } = usePortalAuth();
  const { clientAccess } = useClientPortal();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');

  // Check if user has upload permission (requires portal auth + editor role)
  const canUpload = isAuthenticated && portalSession?.isAuthenticated && 
    canPerformAction(clientAccess?.portalRole, 'canUploadDocuments');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file sizes (10MB max each)
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: `${file.name} exceeds 10MB limit`,
          variant: 'destructive'
        });
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !clientAccess) return;

    // Verify portal session is valid
    if (!portalSession?.userId) {
      toast({
        title: 'Session Expired',
        description: 'Your portal session has expired. Please login again.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Get current portal user from portalSupabase to ensure we have valid auth
      const { data: authData, error: authError } = await portalSupabase.auth.getUser();
      
      if (authError || !authData.user) {
        console.error('Portal auth error:', authError);
        toast({
          title: 'Session Expired',
          description: 'Your portal session has expired. Please login again.',
          variant: 'destructive'
        });
        return;
      }

      const portalUserId = authData.user.id;

      for (const file of selectedFiles) {
        // Generate unique file path - must start with 'client-uploads' for RLS policy
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop() || '';
        // Use uuid library for cross-browser compatibility
        const uniqueId = uuidv4();
        // Path format: client-uploads/{clientId}/{uniqueId}-{timestamp}.{ext}
        const filePath = fileExtension 
          ? `client-uploads/${clientId}/${uniqueId}-${timestamp}.${fileExtension}`
          : `client-uploads/${clientId}/${uniqueId}-${timestamp}`;

        console.log('Portal uploading file to path:', filePath);

        // Upload to Supabase Storage using portal client
        const { data: uploadData, error: uploadError } = await portalSupabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Portal upload error:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        console.log('Portal upload successful:', uploadData);

        // Get file extension for type
        const fileType = file.name.split('.').pop()?.toLowerCase() || 'file';

        // Create document record in database using portal client
        const { error: docError } = await portalSupabase
          .from('documents')
          .insert({
            file_name: file.name,
            file_path: filePath,
            file_type: fileType,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            client_id: clientId,
            case_id: caseId || null,
            tenant_id: clientAccess.tenantId,
            uploaded_by: portalUserId, // Use portal user's auth.uid()
            category: 'Client Upload',
            document_status: 'Pending Review',
            remarks: description || null,
            version: 1,
            is_latest_version: true
          });

        if (docError) {
          console.error('Portal document record error:', docError);
          // Try to clean up the uploaded file
          await portalSupabase.storage.from('documents').remove([filePath]);
          throw new Error(`Failed to save document record: ${docError.message}`);
        }
      }

      toast({
        title: 'Upload Successful',
        description: `${selectedFiles.length} document(s) uploaded successfully. Your legal team will be notified.`,
      });

      setSelectedFiles([]);
      setDescription('');
      onUploadComplete?.();
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload documents. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Show permission message if user can't upload
  if (!canUpload) {
    return (
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>Upload Restricted</span>
          </CardTitle>
          <CardDescription>
            Your current access level does not include document upload permissions. 
            Please contact your legal team if you need to submit documents.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Upload Documents</span>
        </CardTitle>
        <CardDescription>
          Upload documents related to your case. All uploads are securely stored and will be reviewed by your legal team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="file-upload">Select Files</Label>
          <Input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xls,.xlsx"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Accepted formats: PDF, DOC, DOCX, JPG, PNG, TXT, XLS, XLSX (Max 10MB each)
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files ({selectedFiles.length})</Label>
            {selectedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <File className="h-4 w-4" />
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Add a brief description of the documents..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            disabled={uploading}
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : 'Files'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
