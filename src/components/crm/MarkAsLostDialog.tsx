/**
 * MarkAsLostDialog → Now: MarkAsNotProceedingDialog
 * Dialog for capturing reason when marking inquiry as not proceeding
 */

import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MarkAsLostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
  leadName?: string;
}

export const MarkAsLostDialog: React.FC<MarkAsLostDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  leadName,
}) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleConfirm}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Processing...' : 'Mark as Not Proceeding'}
      </Button>
    </div>
  );

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={handleClose}
      title="Mark as Not Proceeding"
      description={leadName ? `Why is "${leadName}" not proceeding?` : 'Provide a reason for not proceeding with this inquiry'}
      icon={<XCircle className="h-5 w-5 text-destructive" />}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="notProceedingReason">Reason</Label>
          <Textarea
            id="notProceedingReason"
            placeholder="E.g., Budget constraints, Chose another firm, No response..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            This helps track why inquiries don't proceed and improve future conversions.
          </p>
        </div>
      </div>
    </ModalLayout>
  );
};

export default MarkAsLostDialog;
