import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FileIcon, Download, Bot, ArrowRight, Loader2 } from 'lucide-react';
import { TaskMessage, TASK_STATUS_OPTIONS } from '@/types/taskMessages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: TaskMessage;
  isOwnMessage?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage = false,
}) => {
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusStyle = (status: string) => {
    const option = TASK_STATUS_OPTIONS.find((opt) => opt.value === status);
    return option?.color || 'bg-muted text-muted-foreground';
  };

  const handleAttachmentClick = async (e: React.MouseEvent, attachment: any) => {
    e.preventDefault();
    
    // The attachment.id contains the file path
    const filePath = attachment.id;
    if (!filePath) {
      toast.error('File path not found');
      return;
    }

    setDownloadingId(attachment.id);
    
    try {
      // Generate fresh signed URL for download
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error accessing file:', error);
      toast.error('Failed to access file. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const renderAttachment = (attachment: any, index: number) => {
    const isImage = attachment.type?.startsWith('image/');
    const isDownloading = downloadingId === attachment.id;
    
    return (
      <button
        key={attachment.id || index}
        onClick={(e) => handleAttachmentClick(e, attachment)}
        disabled={isDownloading}
        className="flex items-center gap-2 p-2.5 rounded-lg bg-background border hover:bg-muted/50 transition-colors group text-left w-full"
      >
        {isImage ? (
          <div className="relative">
            <div className="h-14 w-14 flex items-center justify-center bg-muted rounded">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
            <FileIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.name}</p>
          <p className="text-xs text-muted-foreground">
            {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'File'}
          </p>
        </div>
        {isDownloading ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  };

  // Status change message
  if (message.statusUpdate && !message.message) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
        <ArrowRight className="h-3.5 w-3.5" />
        <span>{message.createdByName} changed status to</span>
        <Badge variant="secondary" className={cn('text-xs', getStatusStyle(message.statusUpdate))}>
          {message.statusUpdate}
        </Badge>
        <span className="text-xs">
          {format(new Date(message.createdAt), 'MMM d, h:mm a')}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex gap-2 md:gap-3 px-2 md:px-4 py-3 md:py-4',
      isOwnMessage && 'bg-muted/30'
    )}>
      <Avatar className="h-7 w-7 md:h-8 md:w-8 shrink-0 mt-0.5">
        <AvatarFallback className={cn(
          'text-[10px] md:text-xs font-medium',
          message.isSystemMessage 
            ? 'bg-primary/10 text-primary' 
            : 'bg-secondary'
        )}>
          {message.isSystemMessage ? (
            <Bot className="h-3.5 w-3.5 md:h-4 md:w-4" />
          ) : (
            getInitials(message.createdByName)
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
          <span className="font-medium text-xs md:text-sm">
            {message.isSystemMessage ? 'System' : message.createdByName}
          </span>
          <span className="text-[10px] md:text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'MMM d, yyyy • h:mm a')}
          </span>
          {message.statusUpdate && (
            <Badge variant="secondary" className={cn('text-xs', getStatusStyle(message.statusUpdate))}>
              → {message.statusUpdate}
            </Badge>
          )}
        </div>
        
        {message.message && (
          <div 
            className="prose prose-sm dark:prose-invert max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: message.message }}
          />
        )}
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="grid gap-2 mt-3 max-w-md">
            {message.attachments.map((att, idx) => renderAttachment(att, idx))}
          </div>
        )}
      </div>
    </div>
  );
};
