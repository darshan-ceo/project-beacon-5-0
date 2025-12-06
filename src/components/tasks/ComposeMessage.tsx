import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskStatusUpdate, TaskAttachment, TASK_STATUS_OPTIONS } from '@/types/taskMessages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ComposeMessageProps {
  onSend: (message: string, attachments: TaskAttachment[], statusUpdate?: TaskStatusUpdate) => Promise<void>;
  currentStatus?: string;
  disabled?: boolean;
}

export const ComposeMessage: React.FC<ComposeMessageProps> = ({
  onSend,
  currentStatus,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [statusUpdate, setStatusUpdate] = useState<TaskStatusUpdate | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: TaskAttachment[] = [];

    for (const file of Array.from(files)) {
      try {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `task-attachments/${fileName}`;

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        newAttachments.push({
          id: data.path,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) {
      toast.error('Please enter a message or attach a file');
      return;
    }

    setIsSending(true);
    try {
      await onSend(message.trim(), attachments, statusUpdate);
      setMessage('');
      setAttachments([]);
      setStatusUpdate(undefined);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4 space-y-3">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm"
            >
              <Paperclip className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (⌘+Enter to send)"
            className="min-h-[80px] resize-none"
            disabled={disabled || isSending}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="message-attachments"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
            <span className="ml-1">Attach</span>
          </Button>

          <Select
            value={statusUpdate || ''}
            onValueChange={(val) => setStatusUpdate(val as TaskStatusUpdate || undefined)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No status change</SelectItem>
              {TASK_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSend}
          disabled={disabled || isSending || (!message.trim() && attachments.length === 0)}
          className="gap-2"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </Button>
      </div>
    </div>
  );
};
