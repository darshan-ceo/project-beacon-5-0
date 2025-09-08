import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileText, Calendar, User, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DuplicateHandlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file?: File;
  existingDoc?: any;
  onReplace: () => void;
  onCreateVersion: () => void;
  onCancel: () => void;
}

export const DuplicateHandlerModal: React.FC<DuplicateHandlerModalProps> = ({
  isOpen,
  onClose,
  file,
  existingDoc,
  onReplace,
  onCreateVersion,
  onCancel
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Don't render if required data is missing
  if (!file || !existingDoc) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <div>
              <DialogTitle>Duplicate File Detected</DialogTitle>
              <DialogDescription>
                A file with the same name already exists. Choose how to handle this duplicate.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Comparison */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">NEW FILE</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{file.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Size: {formatFileSize(file.size)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Modified: {formatDistanceToNow(new Date(file.lastModified), { addSuffix: true })}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-l pl-4">
              <h4 className="font-medium text-sm text-muted-foreground">EXISTING FILE</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{existingDoc.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Size: {formatFileSize(existingDoc.size)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Uploaded: {formatDistanceToNow(new Date(existingDoc.uploadedAt), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  By: {existingDoc.uploadedByName}
                </div>
                {existingDoc.tags?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <div className="flex flex-wrap gap-1">
                      {existingDoc.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Options */}
          <div className="space-y-3">
            <h4 className="font-medium">Choose Action:</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-sm">Replace Existing File</h5>
                    <p className="text-sm text-muted-foreground">
                      Update the existing file with the new content. Previous version will be lost.
                    </p>
                  </div>
                  <Button onClick={onReplace} variant="outline" size="sm">
                    Replace
                  </Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-sm">Create New Version</h5>
                    <p className="text-sm text-muted-foreground">
                      Keep both files with version numbering (e.g., "document v2.pdf")
                    </p>
                  </div>
                  <Button onClick={onCreateVersion} variant="outline" size="sm">
                    Version
                  </Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-sm">Cancel Upload</h5>
                    <p className="text-sm text-muted-foreground">
                      Don't upload the file and return to document management
                    </p>
                  </div>
                  <Button onClick={onCancel} variant="ghost" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};