/**
 * Remand Confirmation Dialog Component
 * Strong confirmation with audit trail warnings
 */

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { RemandTransitionDetails, RemandType, STAGE_AUTHORITIES } from '@/types/remand';
import {
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  ArrowDownLeft,
  Shield,
  History,
  Bell,
  Loader2
} from 'lucide-react';

interface RemandConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  transitionDetails: {
    fromStage: string;
    toStage: string;
    remandType: RemandType;
    reasonCategory: string;
    reasonDetails: string;
  };
  supersededCount?: number;
  isProcessing?: boolean;
}

export const RemandConfirmationDialog: React.FC<RemandConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  transitionDetails,
  supersededCount = 0,
  isProcessing = false
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleCancel = () => {
    setAcknowledged(false);
    onCancel();
  };

  const handleConfirm = () => {
    if (acknowledged) {
      onConfirm();
    }
  };

  const isRemand = transitionDetails.remandType === 'Remand';

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Confirm {transitionDetails.remandType}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            You are about to {isRemand ? 'remand' : 'reopen'} this case. Please review the details carefully.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Stage Transition Visual */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <Badge variant="secondary" className="mb-1">
                {transitionDetails.fromStage}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {STAGE_AUTHORITIES[transitionDetails.fromStage] || 'Current'}
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              {isRemand ? (
                <ArrowDownLeft className="h-6 w-6 text-warning" />
              ) : (
                <RotateCcw className="h-6 w-6 text-info" />
              )}
              <Badge 
                variant="outline" 
                className={`text-xs mt-1 ${
                  isRemand 
                    ? 'bg-warning/10 text-warning border-warning/30' 
                    : 'bg-info/10 text-info border-info/30'
                }`}
              >
                {transitionDetails.remandType}
              </Badge>
            </div>
            
            <div className="text-center">
              <Badge 
                variant="default" 
                className={isRemand ? 'bg-warning text-warning-foreground' : 'bg-info text-info-foreground'}
              >
                {transitionDetails.toStage}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {STAGE_AUTHORITIES[transitionDetails.toStage] || 'Target'}
              </p>
            </div>
          </div>

          {/* Reason Summary */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Reason: {transitionDetails.reasonCategory}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {transitionDetails.reasonDetails}
            </p>
          </div>

          <Separator />

          {/* Audit Trail Implications */}
          <Alert className="bg-warning/10 border-warning/30">
            <Shield className="h-4 w-4 text-warning" />
            <AlertDescription>
              <p className="font-medium text-warning mb-2">Audit Trail Implications</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start gap-2">
                  <History className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>This action will be <strong>permanently recorded</strong> in the case audit log</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>All stakeholders will be <strong>notified</strong> of this change</span>
                </li>
                {supersededCount > 0 && (
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{supersededCount}</strong> future stage transition{supersededCount !== 1 ? 's' : ''} will be marked as <strong>superseded</strong> (preserved for reference)
                    </span>
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Acknowledgment Checkbox */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg bg-background">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              className="mt-0.5"
            />
            <Label
              htmlFor="acknowledge"
              className="text-sm cursor-pointer leading-relaxed"
            >
              I understand that this {transitionDetails.remandType.toLowerCase()} action cannot be undone and will be recorded in the permanent audit trail.
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant={isRemand ? 'default' : 'default'}
            onClick={handleConfirm}
            disabled={!acknowledged || isProcessing}
            className={isRemand ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {isRemand ? (
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Confirm {transitionDetails.remandType}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
