import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/contexts/AppStateContext';
import { useToast } from '@/hooks/use-toast';
import { casesService } from '@/services/casesService';
import { ArrowRight, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { CASE_STAGES } from '@/utils/stageUtils';

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

  const currentStageIndex = CASE_STAGES.findIndex(s => s === currentStage);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Case Stage</DialogTitle>
          <DialogDescription>
            Advance the case to the next stage in the lifecycle
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Badge variant="secondary">{currentStage}</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="nextStage">Next Stage</Label>
            <Select value={selectedNextStage} onValueChange={setSelectedNextStage}>
              <SelectTrigger>
                <SelectValue placeholder="Select next stage" />
              </SelectTrigger>
              <SelectContent>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add notes about this stage advancement..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleAdvanceStage} 
              disabled={!selectedNextStage || isAdvancing}
              className="flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {isAdvancing ? 'Advancing...' : 'Advance Stage'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};