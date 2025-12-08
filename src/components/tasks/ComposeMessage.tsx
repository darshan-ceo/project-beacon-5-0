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
  taskId?: string;
}

export const ComposeMessage: React.FC<ComposeMessageProps> = ({
  onSend,
  currentStatus,
  disabled = false,
  taskId,
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

    // Get tenant ID for file path prefix
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.user_metadata?.tenant_id;

    if (!tenantId) {
      toast.error('Unable to determine tenant. Please refresh and try again.');
      setIsUploading(false);
      return;
    }

    for (const file of Array.from(files)) {
      try {
        const fileName = `${Date.now()}-${file.name}`;
        // Include tenant_id prefix for RLS compliance
        const filePath = `${tenantId}/task-attachments/${fileName}`;

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (error) throw error;

        // Use signed URL for private bucket
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        newAttachments.push({
          id: data.path,
          name: file.name,
          url: urlData?.signedUrl || '',
          type: file.type,
          size: file.size,
        });

        // Sync to documents table so it appears in Document Management
        if (taskId) {
          const { error: docError } = await supabase
            .from('documents')
            .insert({
              tenant_id: tenantId,
              file_name: file.name,
              file_path: filePath,
              file_type: file.type.split('/').pop() || 'bin',
              mime_type: file.type,
              file_size: file.size,
              storage_url: urlData?.signedUrl || '',
              task_id: taskId,
              uploaded_by: user.id,
              category: 'Miscellaneous',
              document_status: 'Pending',
              version: 1,
              is_latest_version: true,
            });

          if (docError) {
            console.error('Failed to create document record:', docError);
          }
        }
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
    <div className="border-t-2 border-border bg-gradient-to-t from-muted/50 to-card shadow-lg">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-lg text-sm group shadow-sm"
            >
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate max-w-[120px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Row */}
      <div className="p-4 flex items-center gap-3">
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
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="shrink-0 border-border hover:bg-muted"
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
            className="pr-10 h-11 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowOptions(!showOptions)}
          className={cn(
            'shrink-0 transition-transform border-border hover:bg-muted',
            showOptions && 'rotate-180'
          )}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>

        <Button
          onClick={handleSend}
          disabled={disabled || isSending || (!message.trim() && attachments.length === 0)}
          size="icon"
          className="shrink-0 h-11 w-11"
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
          <div className="px-4 pb-4 pt-2 flex items-center gap-4 border-t border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Status:</span>
              <Select
                value={statusUpdate || ''}
                onValueChange={(val) => setStatusUpdate(val as TaskStatusUpdate || undefined)}
              >
                <SelectTrigger className="w-[140px] h-9 text-sm border-border">
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
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.5"
                min="0"
                value={hoursLogged}
                onChange={(e) => setHoursLogged(e.target.value)}
                placeholder="Hours"
                className="w-20 h-9 text-sm border-border"
              />
              <span className="text-xs font-medium text-muted-foreground">logged</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
