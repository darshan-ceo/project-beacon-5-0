/**
 * File Reply Modal
 * Form for filing a reply to a notice with document upload support
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Send, Calendar, Upload, X, FileText } from 'lucide-react';
import { StageNotice, StageReply, CreateStageReplyInput, ReplyFilingStatus, FilingMode } from '@/types/stageWorkflow';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadDocument, DocumentMetadata } from '@/services/supabaseDocumentService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FileReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateStageReplyInput) => Promise<void>;
  notice: StageNotice | null;
  stageInstanceId?: string | null;
  editReply?: StageReply | null;
  isLoading?: boolean;
}

const FILING_STATUS_OPTIONS: { value: ReplyFilingStatus; label: string; description: string }[] = [
  { value: 'Draft', label: 'Draft', description: 'Save as draft, not yet filed' },
  { value: 'Filed', label: 'Filed', description: 'Reply has been submitted' },
  { value: 'Acknowledged', label: 'Acknowledged', description: 'Filing acknowledged by authority' }
];

const FILING_MODES: { value: FilingMode; label: string; description: string }[] = [
  { value: 'Portal', label: 'Online Portal', description: 'Filed via GST portal' },
  { value: 'Physical', label: 'Physical', description: 'Submitted in person or by post' },
  { value: 'Email', label: 'Email', description: 'Filed via email' }
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'dd MMM yyyy') : dateStr;
  } catch {
    return dateStr;
  }
}

export const FileReplyModal: React.FC<FileReplyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  notice,
  stageInstanceId,
  editReply,
  isLoading = false
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    reply_date: '',
    reply_reference: '',
    filing_status: 'Draft' as ReplyFilingStatus,
    filing_mode: 'Portal' as FilingMode,
    notes: ''
  });
  
  // Document upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!editReply;

  // Reset form when modal opens/closes or editReply changes
  useEffect(() => {
    if (isOpen && editReply) {
      setFormData({
        reply_date: editReply.reply_date || '',
        reply_reference: editReply.reply_reference || '',
        filing_status: editReply.filing_status || 'Draft',
        filing_mode: editReply.filing_mode || 'Portal',
        notes: editReply.notes || ''
      });
      setSelectedFiles([]);
    } else if (isOpen) {
      setFormData({
        reply_date: new Date().toISOString().split('T')[0],
        reply_reference: '',
        filing_status: 'Draft',
        filing_mode: 'Portal',
        notes: ''
      });
      setSelectedFiles([]);
    }
  }, [isOpen, editReply]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notice) return;

    setIsUploading(true);
    let documentIds: string[] = [];

    try {
      // Get tenant_id for document uploads
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      // Upload documents if any selected
      if (selectedFiles.length > 0 && profile?.tenant_id) {
        for (const file of selectedFiles) {
          try {
            const metadata: DocumentMetadata = {
              tenant_id: profile.tenant_id,
              case_id: notice.case_id,
              category: 'Reply',
              remarks: `Reply document for ${notice.notice_type || 'Notice'}`
            };
            
            const doc = await uploadDocument(file, metadata);
            if (doc?.id) {
              documentIds.push(doc.id);
            }
          } catch (uploadError) {
            console.error('[FileReplyModal] Document upload failed:', uploadError);
            toast({
              title: "Upload Warning",
              description: `Failed to upload ${file.name}. Continuing with other files.`,
              variant: "destructive"
            });
          }
        }
      }

      const input: CreateStageReplyInput = {
        notice_id: notice.id,
        stage_instance_id: stageInstanceId || undefined,
        reply_date: formData.reply_date || undefined,
        reply_reference: formData.reply_reference || undefined,
        filing_status: formData.filing_status,
        filing_mode: formData.filing_mode,
        documents: documentIds.length > 0 ? documentIds : undefined,
        notes: formData.notes || undefined
      };

      await onSave(input);
      onClose();
    } catch (error) {
      console.error('[FileReplyModal] Save failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!notice) return null;

  const footerContent = (
    <>
      <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isUploading}>
        Cancel
      </Button>
      <Button type="submit" form="file-reply-form" disabled={isLoading || isUploading}>
        {isUploading ? 'Uploading...' : isLoading ? 'Saving...' : (
          formData.filing_status === 'Draft' ? 'Save Draft' : 'File Reply'
        )}
      </Button>
    </>
  );

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={isEdit ? 'Edit Reply' : 'File Reply'}
      description={isEdit 
        ? 'Update the reply details'
        : `File a reply to notice ${notice.notice_number || notice.notice_type}`
      }
      icon={<Send className="h-5 w-5 text-primary" />}
      footer={footerContent}
      maxWidth="max-w-[500px]"
    >
      {/* Notice Context */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {notice.notice_type}
            {notice.notice_number && ` / ${notice.notice_number}`}
          </span>
          <Badge variant="secondary" className="text-xs">
            {notice.status}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {notice.notice_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Dated: {formatDate(notice.notice_date)}
            </span>
          )}
          {notice.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due: {formatDate(notice.due_date)}
            </span>
          )}
        </div>
      </div>

      <form id="file-reply-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Reply Date and Reference */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reply_date">Reply Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reply_date"
                type="date"
                value={formData.reply_date}
                onChange={(e) => setFormData(prev => ({ ...prev, reply_date: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reply_reference">Reply Reference</Label>
            <Input
              id="reply_reference"
              placeholder="e.g., RPL-2026-001"
              value={formData.reply_reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reply_reference: e.target.value }))}
            />
          </div>
        </div>

        {/* Filing Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filing_status">Filing Status</Label>
            <Select
              value={formData.filing_status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, filing_status: value as ReplyFilingStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILING_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="filing_mode">Filing Mode</Label>
            <Select
              value={formData.filing_mode}
              onValueChange={(value) => setFormData(prev => ({ ...prev, filing_mode: value as FilingMode }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILING_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <span>{mode.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Document Upload Zone */}
        <div className="space-y-2">
          <Label>Attach Documents</Label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Drop files here or click to browse
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              PDF, DOC, DOCX, JPG, PNG
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {selectedFiles.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <Button 
                    type="button"
                    size="icon" 
                    variant="ghost" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="h-6 w-6 flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes about this reply..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </div>
      </form>
    </ModalLayout>
  );
};
