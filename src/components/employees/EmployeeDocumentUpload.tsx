import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Label } from '@/components/ui/label';
import { Download, Trash2, FileText, FileImage, File } from 'lucide-react';
import { employeeDocumentService, EmployeeDocumentCategory } from '@/services/employeeDocumentService';
import { useAppState } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EmployeeDocumentUploadProps {
  label: string;
  category: EmployeeDocumentCategory;
  employeeCode: string;
  existingDocumentId?: string;
  onUploadComplete: (documentId: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export const EmployeeDocumentUpload = ({
  label,
  category,
  employeeCode,
  existingDocumentId,
  onUploadComplete,
  onDelete,
  disabled = false
}: EmployeeDocumentUploadProps) => {
  const { state, dispatch } = useAppState();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [existingDocument, setExistingDocument] = useState<any>(null);

  // Load existing document details
  useState(() => {
    if (existingDocumentId) {
      employeeDocumentService.getDocument(existingDocumentId).then(doc => {
        setExistingDocument(doc);
      });
    }
  });

  const config = employeeDocumentService.getUploadConfig(category);

  const handleFileSelect = async (file: File) => {
    if (!employeeCode) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const documentId = await employeeDocumentService.uploadDocument(
        employeeCode,
        category,
        file,
        dispatch
      );

      setUploadProgress(100);
      clearInterval(progressInterval);
      
      // Load the new document details
      const doc = await employeeDocumentService.getDocument(documentId);
      setExistingDocument(doc);
      
      onUploadComplete(documentId);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!existingDocumentId) return;

    try {
      await employeeDocumentService.deleteDocument(existingDocumentId, category, dispatch);
      setExistingDocument(null);
      onDelete();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleDownload = async () => {
    if (!existingDocumentId) return;
    await employeeDocumentService.downloadDocument(existingDocumentId);
  };

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <File className="h-4 w-4" />;
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) {
      return <FileImage className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {!employeeCode ? (
        <div className="p-4 border border-dashed rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground text-center">
            Save employee first to upload documents
          </p>
        </div>
      ) : existingDocument ? (
        <div className="p-4 border rounded-lg bg-background space-y-3">
          <div className="flex items-center gap-2">
            {getFileIcon(existingDocument.name)}
            <span className="text-sm font-medium flex-1 truncate">
              {existingDocument.name}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1"
              disabled={disabled}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={disabled}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <FileDropzone
          onFileSelect={handleFileSelect}
          onError={(error) => {
            console.error('File validation error:', error);
            toast({
              title: 'Invalid file',
              description: error,
              variant: 'destructive'
            });
          }}
          accept={config.acceptedTypes.join(',')}
          acceptLabel={config.acceptedTypes.map(t => t.replace('.', '').toUpperCase()).join(', ')}
          maxSizeMB={config.maxSize}
          disabled={disabled || uploading}
          progress={uploading ? uploadProgress : undefined}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Accepted: {config.acceptedTypes.join(', ')} • Max {config.maxSize}MB
      </p>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
