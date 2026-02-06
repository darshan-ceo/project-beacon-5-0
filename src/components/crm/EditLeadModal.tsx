/**
 * EditLeadModal
 * Modal for editing lead metadata: score, expected value, close date, source, notes
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Edit, Target, TrendingUp, IndianRupee, Calendar, FileText } from 'lucide-react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { leadService } from '@/services/leadService';
import { Lead, LEAD_SOURCE_OPTIONS } from '@/types/lead';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditLeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const getScoreLabel = (score: number): { label: string; className: string } => {
  if (score >= 80) return { label: 'Hot', className: 'text-green-600' };
  if (score >= 50) return { label: 'Warm', className: 'text-amber-600' };
  if (score >= 25) return { label: 'Cool', className: 'text-blue-600' };
  return { label: 'Cold', className: 'text-gray-600' };
};

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form state
  const [leadScore, setLeadScore] = useState(50);
  const [expectedValue, setExpectedValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize form with lead data
  useEffect(() => {
    if (lead && isOpen) {
      setLeadScore(lead.lead_score || 50);
      setExpectedValue(lead.expected_value?.toString() || '');
      setExpectedCloseDate(
        lead.expected_close_date
          ? format(new Date(lead.expected_close_date), 'yyyy-MM-dd')
          : ''
      );
      setLeadSource(lead.lead_source || '');
      setNotes(lead.notes || '');
    }
  }, [lead, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (updates: Parameters<typeof leadService.updateLead>[1]) =>
      leadService.updateLead(lead!.id, updates),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Lead updated successfully');
        queryClient.invalidateQueries({ queryKey: ['lead', lead?.id] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead-pipeline-stats'] });
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Failed to update lead');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update lead');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Parameters<typeof leadService.updateLead>[1] = {
      lead_score: leadScore,
      expected_value: expectedValue ? parseFloat(expectedValue) : null,
      expected_close_date: expectedCloseDate || null,
      lead_source: leadSource || null,
      notes: notes || null,
    };

    updateMutation.mutate(updates);
  };

  if (!lead) return null;

  const scoreLabel = getScoreLabel(leadScore);

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
      title="Edit Lead"
      description={`Update details for ${lead.name}`}
      icon={<Edit className="h-5 w-5" />}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Lead Score */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Lead Score
          </Label>
          <div className="space-y-2">
            <Slider
              value={[leadScore]}
              onValueChange={(values) => setLeadScore(values[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">0</span>
              <span className={cn('font-medium', scoreLabel.className)}>
                {leadScore} - {scoreLabel.label}
              </span>
              <span className="text-muted-foreground">100</span>
            </div>
          </div>
        </div>

        {/* Expected Value */}
        <div className="space-y-2">
          <Label htmlFor="expectedValue" className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            Expected Value (₹)
          </Label>
          <Input
            id="expectedValue"
            type="number"
            placeholder="Enter expected deal value"
            value={expectedValue}
            onChange={(e) => setExpectedValue(e.target.value)}
            min={0}
          />
        </div>

        {/* Expected Close Date */}
        <div className="space-y-2">
          <Label htmlFor="expectedCloseDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Expected Close Date
          </Label>
          <Input
            id="expectedCloseDate"
            type="date"
            value={expectedCloseDate}
            onChange={(e) => setExpectedCloseDate(e.target.value)}
          />
        </div>

        {/* Lead Source */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Lead Source
          </Label>
          <Select value={leadSource} onValueChange={setLeadSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="">None</SelectItem>
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
            placeholder="Add notes about this lead..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </form>
    </ModalLayout>
  );
};

export default EditLeadModal;
