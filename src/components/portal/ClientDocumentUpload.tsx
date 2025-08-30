import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppState } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';

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
  const { dispatch } = useAppState();
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);

    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add documents to state
      selectedFiles.forEach(file => {
        const newDocument = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.name.split('.').pop() || 'file',
          size: file.size,
          caseId: caseId || `case-${clientId}-1`, // Default case for client
          clientId,
          uploadedById: `client-${clientId}`,
          uploadedByName: 'Client Upload',
          uploadedAt: new Date().toISOString(),
          tags: ['client-upload'],
          isShared: false,
          path: `/documents/client-uploads/${file.name}`
        };

        dispatch({
          type: 'ADD_DOCUMENT',
          payload: newDocument
        });
      });

      toast({
        title: "Upload Successful",
        description: `${selectedFiles.length} document(s) uploaded successfully`,
      });

      setSelectedFiles([]);
      setDescription('');
      onUploadComplete?.();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Upload Documents</span>
        </CardTitle>
        <CardDescription>
          Upload documents related to your case. All uploads are securely stored.
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
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Accepted formats: PDF, DOC, DOCX, JPG, PNG, TXT (Max 10MB each)
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files</Label>
            {selectedFiles.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <File className="h-4 w-4" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
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
              Upload {selectedFiles.length} File(s)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};