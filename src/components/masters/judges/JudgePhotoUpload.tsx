import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Upload, X } from 'lucide-react';
import { judgePhotoService } from '@/services/judgePhotoService';
import { toast } from '@/hooks/use-toast';

interface JudgePhotoUploadProps {
  photoUrl?: string;
  onPhotoChange: (url: string | null) => void;
  disabled?: boolean;
  judgeName?: string;
  judgeId?: string;
}

export const JudgePhotoUpload: React.FC<JudgePhotoUploadProps> = ({
  photoUrl,
  onPhotoChange,
  disabled = false,
  judgeName = '',
  judgeId
}) => {
  const [showDropzone, setShowDropzone] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const getInitials = (name: string): string => {
    if (!name) return 'JD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleUploadClick = () => {
    setShowDropzone(true);
  };

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate a temporary ID if not provided
      const tempId = judgeId || `temp_${Date.now()}`;
      
      const dataUrl = await judgePhotoService.uploadJudgePhoto(
        file,
        tempId,
        (progress) => setUploadProgress(progress)
      );

      onPhotoChange(dataUrl);
      
      toast({
        title: 'Photo Uploaded',
        description: 'Judge photo has been uploaded successfully.',
      });

      setShowDropzone(false);
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleError = (error: string) => {
    toast({
      title: 'Upload Error',
      description: error,
      variant: 'destructive',
    });
  };

  const handleRemove = async () => {
    try {
      if (judgeId) {
        await judgePhotoService.deleteJudgePhoto(judgeId);
      }
      
      onPhotoChange(null);
      
      toast({
        title: 'Photo Removed',
        description: 'Judge photo has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove photo',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        {/* Avatar Preview */}
        <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
          {photoUrl ? (
            <AvatarImage src={photoUrl} alt={`${judgeName} photo`} />
          ) : (
            <AvatarFallback className="text-3xl bg-primary/10 text-primary">
              {getInitials(judgeName)}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Upload/Remove Buttons */}
        {!disabled && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {photoUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {photoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showDropzone} onOpenChange={setShowDropzone}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Judge Photo</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex justify-center">
                <Avatar className="h-24 w-24 border-2 border-border">
                  {photoUrl ? (
                    <AvatarImage src={photoUrl} alt="Preview" />
                  ) : (
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials(judgeName)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>

              {/* File Dropzone */}
              <FileDropzone
                onFileSelect={handleFileSelect}
                onError={handleError}
                accept="image/jpeg,image/png,image/webp"
                maxSize={2}
                progress={isUploading ? uploadProgress : undefined}
                disabled={isUploading}
              />

              <p className="text-sm text-muted-foreground text-center">
                Accepted formats: JPEG, PNG, WebP • Maximum size: 2MB
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDropzone(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
