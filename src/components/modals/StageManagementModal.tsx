import React, { useState, useMemo } from 'react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldTooltipWrapper } from '@/components/help/FieldTooltipWrapper';
import { useAppState } from '@/contexts/AppStateContext';
import { useToast } from '@/hooks/use-toast';
import { casesService } from '@/services/casesService';
import { ArrowRight, Clock, AlertCircle, CheckCircle, Shield, Scale } from 'lucide-react';
import { CASE_STAGES, normalizeStage } from '@/utils/stageUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StandardDateInput } from '@/components/ui/standard-date-input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StageManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string | null;
  currentStage: string;
  onStageAdvanced?: (updatedCase: any) => void;
}

export const StageManagementModal: React.FC<StageManagementModalProps> = ({
  isOpen,
  onClose,
  caseId,
  currentStage,
  onStageAdvanced
}) => {
  const { state, dispatch } = useAppState();
  const { toast } = useToast();
  const [selectedNextStage, setSelectedNextStage] = useState('');
  const [comments, setComments] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);
  
  // Phase 5: Impugned Order capture fields
  const [orderDetails, setOrderDetails] = useState({
    order_date: '',
    order_received_date: '',
    impugned_order_no: '',
    impugned_order_amount: ''
  });

  // Compute effective stage with fallback
  const effectiveStage = currentStage || state.cases.find(c => c.id === caseId)?.currentStage || 'Assessment';
  const canonicalStage = normalizeStage(effectiveStage);
  const currentStageIndex = CASE_STAGES.findIndex(s => s === canonicalStage);
  const availableNextStages = currentStageIndex >= 0 ? CASE_STAGES.slice(currentStageIndex + 1) : [];

  // Determine if we need to capture order details (when advancing to appeal stages)
  const requiresOrderDetails = useMemo(() => {
    const appealStages = ['First Appeal', 'Tribunal', 'High Court', 'Supreme Court'];
    return appealStages.includes(selectedNextStage) && canonicalStage === 'Adjudication';
  }, [selectedNextStage, canonicalStage]);

  // Validate order details
  const orderDetailsValid = useMemo(() => {
    if (!requiresOrderDetails) return true;
    return orderDetails.order_date && orderDetails.impugned_order_no;
  }, [requiresOrderDetails, orderDetails.order_date, orderDetails.impugned_order_no]);

  const handleAdvanceStage = async () => {
    if (!caseId || !selectedNextStage || isAdvancing) return;
    if (requiresOrderDetails && !orderDetailsValid) {
      toast({
        title: "Missing Order Details",
        description: "Please enter Order Date and Impugned Order Number before advancing to appeal stage.",
        variant: "destructive"
      });
      return;
    }

    const caseToUpdate = state.cases.find(c => c.id === caseId);
    if (!caseToUpdate) return;

    setIsAdvancing(true);

    try {
      // If advancing to appeal stage, first update the case with order details
      if (requiresOrderDetails) {
        await casesService.update(caseId, {
          order_date: orderDetails.order_date || undefined,
          order_received_date: orderDetails.order_received_date || undefined,
          impugned_order_no: orderDetails.impugned_order_no || undefined,
          impugned_order_amount: orderDetails.impugned_order_amount ? parseFloat(orderDetails.impugned_order_amount) : undefined
        }, dispatch);
      }

      // Use the centralized casesService.advanceStage method
      await casesService.advanceStage({
        caseId,
        currentStage,
        nextStage: selectedNextStage,
        notes: comments,
        assignedTo: caseToUpdate.assignedToName
      }, dispatch);

      // Get the updated case from state after service call
      const updatedCase = state.cases.find(c => c.id === caseId);
      
      // Notify parent component about the update
      if (onStageAdvanced && updatedCase) {
        onStageAdvanced(updatedCase);
      }

      onClose();
      setSelectedNextStage('');
      setComments('');
      setOrderDetails({ order_date: '', order_received_date: '', impugned_order_no: '', impugned_order_amount: '' });
    } catch (error) {
      console.error('Stage advancement failed:', error);
      toast({
        title: "Error",
        description: "Failed to advance stage. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={onClose}
      title="Manage Case Stage"
      description="Advance the case to the next stage in the lifecycle"
      icon={<Shield className="h-5 w-5" />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdvanceStage} 
          disabled={!selectedNextStage || isAdvancing || availableNextStages.length === 0 || (requiresOrderDetails && !orderDetailsValid)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {isAdvancing ? 'Advancing...' : 'Advance Stage'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Current Stage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Current Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">{effectiveStage}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Next Stage Selection */}
        <FieldTooltipWrapper
          formId="stage-management"
          fieldId="next-stage"
          label="Next Stage"
          required
        >
          <Select value={selectedNextStage} onValueChange={setSelectedNextStage}>
            <SelectTrigger>
              <SelectValue placeholder="Select next stage" />
            </SelectTrigger>
            <SelectContent className="z-[300] bg-white dark:bg-gray-900">
              {availableNextStages.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    {stage}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableNextStages.length === 0 && canonicalStage && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No stages available. Current stage '{effectiveStage}' is not recognized or is the final stage.
              </AlertDescription>
            </Alert>
          )}
        </FieldTooltipWrapper>

        {/* Impugned Order Details (Required when advancing to Appeal stages) */}
        {requiresOrderDetails && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Impugned Order Details (Required for Appeal)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order_date" className="text-sm">
                    Order Date <span className="text-destructive">*</span>
                  </Label>
                  <StandardDateInput
                    id="order_date"
                    value={orderDetails.order_date}
                    onChange={(value) => setOrderDetails(prev => ({ ...prev, order_date: value }))}
                    placeholder="Date of adjudication order"
                  />
                </div>
                <div>
                  <Label htmlFor="order_received_date" className="text-sm">
                    Order Received Date
                  </Label>
                  <StandardDateInput
                    id="order_received_date"
                    value={orderDetails.order_received_date}
                    onChange={(value) => setOrderDetails(prev => ({ ...prev, order_received_date: value }))}
                    placeholder="When order was received"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="impugned_order_no" className="text-sm">
                    Impugned Order No. <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="impugned_order_no"
                    value={orderDetails.impugned_order_no}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, impugned_order_no: e.target.value }))}
                    placeholder="e.g., DRC-07/2025/001"
                  />
                </div>
                <div>
                  <Label htmlFor="impugned_order_amount" className="text-sm">
                    Amount Confirmed (₹)
                  </Label>
                  <Input
                    id="impugned_order_amount"
                    type="number"
                    value={orderDetails.impugned_order_amount}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, impugned_order_amount: e.target.value }))}
                    placeholder="Amount in dispute"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These details are required for appeal deadline calculation. The appeal deadline will be calculated from the Order Date.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <FieldTooltipWrapper
          formId="stage-management"
          fieldId="stage-comments"
          label="Comments"
        >
          <Textarea
            placeholder="Add notes about this stage advancement..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </FieldTooltipWrapper>
      </div>
    </ModalLayout>
  );
};
