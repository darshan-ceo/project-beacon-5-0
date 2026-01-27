import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Download, Eye, File, User } from 'lucide-react';
import { Document } from '@/contexts/AppStateContext';
import { formatDateForDisplay } from '@/utils/dateFormatters';

interface RecentDocumentsProps {
  documents: Document[];
  onViewDocument?: (doc: Document) => void;
  onDownloadDocument?: (doc: Document) => void;
}

export const RecentDocuments: React.FC<RecentDocumentsProps> = ({ documents, onViewDocument, onDownloadDocument }) => {
  // Sort documents by uploadedAt (most recent first) and take the last 10
  const recentDocuments = documents
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 10);

  const getFileIcon = (type: string) => {
    const normalizedType = type?.toLowerCase() || '';
    switch (normalizedType) {
      case 'pdf': 
      case 'application/pdf':
        return '📄';
      case 'doc':
      case 'docx':
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '📝';
      case 'xls':
      case 'xlsx':
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return '📊';
      case 'ppt':
      case 'pptx':
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return '📽️';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
        return '🖼️';
      case 'txt':
      case 'text/plain':
        return '📋';
      default: 
        return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return formatDateForDisplay(dateString);
  };

  if (recentDocuments.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No recent documents</p>
        <p className="text-sm text-muted-foreground mt-2">
          Upload some documents to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recentDocuments.map((doc, index) => (
        <motion.div
          key={doc.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className="text-2xl">{getFileIcon(doc.type)}</div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <p className="font-medium text-foreground">{doc.name}</p>
                <Badge variant="outline" className="text-xs">
                  {getTimeAgo(doc.uploadedAt)}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{formatFileSize(doc.size)}</span>
                <span>•</span>
                <div className="flex items-center">
                  <User className="mr-1 h-3 w-3" />
                  {doc.uploadedByName}
                </div>
                <span>•</span>
                <span>{formatDateForDisplay(doc.uploadedAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                {(doc.tags || []).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onViewDocument?.(doc)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDownloadDocument?.(doc)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};