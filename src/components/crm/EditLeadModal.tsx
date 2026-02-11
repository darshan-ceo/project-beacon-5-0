/**
 * EditLeadModal → EditInquiryModal
 * Modal for editing inquiry metadata: source and notes
 * Note: Score and deal value fields removed for legal-first UX
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Target, FileText } from 'lucide-react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { leadService } from '@/services/leadService';
import { Lead, LEAD_SOURCE_OPTIONS, INQUIRY_TYPE_OPTIONS } from '@/types/lead';
import { toast } from 'sonner';

interface EditLeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form state (simplified - removed score and deal value)
  const [leadSource, setLeadSource] = useState('');
  const [inquiryType, setInquiryType] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize form with lead data
  useEffect(() => {
    if (lead && isOpen) {
      setLeadSource(lead.lead_source || '');
      setInquiryType(lead.designation || '');
      setNotes(lead.notes || '');
    }
  }, [lead, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (updates: Parameters<typeof leadService.updateLead>[1]) =>
      leadService.updateLead(lead!.id, updates),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Inquiry updated successfully');
        queryClient.invalidateQueries({ queryKey: ['lead', lead?.id] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead-pipeline-stats'] });
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Failed to update inquiry');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update inquiry');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Parameters<typeof leadService.updateLead>[1] = {
      lead_source: leadSource || null,
      notes: notes || null,
    };

    updateMutation.mutate(updates);
  };

  if (!lead) return null;

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={onClose}
      title="Edit Inquiry"
      description={`Update details for ${lead.name}`}
      icon={<Edit className="h-5 w-5" />}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Inquiry Type */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Inquiry Type
          </Label>
          <Select value={inquiryType || '__none__'} onValueChange={(v) => setInquiryType(v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="__none__">None</SelectItem>
              {INQUIRY_TYPE_OPTIONS.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Source
          </Label>
          <Select value={leadSource || '__none__'} onValueChange={(v) => setLeadSource(v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="__none__">None</SelectItem>
              {LEAD_SOURCE_OPTIONS.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Add notes about this inquiry..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>
      </form>
    </ModalLayout>
  );
};

export default EditLeadModal;
