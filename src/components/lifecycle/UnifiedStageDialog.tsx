/**
 * Unified Stage Management Dialog
 * Supports Forward/Send Back/Remand with evidence checklist
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { featureFlagService } from '@/services/featureFlagService';
import { contextService } from '@/services/contextService';
import { ContextPanel } from './ContextPanel';
import { ContextSplitButton } from './ContextSplitButton';
import { lifecycleService } from '@/services/lifecycleService';
import { TransitionType, ChecklistItem, OrderDetails, ReasonEnum, LifecycleState } from '@/types/lifecycle';
import { MATTER_TYPES, MatterType } from '../../../config/appConfig';
import { normalizeStage } from '@/utils/stageUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppState } from '@/contexts/AppStateContext';
import { 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Shield,
  FileText,
  Upload,
  Loader2,
  Info,
  AlertTriangle
} from 'lucide-react';

interface UnifiedStageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string | null;
  currentStage: string;
  onStageUpdated?: (updatedData: any) => void;
  dispatch?: React.Dispatch<any>;
}

const transitionTypeOptions = [
  { value: 'Forward' as TransitionType, label: 'Forward', icon: ArrowRight, description: 'Advance to next stage' },
  { value: 'Send Back' as TransitionType, label: 'Send Back', icon: ArrowLeft, description: 'Return to previous stage' },
  { value: 'Remand' as TransitionType, label: 'Remand/Reopen', icon: RotateCcw, description: 'Restart current stage' }
];

const reasonOptions: ReasonEnum[] = [
  'Missing Documents',
  'Incorrect Filing', 
  'Legal Deficiency',
  'Technical Error',
  'Court Direction',
  'Other'
];

export const UnifiedStageDialog: React.FC<UnifiedStageDialogProps> = ({
  isOpen,
  onClose,
  caseId,
  currentStage,
  onStageUpdated,
  dispatch
}) => {
  const { state } = useAppState();
  const { toast } = useToast();
  
  // Feature flags
  const checklistEnabled = featureFlagService.isEnabled('stage_checklist_v1');
  const contextSnapshotEnabled = featureFlagService.isEnabled('stage_context_snapshot_v1');

  // State
  const [lifecycleState, setLifecycleState] = useState<LifecycleState | null>(null);
  const [transitionType, setTransitionType] = useState<TransitionType>('Forward');
  const [selectedStage, setSelectedStage] = useState('');
  const [comments, setComments] = useState('');
  const [orderDetails, setOrderDetails] = useState<Partial<OrderDetails>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const caseData = state.cases.find(c => c.id === caseId);
  const effectiveStage = currentStage || caseData?.currentStage || 'Assessment';
  const canonicalStage = normalizeStage(effectiveStage);
  const availableStages = lifecycleService.getAvailableStages(canonicalStage, transitionType);

  useEffect(() => {
    const loadLifecycle = async () => {
      if (!caseId || !isOpen) return;
      try {
        const lifecycle = await lifecycleService.getLifecycle(caseId);
        setLifecycleState(lifecycle);
      } catch (error) {
        console.error('Failed to load lifecycle:', error);
      }
    };
    loadLifecycle();
  }, [caseId, isOpen]);

  const handleTransition = async () => {
    if (!caseId || !selectedStage || isProcessing) return;
    setIsProcessing(true);
    try {
      await lifecycleService.createTransition({
        caseId,
        fromStage: canonicalStage,
        toStage: selectedStage,
        transitionType,
        notes: comments,
      }, dispatch);

      toast({ title: "Success", description: `Case moved to ${selectedStage}` });
      onStageUpdated?.({ currentStage: selectedStage });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update stage", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Case Stage
          </DialogTitle>
          <DialogDescription>Transition the case through its lifecycle</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{effectiveStage}</Badge>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Transition Type *</Label>
            <div className="grid grid-cols-3 gap-3">
              {transitionTypeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card 
                    key={option.value}
                    className={`cursor-pointer ${transitionType === option.value ? 'border-primary' : ''}`}
                    onClick={() => setTransitionType(option.value)}
                  >
                    <CardContent className="p-3">
                      <Icon className="h-4 w-4 mb-1" />
                      <p className="font-medium text-sm">{option.label}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Next Stage *</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage..." />
              </SelectTrigger>
              <SelectContent className="z-[300] bg-popover">
                {availableStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Add notes..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleTransition} disabled={!selectedStage || isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
