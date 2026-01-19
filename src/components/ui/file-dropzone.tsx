import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  accept?: string;
  acceptLabel?: string; // Human-readable label like "PDF, DOC, DOCX"
  maxSize?: number; // in bytes (will be converted to MB for display)
  maxSizeMB?: number; // Alternative: size in MB directly
  disabled?: boolean;
  progress?: number;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  onError,
  accept = "image/jpeg,image/png,image/webp",
  acceptLabel,
  maxSize,
  maxSizeMB = 2,
  disabled = false,
  progress,
  className
}) => {
  // Calculate display size - prefer maxSizeMB, otherwise convert maxSize from bytes
  const displayMaxSizeMB = maxSizeMB || (maxSize ? maxSize / (1024 * 1024) : 2);
  // Use maxSize in bytes for validation, or convert maxSizeMB to bytes
  const maxSizeBytes = maxSize || (maxSizeMB * 1024 * 1024);
  
  // Generate accept label from accept string if not provided
  const displayAcceptLabel = acceptLabel || accept.split(',').map(t => {
    const type = t.trim();
    if (type.includes('/')) {
      // MIME type like "image/jpeg" -> "JPEG"
      return type.split('/')[1].toUpperCase();
    }
    // Extension like ".pdf" -> "PDF"
    return type.replace('.', '').toUpperCase();
  }).join(', ');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    // Check file type
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });

    if (!isValidType) {
      onError(`File type not supported. Accepted: ${displayAcceptLabel}`);
      return false;
    }

    // Check file size (compare in bytes)
    if (file.size > maxSizeBytes) {
      onError(`File size too large. Maximum size: ${displayMaxSizeMB}MB`);
      return false;
    }

    return true;
  }, [accept, maxSizeBytes, displayMaxSizeMB, displayAcceptLabel, onError]);

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [validateFile, onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <Card
      className={cn(
        "relative border-2 border-dashed transition-colors duration-200",
        isDragOver && !disabled && "border-primary bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer hover:border-primary/50",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-6">
        {progress !== undefined ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Upload className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Uploading...</p>
              <p className="text-xs text-muted-foreground">{selectedFile?.name}</p>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-center">
              <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </div>
        ) : selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <File className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={handleClear}>
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Upload className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Drop your file here</p>
              <p className="text-xs text-muted-foreground">
                or click to browse files
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: {displayAcceptLabel} • Max size: {displayMaxSizeMB}MB
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" disabled={disabled}>
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
      />
    </Card>
  );
};