/**
 * MarkAsLeadModal → CreateInquiryFromContactModal
 * Create an inquiry from an existing contact
 */

import React, { useState } from 'react';
import { Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { leadService } from '@/services/leadService';
import { LEAD_SOURCE_OPTIONS, INQUIRY_TYPE_OPTIONS } from '@/types/lead';

interface MarkAsLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  onSuccess: () => void;
}

export const MarkAsLeadModal: React.FC<MarkAsLeadModalProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [leadSource, setLeadSource] = useState<string>('');
  const [inquiryType, setInquiryType] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await leadService.markAsLead(contactId, {
        lead_status: 'new',
        lead_source: leadSource || undefined,
      });

      if (result.success) {
        toast.success('Inquiry created from contact', {
          description: `${contactName} has been added to the inquiry tracker`,
        });
        onSuccess();
        handleClose();
      } else {
        toast.error(result.error || 'Failed to create inquiry from contact');
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLeadSource('');
    setInquiryType('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Create Inquiry from Contact
          </DialogTitle>
          <DialogDescription>
            Add "{contactName}" to your inquiry tracker as a potential business opportunity.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Inquiry Type */}
          <div className="grid gap-2">
            <Label htmlFor="inquiryType">Inquiry Type</Label>
            <Select value={inquiryType} onValueChange={setInquiryType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {INQUIRY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="grid gap-2">
            <Label htmlFor="leadSource">Source</Label>
            <Select value={leadSource} onValueChange={setLeadSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {LEAD_SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Brief description of the inquiry..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Inquiry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
