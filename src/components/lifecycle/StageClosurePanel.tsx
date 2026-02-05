/**
 * Stage Closure Panel Component
 * Explicit closure action with selectable outcomes
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  LogOut, 
  Handshake, 
  RotateCcw,
  FileText,
  Calendar,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { ClosureOutcome, StageClosureDetails } from '@/types/stageWorkflow';
import { cn } from '@/lib/utils';

interface StageClosurePanelProps {
  stageKey: string;
  stageInstanceId: string | null;
  canClose: boolean;
  blockingReasons?: string[];
  onCloseStage: (details: StageClosureDetails) => void;
  isClosing?: boolean;
}

interface OutcomeOption {
  value: ClosureOutcome;
  label: string;
  description: string;
  icon: React.ReactNode;
  requiresOrder: boolean;
  color: string;
}

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    value: 'Order Passed',
    label: 'Order Passed',
    description: 'Proceed to next stage (if applicable)',
    icon: <CheckCircle2 className="h-4 w-4" />,
    requiresOrder: true,
    color: 'text-success'
  },
  {
    value: 'Case Dropped',
    label: 'Case Dropped',
    description: 'No further action required',
    icon: <XCircle className="h-4 w-4" />,
    requiresOrder: false,
    color: 'text-muted-foreground'
  },
  {
    value: 'Withdrawn',
    label: 'Withdrawn',
    description: 'Taxpayer withdrew the case',
    icon: <LogOut className="h-4 w-4" />,
    requiresOrder: false,
    color: 'text-warning'
  },
  {
    value: 'Settled',
    label: 'Settled',
    description: 'Case resolved through settlement',
    icon: <Handshake className="h-4 w-4" />,
    requiresOrder: false,
    color: 'text-primary'
  },
  {
    value: 'Remanded',
    label: 'Remanded',
    description: 'Sent back to earlier stage',
    icon: <RotateCcw className="h-4 w-4" />,
    requiresOrder: true,
    color: 'text-destructive'
  }
];

export const StageClosurePanel: React.FC<StageClosurePanelProps> = ({
  stageKey,
  stageInstanceId,
  canClose,
  blockingReasons = [],
  onCloseStage,
  isClosing = false
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<ClosureOutcome | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

  const selectedOption = OUTCOME_OPTIONS.find(o => o.value === selectedOutcome);
  const requiresOrderDetails = selectedOption?.requiresOrder && selectedOutcome !== 'Remanded';

  const handleSubmit = () => {
    if (!selectedOutcome) return;

    const details: StageClosureDetails = {
      outcome: selectedOutcome,
      closure_notes: closureNotes || undefined
    };

    if (requiresOrderDetails) {
      details.order_number = orderNumber || undefined;
      details.order_date = orderDate || undefined;
    }

    onCloseStage(details);
  };

  const isValid = selectedOutcome && (!requiresOrderDetails || (orderNumber && orderDate));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Stage Closure
        </CardTitle>
        <CardDescription>
          Close the {stageKey} stage with an outcome
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Blocking Reasons */}
        {!canClose && blockingReasons.length > 0 && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-foreground">
                  Cannot close stage
                </p>
                <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                  {blockingReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Outcome Selection */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Select Closure Outcome</Label>
          <RadioGroup 
            value={selectedOutcome || ''} 
            onValueChange={(value) => setSelectedOutcome(value as ClosureOutcome)}
            disabled={!canClose}
          >
            <div className="space-y-2">
              {OUTCOME_OPTIONS.map((option) => (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: canClose ? 1.01 : 1 }}
                  className={cn(
                    "flex items-start space-x-3 border rounded-lg p-3 transition-all",
                    selectedOutcome === option.value && "border-primary bg-primary/5",
                    !canClose && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <RadioGroupItem 
                    value={option.value} 
                    id={option.value}
                    disabled={!canClose}
                    className="mt-0.5"
                  />
                  <Label 
                    htmlFor={option.value} 
                    className={cn(
                      "flex-1 cursor-pointer",
                      !canClose && "cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={option.color}>{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </Label>
                </motion.div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Order Details (conditional) */}
        {requiresOrderDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <Separator />
            <Label className="text-sm font-medium">Order Details</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="orderNumber" className="text-xs">Order Number</Label>
                <Input
                  id="orderNumber"
                  placeholder="e.g., ORD/2026/001"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orderDate" className="text-xs">Order Date</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Attach Order Document
            </Button>
          </motion.div>
        )}

        {/* Closure Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="closureNotes" className="text-xs">Closure Notes (Optional)</Label>
          <Textarea
            id="closureNotes"
            placeholder="Add any notes about this stage closure..."
            value={closureNotes}
            onChange={(e) => setClosureNotes(e.target.value)}
            rows={2}
            disabled={!canClose}
          />
        </div>

        {/* Submit Button */}
        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={!canClose || !isValid || isClosing}
        >
          {isClosing ? (
            <>Closing Stage...</>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Close Stage
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
