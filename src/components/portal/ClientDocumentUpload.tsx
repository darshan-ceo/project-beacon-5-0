import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { canPerformAction } from '@/utils/portalPermissions';

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
  const { user } = useAuth();
  const { clientAccess } = useClientPortal();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');

  // Check if user has upload permission
  const canUpload = canPerformAction(clientAccess?.portalRole, 'canUploadDocuments');

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
    if (selectedFiles.length === 0 || !user || !clientAccess) return;

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        // Generate unique file path
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `client-uploads/${clientId}/${timestamp}-${sanitizedName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Get file extension for type
        const fileType = file.name.split('.').pop()?.toLowerCase() || 'file';

        // Create document record in database
        const { error: docError } = await supabase
          .from('documents')
          .insert({
            file_name: file.name,
            file_path: filePath,
            file_type: fileType,
            file_size: file.size,
            mime_type: file.type,
            client_id: clientId,
            case_id: caseId || null,
            tenant_id: clientAccess.tenantId,
            uploaded_by: user.id,
            category: 'Client Upload',
            document_status: 'Pending Review',
            remarks: description || null
          });

        if (docError) {
          console.error('Document record error:', docError);
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
