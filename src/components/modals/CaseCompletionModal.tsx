import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, Scale, FileText } from 'lucide-react';
import { Case, useAppState } from '@/contexts/AppStateContext';
import { casesService } from '@/services/casesService';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface CaseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: Case;
  onComplete?: (completedCase: Case) => void;
}

// Closure reason options
const CLOSURE_REASONS = [
  { value: 'final_order_passed', label: 'Final Order Passed (No Further Remedy)' },
  { value: 'client_no_appeal', label: 'Client Decided Not to Appeal' },
  { value: 'matter_settled', label: 'Matter Settled' },
  { value: 'case_withdrawn', label: 'Case Withdrawn' },
  { value: 'order_complied', label: 'Order Complied With' },
  { value: 'other', label: 'Other (requires remarks)' },
];

export const CaseCompletionModal: React.FC<CaseCompletionModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onComplete
}) => {
  const { state, dispatch } = useAppState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Find client name
  const clientName = state.clients.find(c => c.id === caseData?.clientId)?.name || 'Unknown Client';

  // Check for upcoming hearings
  const upcomingHearings = state.hearings.filter(h => {
    if (h.case_id !== caseData?.id && h.caseId !== caseData?.id) return false;
    const hearingDate = new Date(h.date);
    return hearingDate > new Date() && (h.status === 'scheduled' || !h.status);
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setClosureReason('');
      setClosureNotes('');
      setConfirmationChecked(false);
      setSelectedFile(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const isFormValid = () => {
    if (!closureReason) return false;
    if (!confirmationChecked) return false;
    if (closureReason === 'other' && !closureNotes.trim()) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      // Complete the case
      await casesService.complete({
        caseId: caseData.id,
        completionReason: closureReason,
        completionNotes: closureNotes || undefined,
        // documentId would come from uploading the file
      }, dispatch);

      toast({
        title: 'Case Completed',
        description: 'Case marked as completed. The legal lifecycle has been formally closed.',
      });

      // Notify parent
      if (onComplete) {
        onComplete({
          ...caseData,
          status: 'Completed',
          completedDate: new Date().toISOString(),
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to complete case:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete case. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!caseData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Complete / Resolve Case
          </DialogTitle>
          <DialogDescription>
            Mark this case as completed when the legal lifecycle is fully concluded.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Case Info */}
            <Card className="shadow-sm border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{caseData.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Badge variant="outline" className="text-xs">{caseData.caseNumber}</Badge>
                  <span>•</span>
                  <span>{clientName}</span>
                  <span>•</span>
                  <span>Stage: {caseData.currentStage}</span>
                </div>
              </CardContent>
            </Card>

          {/* Warning for upcoming hearings */}
          {upcomingHearings.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium text-warning-foreground">Warning:</span>
                <span className="text-muted-foreground ml-1">
                  This case has {upcomingHearings.length} upcoming hearing{upcomingHearings.length > 1 ? 's' : ''} scheduled.
                </span>
              </div>
            </div>
          )}

          {/* Closure Reason */}
          <div className="space-y-2">
            <Label htmlFor="closure-reason" className="text-sm font-medium">
              Closure Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={closureReason} onValueChange={setClosureReason}>
              <SelectTrigger id="closure-reason">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {CLOSURE_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Closure Notes */}
          <div className="space-y-2">
            <Label htmlFor="closure-notes" className="text-sm font-medium">
              Closure Notes {closureReason === 'other' && <span className="text-destructive">*</span>}
              <span className="text-muted-foreground font-normal ml-1">(Recommended)</span>
            </Label>
            <Textarea
              id="closure-notes"
              placeholder="Enter any additional details about the case closure..."
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Upload Final Document */}
          <div className="space-y-2">
            <Label htmlFor="final-document" className="text-sm font-medium">
              Upload Final Document
              <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="final-document"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="flex-1"
              />
              {selectedFile && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {selectedFile.name.slice(0, 20)}...
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Final order, settlement agreement, or compliance proof
            </p>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-3 pt-2 border-t">
            <Checkbox
              id="confirmation"
              checked={confirmationChecked}
              onCheckedChange={(checked) => setConfirmationChecked(checked === true)}
            />
            <div className="space-y-1">
              <Label
                htmlFor="confirmation"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                I confirm that no further legal action is pending for this case.
                <span className="text-destructive ml-1">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Once completed, the case will be moved to Completed Cases and removed from active tracking.
              </p>
            </div>
          </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {isSubmitting ? 'Completing...' : 'Confirm & Close Case'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
