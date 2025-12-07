import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Loader2, ChevronUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  const [showOptions, setShowOptions] = useState(false);
  const [hoursLogged, setHoursLogged] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setHoursLogged('');
      setShowOptions(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-card">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 bg-muted px-2.5 py-1.5 rounded-lg text-sm group"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[120px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Row */}
      <div className="p-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="message-attachments"
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="shrink-0"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a quick update..."
            disabled={disabled || isSending}
            className="pr-10"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowOptions(!showOptions)}
          className={cn(
            'shrink-0 transition-transform',
            showOptions && 'rotate-180'
          )}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>

        <Button
          onClick={handleSend}
          disabled={disabled || isSending || (!message.trim() && attachments.length === 0)}
          size="icon"
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expandable Options */}
      <Collapsible open={showOptions} onOpenChange={setShowOptions}>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 flex items-center gap-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Select
                value={statusUpdate || ''}
                onValueChange={(val) => setStatusUpdate(val as TaskStatusUpdate || undefined)}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="No change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No change</SelectItem>
                  {TASK_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                step="0.5"
                min="0"
                value={hoursLogged}
                onChange={(e) => setHoursLogged(e.target.value)}
                placeholder="Hours"
                className="w-20 h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">logged</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
