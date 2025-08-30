import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, FileX, Clock, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Case } from '@/contexts/AppStateContext';

interface AdvanceStageConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  caseData: Case;
  currentStage: string;
  nextStage: string;
  prerequisites: {
    isValid: boolean;
    missingItems: string[];
    warnings: string[];
  };
  isLoading?: boolean;
}

export const AdvanceStageConfirmationModal: React.FC<AdvanceStageConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  caseData,
  currentStage,
  nextStage,
  prerequisites,
  isLoading = false
}) => {
  const [notes, setNotes] = useState('');

  const handleConfirm = async () => {
    await onConfirm(notes.trim() || undefined);
    setNotes('');
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  // Early return if no case data
  if (!caseData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Advance Case Stage
          </DialogTitle>
          <DialogDescription>
            Review the stage transition and ensure all requirements are met before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Case Information */}
          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Case Details</h4>
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Case Number:</span>
                <span className="text-sm font-medium">{caseData.caseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Title:</span>
                <span className="text-sm font-medium">{caseData.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Priority:</span>
                <Badge variant="secondary" className={
                  caseData.priority === 'High' ? 'bg-destructive text-destructive-foreground' :
                  caseData.priority === 'Medium' ? 'bg-warning text-warning-foreground' :
                  'bg-success text-success-foreground'
                }>
                  {caseData.priority}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stage Transition */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Stage Transition</h4>
            <div className="flex items-center justify-center space-x-4 bg-accent p-4 rounded-md">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Current Stage</div>
                <Badge variant="outline" className="mt-1">{currentStage}</Badge>
              </div>
              <ArrowRight className="h-6 w-6 text-primary" />
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Next Stage</div>
                <Badge variant="default" className="mt-1">{nextStage}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Prerequisites Check */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Prerequisites Check</h4>
            
            {!prerequisites.isValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The following requirements must be completed before advancing:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {prerequisites.missingItems.map((item, index) => (
                      <li key={index} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {prerequisites.warnings.length > 0 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Please note the following:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {prerequisites.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {prerequisites.isValid && prerequisites.missingItems.length === 0 && prerequisites.warnings.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All prerequisites are met. The case is ready to advance to the next stage.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Optional Notes */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Notes (Optional)</h4>
            <Textarea
              placeholder="Add any notes or comments about this stage transition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!prerequisites.isValid || isLoading}
              className="bg-primary hover:bg-primary-hover"
            >
              {isLoading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Advancing...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Advance to {nextStage}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};