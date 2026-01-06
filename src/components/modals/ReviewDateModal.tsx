import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Case } from '@/contexts/AppStateContext';

interface ReviewDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reviewDate: string, notes?: string) => void;
  caseData: Case;
}

export const ReviewDateModal: React.FC<ReviewDateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  caseData
}) => {
  const [reviewDate, setReviewDate] = useState<Date>();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!reviewDate) {
      setError('Please select a review date');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (reviewDate < today) {
      setError('Review date must be in the future');
      return;
    }

    // Minimum review period of 30 days
    const minReviewDate = new Date();
    minReviewDate.setDate(minReviewDate.getDate() + 30);
    
    if (reviewDate < minReviewDate) {
      setError('Review date must be at least 30 days from now');
      return;
    }

    onConfirm(format(reviewDate, 'yyyy-MM-dd'), notes || undefined);
    handleClose();
  };

  const handleClose = () => {
    setReviewDate(undefined);
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-beacon-modal max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Set Review Period</DialogTitle>
          <DialogDescription>
            Mark case as completed and schedule a review date
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">About Review Period</p>
              <p className="text-muted-foreground mt-1">
                After completion, cases may need review for appeal deadlines, compliance checks, or outcome verification. 
                The review date must be at least 30 days from today.
              </p>
            </div>
          </div>

          {/* Case Details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-foreground">Case Details</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium">Case Number:</span> {caseData.caseNumber}</p>
              <p><span className="font-medium">Title:</span> {caseData.title}</p>
              <p><span className="font-medium">Stage:</span> {caseData.currentStage}</p>
            </div>
          </div>

          {/* Review Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="review-date">Review Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="review-date"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !reviewDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {reviewDate ? format(reviewDate, 'PPP') : 'Select review date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={reviewDate}
                  onSelect={setReviewDate}
                  disabled={(date) => {
                    const minDate = new Date();
                    minDate.setDate(minDate.getDate() + 30);
                    return date < minDate;
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Completion Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about the case completion, outcome, or review requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Mark Complete & Set Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};