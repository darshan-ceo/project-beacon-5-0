import React, { useState } from 'react';
import { Target, Calendar, DollarSign } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { leadService } from '@/services/leadService';
import { LeadStatus, LEAD_SOURCE_OPTIONS } from '@/types/lead';

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
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('new');
  const [expectedValue, setExpectedValue] = useState<string>('');
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await leadService.markAsLead(contactId, {
        lead_status: leadStatus,
        lead_source: leadSource || undefined,
        expected_value: expectedValue ? parseFloat(expectedValue) : undefined,
        expected_close_date: expectedCloseDate || undefined,
      });

      if (result.success) {
        toast({
          title: 'Contact Marked as Lead',
          description: `${contactName} has been added to the lead pipeline`,
        });
        onSuccess();
        handleClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to mark contact as lead',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLeadSource('');
    setLeadStatus('new');
    setExpectedValue('');
    setExpectedCloseDate('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Mark as Lead
          </DialogTitle>
          <DialogDescription>
            Add "{contactName}" to your sales pipeline as a potential lead.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Lead Source */}
          <div className="grid gap-2">
            <Label htmlFor="leadSource">Lead Source</Label>
            <Select value={leadSource} onValueChange={setLeadSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Initial Status */}
          <div className="grid gap-2">
            <Label htmlFor="leadStatus">Initial Status</Label>
            <Select value={leadStatus} onValueChange={(v) => setLeadStatus(v as LeadStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expected Value */}
          <div className="grid gap-2">
            <Label htmlFor="expectedValue" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Expected Value (Optional)
            </Label>
            <Input
              id="expectedValue"
              type="number"
              placeholder="e.g., 50000"
              value={expectedValue}
              onChange={(e) => setExpectedValue(e.target.value)}
            />
          </div>

          {/* Expected Close Date */}
          <div className="grid gap-2">
            <Label htmlFor="expectedCloseDate" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Expected Close Date (Optional)
            </Label>
            <Input
              id="expectedCloseDate"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Mark as Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
