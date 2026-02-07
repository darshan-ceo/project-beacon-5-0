/**
 * QuickInquiryModal
 * Streamlined modal for capturing new business inquiries directly
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Phone, Mail, FileText } from 'lucide-react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { INQUIRY_TYPE_OPTIONS, LEAD_SOURCE_OPTIONS } from '@/types/lead';
import { toast } from 'sonner';

interface QuickInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickInquiryModal: React.FC<QuickInquiryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form state
  const [partyName, setPartyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [inquiryType, setInquiryType] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setPartyName('');
    setPhone('');
    setEmail('');
    setInquiryType('');
    setSource('');
    setNotes('');
  };

  const createMutation = useMutation({
    mutationFn: () =>
      leadService.createInquiryDirect({
        partyName,
        phone: phone || undefined,
        email: email || undefined,
        inquiryType,
        source: source || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Inquiry created successfully');
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead-pipeline-stats'] });
        resetForm();
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Failed to create inquiry');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create inquiry');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyName.trim()) {
      toast.error('Party name is required');
      return;
    }

    if (!phone.trim() && !email.trim()) {
      toast.error('At least one contact method (phone or email) is required');
      return;
    }

    if (!inquiryType) {
      toast.error('Inquiry type is required');
      return;
    }

    createMutation.mutate();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create Inquiry'}
      </Button>
    </div>
  );

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={handleClose}
      title="New Inquiry"
      description="Capture a new business inquiry"
      icon={<Plus className="h-5 w-5" />}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Party Name */}
        <div className="space-y-2">
          <Label htmlFor="partyName">
            Party Name / Business Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="partyName"
            placeholder="e.g., ABC Enterprises"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Phone
            </Label>
            <Input
              id="phone"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          At least one contact method is required
        </p>

        {/* Inquiry Type */}
        <div className="space-y-2">
          <Label>
            Inquiry Type <span className="text-destructive">*</span>
          </Label>
          <Select value={inquiryType} onValueChange={setInquiryType}>
            <SelectTrigger>
              <SelectValue placeholder="Select inquiry type..." />
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
        <div className="space-y-2">
          <Label>Source</Label>
          <Select value={source} onValueChange={setSource}>
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
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Notes (optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Brief description of the inquiry..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </form>
    </ModalLayout>
  );
};

export default QuickInquiryModal;
