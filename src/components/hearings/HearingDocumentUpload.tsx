/**
 * Hearing Document Upload Component
 * Allows uploading and linking documents to hearings
 */

import React, { useState } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface HearingDocumentUploadProps {
  hearingId?: string;
  caseId: string;
  onFilesSelected: (files: File[]) => void;
  existingFiles?: File[];
  onRemoveFile?: (index: number) => void;
  disabled?: boolean;
}

export const HearingDocumentUpload: React.FC<HearingDocumentUploadProps> = ({
  hearingId,
  caseId,
  onFilesSelected,
  existingFiles = [],
  onRemoveFile,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    validateAndAddFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const files = Array.from(e.target.files || []);
    validateAndAddFiles(files);
  };

  const validateAndAddFiles = (files: File[]) => {
    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    const invalidFiles = files.filter(f => !allowedTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid File Type',
        description: 'Only PDF, DOC, DOCX, JPG, and PNG files are allowed.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File Too Large',
        description: 'Each file must be less than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    onFilesSelected(files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documents & Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragging && 'border-primary bg-primary/5',
            !isDragging && 'border-muted-foreground/25',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Upload className={cn(
            'h-10 w-10 mx-auto mb-3',
            isDragging ? 'text-primary' : 'text-muted-foreground'
          )} />
          <p className="text-sm font-medium mb-1">
            {isDragging ? 'Drop files here' : 'Drag and drop files here'}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            or click to browse
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
            id="hearing-file-upload"
          />
          <label htmlFor="hearing-file-upload">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('hearing-file-upload')?.click();
              }}
            >
              Choose Files
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-3">
            Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
          </p>
        </div>

        {/* Selected Files */}
        {existingFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Files ({existingFiles.length})</p>
            <div className="space-y-2">
              {existingFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="text-muted-foreground">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(file.size)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {file.type.split('/')[1].toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {onRemoveFile && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => onRemoveFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
