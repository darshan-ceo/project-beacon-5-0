import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FileIcon, ImageIcon, Download, Bot } from 'lucide-react';
import { TaskMessage, TASK_STATUS_OPTIONS } from '@/types/taskMessages';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: TaskMessage;
  isOwnMessage?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage = false,
}) => {
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

  const renderAttachment = (attachment: any, index: number) => {
    const isImage = attachment.type?.startsWith('image/');
    
    return (
      <a
        key={attachment.id || index}
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 rounded-lg bg-background border hover:bg-muted/50 transition-colors group"
      >
        {isImage ? (
          <div className="relative">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="h-12 w-12 object-cover rounded"
            />
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
        <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  };

  return (
    <div className={cn('flex gap-3 px-4 py-3', isOwnMessage && 'bg-muted/20')}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          'text-xs',
          message.isSystemMessage 
            ? 'bg-primary/10 text-primary' 
            : 'bg-muted'
        )}>
          {message.isSystemMessage ? (
            <Bot className="h-4 w-4" />
          ) : (
            getInitials(message.createdByName)
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {message.isSystemMessage ? 'System' : message.createdByName}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'MMM d, yyyy • h:mm a')}
          </span>
          {message.statusUpdate && (
            <Badge variant="secondary" className={cn('text-xs', getStatusStyle(message.statusUpdate))}>
              {message.statusUpdate}
            </Badge>
          )}
        </div>
        
        <div 
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: message.message }}
        />
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="grid gap-2 mt-2 max-w-md">
            {message.attachments.map((att, idx) => renderAttachment(att, idx))}
          </div>
        )}
      </div>
    </div>
  );
};
