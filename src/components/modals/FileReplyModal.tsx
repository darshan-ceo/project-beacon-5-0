/**
 * File Reply Modal
 * Form for filing a reply to a notice
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Calendar, FileText, Upload } from 'lucide-react';
import { StageNotice, StageReply, CreateStageReplyInput, ReplyFilingStatus } from '@/types/stageWorkflow';
import { format, parseISO, isValid } from 'date-fns';

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
  const [formData, setFormData] = useState({
    reply_date: '',
    reply_reference: '',
    filing_status: 'Draft' as ReplyFilingStatus,
    notes: ''
  });

  const isEdit = !!editReply;

  // Reset form when modal opens/closes or editReply changes
  useEffect(() => {
    if (isOpen && editReply) {
      setFormData({
        reply_date: editReply.reply_date || '',
        reply_reference: editReply.reply_reference || '',
        filing_status: editReply.filing_status || 'Draft',
        notes: editReply.notes || ''
      });
    } else if (isOpen) {
      setFormData({
        reply_date: new Date().toISOString().split('T')[0], // Default to today
        reply_reference: '',
        filing_status: 'Draft',
        notes: ''
      });
    }
  }, [isOpen, editReply]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notice) return;

    const input: CreateStageReplyInput = {
      notice_id: notice.id,
      stage_instance_id: stageInstanceId || undefined,
      reply_date: formData.reply_date || undefined,
      reply_reference: formData.reply_reference || undefined,
      filing_status: formData.filing_status,
      notes: formData.notes || undefined
    };

    await onSave(input);
    onClose();
  };

  if (!notice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Reply' : 'File Reply'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update the reply details'
              : `File a reply to notice ${notice.notice_number || notice.notice_type}`
            }
          </DialogDescription>
        </DialogHeader>

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

        <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        — {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Upload Placeholder */}
          <div className="space-y-1.5">
            <Label>Attach Documents</Label>
            <Button type="button" variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Reply Document
            </Button>
            <p className="text-xs text-muted-foreground">
              Upload the reply document and any supporting evidence
            </p>
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

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (
                formData.filing_status === 'Draft' ? 'Save Draft' : 'File Reply'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
