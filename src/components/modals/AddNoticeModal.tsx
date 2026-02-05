/**
 * Add Notice Modal
 * Form for adding/editing stage notices
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Calendar, IndianRupee } from 'lucide-react';
import { StageNotice, CreateStageNoticeInput, NoticeStatus } from '@/types/stageWorkflow';

interface AddNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateStageNoticeInput) => Promise<void>;
  caseId: string;
  stageInstanceId?: string | null;
  editNotice?: StageNotice | null;
  isLoading?: boolean;
}

const NOTICE_TYPES = [
  { value: 'ASMT-10', label: 'ASMT-10 (Assessment Notice)' },
  { value: 'ASMT-11', label: 'ASMT-11 (Additional Information)' },
  { value: 'DRC-01', label: 'DRC-01 (Demand & Recovery)' },
  { value: 'DRC-07', label: 'DRC-07 (Summary of Order)' },
  { value: 'SCN', label: 'Show Cause Notice' },
  { value: 'APL-01', label: 'APL-01 (Appeal Notice)' },
  { value: 'APL-02', label: 'APL-02 (Appeal Acknowledgment)' },
  { value: 'Other', label: 'Other Notice Type' }
];

const SECTIONS = [
  '73(1)', '73(2)', '74(1)', '74(2)', '75', '76', '77', '78', '79', '83', 'Other'
];

export const AddNoticeModal: React.FC<AddNoticeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  caseId,
  stageInstanceId,
  editNotice,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    notice_type: '',
    notice_number: '',
    notice_date: '',
    due_date: '',
    amount_demanded: '',
    section_invoked: '',
    notes: ''
  });

  const isEdit = !!editNotice;

  // Reset form when modal opens/closes or editNotice changes
  useEffect(() => {
    if (isOpen && editNotice) {
      setFormData({
        notice_type: editNotice.notice_type || '',
        notice_number: editNotice.notice_number || '',
        notice_date: editNotice.notice_date || '',
        due_date: editNotice.due_date || '',
        amount_demanded: editNotice.amount_demanded?.toString() || '',
        section_invoked: editNotice.section_invoked || '',
        notes: (editNotice.metadata as any)?.notes || ''
      });
    } else if (isOpen) {
      setFormData({
        notice_type: '',
        notice_number: '',
        notice_date: '',
        due_date: '',
        amount_demanded: '',
        section_invoked: '',
        notes: ''
      });
    }
  }, [isOpen, editNotice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const input: CreateStageNoticeInput = {
      case_id: caseId,
      stage_instance_id: stageInstanceId || undefined,
      notice_type: formData.notice_type || undefined,
      notice_number: formData.notice_number || undefined,
      notice_date: formData.notice_date || undefined,
      due_date: formData.due_date || undefined,
      amount_demanded: formData.amount_demanded ? parseFloat(formData.amount_demanded) : undefined,
      section_invoked: formData.section_invoked || undefined,
      metadata: formData.notes ? { notes: formData.notes } : undefined
    };

    await onSave(input);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Notice' : 'Add Notice'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update the notice details below'
              : 'Record a new notice for this stage'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notice Type */}
          <div className="space-y-1.5">
            <Label htmlFor="notice_type">Notice Type</Label>
            <Select
              value={formData.notice_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, notice_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select notice type" />
              </SelectTrigger>
              <SelectContent>
                {NOTICE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notice Number */}
          <div className="space-y-1.5">
            <Label htmlFor="notice_number">Notice Number</Label>
            <Input
              id="notice_number"
              placeholder="e.g., ASMT-10/2026/001234"
              value={formData.notice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, notice_number: e.target.value }))}
            />
          </div>

          {/* Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="notice_date">Notice Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="notice_date"
                  type="date"
                  value={formData.notice_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, notice_date: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Reply Due Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Amount and Section Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount_demanded">Demand Amount (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount_demanded"
                  type="number"
                  placeholder="0"
                  value={formData.amount_demanded}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount_demanded: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="section_invoked">Section Invoked</Label>
              <Select
                value={formData.section_invoked}
                onValueChange={(value) => setFormData(prev => ({ ...prev, section_invoked: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this notice..."
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
              {isLoading ? 'Saving...' : isEdit ? 'Update Notice' : 'Add Notice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
