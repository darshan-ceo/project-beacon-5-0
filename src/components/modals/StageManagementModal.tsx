import React, { useState } from 'react';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldTooltipWrapper } from '@/components/help/FieldTooltipWrapper';
import { useAppState } from '@/contexts/AppStateContext';
import { useToast } from '@/hooks/use-toast';
import { casesService } from '@/services/casesService';
import { ArrowRight, Clock, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { CASE_STAGES, normalizeStage } from '@/utils/stageUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Compute effective stage with fallback
  const effectiveStage = currentStage || state.cases.find(c => c.id === caseId)?.currentStage || 'Assessment';
  const canonicalStage = normalizeStage(effectiveStage);
  const currentStageIndex = CASE_STAGES.findIndex(s => s === canonicalStage);
  const availableNextStages = currentStageIndex >= 0 ? CASE_STAGES.slice(currentStageIndex + 1) : [];

  const handleAdvanceStage = async () => {
    if (!caseId || !selectedNextStage || isAdvancing) return;

    const caseToUpdate = state.cases.find(c => c.id === caseId);
    if (!caseToUpdate) return;

    setIsAdvancing(true);

    try {
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
            disabled={!selectedNextStage || isAdvancing || availableNextStages.length === 0}
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
