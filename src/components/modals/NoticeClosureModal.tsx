/**
 * Notice Closure Modal
 * Modal for closing a notice with selectable outcomes
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  XCircle, 
  FileCheck, 
  FileX, 
  Clock, 
  ArrowRight,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { StageNotice, UpdateStageNoticeInput } from '@/types/stageWorkflow';
import { format, parseISO, isValid, addDays } from 'date-fns';

interface NoticeClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noticeId: string, data: UpdateStageNoticeInput) => Promise<void>;
  notice: StageNotice | null;
  isLoading?: boolean;
}

type ClosureOutcome = 'order_passed' | 'notice_dropped' | 'time_barred' | 'moved_to_next_stage';

const CLOSURE_OUTCOMES: { 
  value: ClosureOutcome; 
  label: string; 
  description: string; 
  icon: React.ReactNode;
  showOrderFields?: boolean;
  showAppealDeadline?: boolean;
}[] = [
  { 
    value: 'order_passed', 
    label: 'Order Passed', 
    description: 'Authority issued an order',
    icon: <FileCheck className="h-4 w-4" />,
    showOrderFields: true,
    showAppealDeadline: true
  },
  { 
    value: 'notice_dropped', 
    label: 'Notice Dropped', 
    description: 'Authority dropped the notice without action',
    icon: <FileX className="h-4 w-4" />
  },
  { 
    value: 'time_barred', 
    label: 'Time-barred', 
    description: 'Limitation period expired',
    icon: <Clock className="h-4 w-4" />
  },
  { 
    value: 'moved_to_next_stage', 
    label: 'Moved to Next Stage', 
    description: 'Case promoted to appeal stage',
    icon: <ArrowRight className="h-4 w-4" />
  }
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, 'dd MMM yyyy') : dateStr;
  } catch {
    return dateStr;
  }
}

export const NoticeClosureModal: React.FC<NoticeClosureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  notice,
  isLoading = false
}) => {
  const [selectedOutcome, setSelectedOutcome] = useState<ClosureOutcome | ''>('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

  const selectedOutcomeData = CLOSURE_OUTCOMES.find(o => o.value === selectedOutcome);

  // Calculate appeal deadline (typically 90 days from order date for GST)
  const appealDeadline = orderDate 
    ? format(addDays(parseISO(orderDate), 90), 'dd MMM yyyy')
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notice || !selectedOutcome) return;

    const closureMetadata = {
      ...((notice.metadata as object) || {}),
      closure_outcome: selectedOutcome,
      closure_notes: closureNotes,
      ...(selectedOutcomeData?.showOrderFields && {
        order_number: orderNumber,
        order_date: orderDate,
        appeal_deadline: orderDate ? addDays(parseISO(orderDate), 90).toISOString() : null
      })
    };

    await onSave(notice.id, {
      status: 'Closed',
      workflow_step: 'closed',
      metadata: closureMetadata
    });

    // Reset form and close
    setSelectedOutcome('');
    setOrderNumber('');
    setOrderDate('');
    setClosureNotes('');
    onClose();
  };

  if (!notice) return null;

  const footerContent = (
    <>
      <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
        Cancel
      </Button>
      <Button 
        type="submit" 
        form="notice-closure-form" 
        disabled={isLoading || !selectedOutcome}
        variant="destructive"
      >
        {isLoading ? 'Closing...' : 'Close Notice'}
      </Button>
    </>
  );

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Close Notice"
      description="Select an outcome and provide details to close this notice"
      icon={<XCircle className="h-5 w-5 text-destructive" />}
      footer={footerContent}
      maxWidth="max-w-[500px]"
    >
      {/* Notice Context */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-1 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {notice.notice_type}
            {notice.notice_number && ` / ${notice.notice_number}`}
          </span>
          <Badge variant="secondary" className="text-xs">
            {notice.status}
          </Badge>
        </div>
        {notice.notice_date && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Dated: {formatDate(notice.notice_date)}
          </div>
        )}
      </div>

      <form id="notice-closure-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Closure Outcome Selection */}
        <div className="space-y-3">
          <Label>Closure Outcome</Label>
          <RadioGroup 
            value={selectedOutcome} 
            onValueChange={(value) => setSelectedOutcome(value as ClosureOutcome)}
            className="space-y-2"
          >
            {CLOSURE_OUTCOMES.map((outcome) => (
              <div 
                key={outcome.value}
                className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedOutcome === outcome.value 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => setSelectedOutcome(outcome.value)}
              >
                <RadioGroupItem value={outcome.value} id={outcome.value} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {outcome.icon}
                    <Label htmlFor={outcome.value} className="font-medium cursor-pointer">
                      {outcome.label}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {outcome.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Order Details (shown when Order Passed is selected) */}
        {selectedOutcomeData?.showOrderFields && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Order Details</Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="order_number" className="text-xs">Order Number</Label>
                  <Input
                    id="order_number"
                    placeholder="e.g., DRC-07/2026/001"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="order_date" className="text-xs">Order Date</Label>
                  <Input
                    id="order_date"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Appeal Deadline Warning */}
              {appealDeadline && (
                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning-foreground">
                      Appeal Deadline
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on order date, appeal must be filed by{' '}
                      <span className="font-medium">{appealDeadline}</span> (90 days)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Closure Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="closure_notes">Closure Notes (Optional)</Label>
          <Textarea
            id="closure_notes"
            placeholder="Any additional notes about this closure..."
            value={closureNotes}
            onChange={(e) => setClosureNotes(e.target.value)}
            rows={2}
          />
        </div>
      </form>
    </ModalLayout>
  );
};
