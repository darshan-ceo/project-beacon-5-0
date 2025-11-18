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
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { featureFlagService } from '@/services/featureFlagService';
import { contextService } from '@/services/contextService';
import { ContextPanel } from './ContextPanel';
import { ContextSplitButton } from './ContextSplitButton';
import { StageTransitionHistory } from './StageTransitionHistory';
import { lifecycleService } from '@/services/lifecycleService';
import { TransitionType, ChecklistItem, OrderDetails, ReasonEnum, LifecycleState } from '@/types/lifecycle';
import { MATTER_TYPES, MatterType } from '../../../config/appConfig';
import { normalizeStage } from '@/utils/stageUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppState } from '@/contexts/AppStateContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';
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
  AlertTriangle,
  MoveRight,
  Sparkles
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
  const [isInlineContextOpen, setIsInlineContextOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);

  const caseData = state.cases.find(c => c.id === caseId);
  const effectiveStage = currentStage || caseData?.currentStage || 'Assessment';
  const canonicalStage = normalizeStage(effectiveStage);
  const availableStages = lifecycleService.getAvailableStages(canonicalStage, transitionType);
  
  // Validation: Check for incomplete tasks and pending hearings
  const incompleteTasks = caseId 
    ? state.tasks.filter(t => 
        t.caseId === caseId && 
        t.stage === canonicalStage && 
        t.status !== 'Completed'
      )
    : [];
  
  const pendingHearings = caseId
    ? state.hearings.filter(h => 
        h.case_id === caseId && 
        h.status === 'scheduled'
      )
    : [];

  const hasBlockingItems = transitionType === 'Forward' && (incompleteTasks.length > 0 || pendingHearings.length > 0);
  
  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
          
          if (!error && data) {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
      }
    };

    if (isOpen) {
      checkAdminRole();
      // Reset force override when dialog opens
      setForceOverride(false);
    }
  }, [isOpen]);

  // Generate temporary stage instance ID (caseId + stage combination)
  const stageInstanceId = caseId ? `${caseId}-${effectiveStage.toLowerCase().replace(/\s+/g, '-')}` : '';

  // Stage descriptions for preview
  const stageDescriptions: Record<string, string> = {
    'Assessment': 'Initial notice review and case assessment phase',
    'Adjudication': 'Active proceedings with hearings and submissions',
    'First Appeal': 'First level appellate proceedings',
    'Tribunal': 'Tribunal-level adjudication',
    'High Court': 'High Court proceedings',
    'Supreme Court': 'Supreme Court proceedings'
  };

  // Get transition icon
  const getTransitionIcon = () => {
    const option = transitionTypeOptions.find(o => o.value === transitionType);
    return option?.icon || ArrowRight;
  };

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
      // Add force override notice to comments for audit trail
      let finalComments = comments;
      if (forceOverride && hasBlockingItems) {
        const overrideNotice = `\n\n[ADMIN OVERRIDE] Stage transition forced despite ${incompleteTasks.length} incomplete task(s) and ${pendingHearings.length} pending hearing(s). Administrator bypass used for exceptional circumstances.`;
        finalComments = comments ? comments + overrideNotice : overrideNotice.trim();
      }

      await lifecycleService.createTransition({
        caseId,
        type: transitionType,
        toStageKey: selectedStage,
        comments: finalComments,
        dispatch: dispatch
      });

      const overrideMsg = forceOverride && hasBlockingItems ? ' (Admin Override)' : '';
      toast({ title: "Success", description: `Case moved to ${selectedStage}${overrideMsg}` });
      onStageUpdated?.({ currentStage: selectedStage, type: transitionType });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update stage", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Case Stage
          </DialogTitle>
          <DialogDescription>Transition the case through its lifecycle</DialogDescription>
        </DialogHeader>

        {/* Context Access Button */}
        {caseId && (
          <div className="px-6 pb-4">
            <Separator className="mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Stage Context</p>
                <p className="text-xs text-muted-foreground">Review tasks, hearings, docs & contacts before deciding</p>
              </div>
              <ContextSplitButton
                caseId={caseId}
                stageInstanceId={stageInstanceId}
                onOpenInline={() => setIsInlineContextOpen(!isInlineContextOpen)}
                isInlineOpen={isInlineContextOpen}
              />
            </div>
            {isInlineContextOpen && (
              <div className="mt-4">
                <ContextPanel 
                  caseId={caseId}
                  stageInstanceId={stageInstanceId}
                />
              </div>
            )}
            <Separator className="mt-4" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 overflow-y-auto max-h-[65vh] px-1">
          {/* Left Column: Stage Transition Form */}
          <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{effectiveStage}</Badge>
                {/* State Bench Location Badge */}
                {caseData?.currentStage === 'TRIBUNAL' && 
                 (caseData as any)?.matterType === 'state_bench' && 
                 caseData?.stateBenchState && 
                 caseData?.stateBenchCity && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {caseData.stateBenchState} - {caseData.stateBenchCity}
                  </Badge>
                )}
              </div>
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

          {/* Blocking Items Alert */}
          {hasBlockingItems && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Cannot advance stage - incomplete items:</div>
                {incompleteTasks.length > 0 && (
                  <div className="mb-2">
                    <div className="font-medium">Incomplete Tasks ({incompleteTasks.length}):</div>
                    <ul className="list-disc list-inside ml-2 text-sm">
                      {incompleteTasks.slice(0, 5).map(task => (
                        <li key={task.id}>{task.title} - {task.status}</li>
                      ))}
                      {incompleteTasks.length > 5 && (
                        <li className="text-muted-foreground">...and {incompleteTasks.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
                {pendingHearings.length > 0 && (
                  <div>
                    <div className="font-medium">Pending Hearings ({pendingHearings.length}):</div>
                    <ul className="list-disc list-inside ml-2 text-sm">
                      {pendingHearings.slice(0, 5).map(hearing => (
                        <li key={hearing.id}>
                          {new Date(hearing.date).toLocaleDateString()} at {hearing.start_time}
                        </li>
                      ))}
                      {pendingHearings.length > 5 && (
                        <li className="text-muted-foreground">...and {pendingHearings.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
                <div className="mt-2 text-sm">
                  Please complete all tasks and conclude all hearings before advancing to the next stage.
                </div>
              </AlertDescription>
              </Alert>
            )}

            {/* Admin Force Override Option */}
            {isAdmin && hasBlockingItems && (
              <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="force-override"
                      checked={forceOverride}
                      onCheckedChange={(checked) => setForceOverride(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor="force-override"
                        className="text-sm font-semibold text-orange-900 dark:text-orange-100 cursor-pointer flex items-center gap-2"
                      >
                        <Shield className="h-4 w-4" />
                        Force Override (Admin Only)
                      </Label>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        Bypass validation and proceed with stage transition despite incomplete items. 
                        Use this option only in exceptional circumstances with proper justification in notes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stage Progression Preview Card */}
          {selectedStage && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Transition Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visual Stage Flow */}
                <div className="flex items-center gap-3">
                  {/* Current Stage */}
                  <div className="flex-1 text-center">
                    <Badge 
                      variant="secondary" 
                      className="mb-2 px-3 py-1.5 text-sm font-medium"
                    >
                      {effectiveStage}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {stageDescriptions[canonicalStage] || 'Current stage'}
                    </p>
                  </div>

                  {/* Transition Arrow */}
                  <div className="flex flex-col items-center px-4">
                    {(() => {
                      const TransitionIcon = getTransitionIcon();
                      return <TransitionIcon className="h-6 w-6 text-primary animate-pulse" />;
                    })()}
                    <span className="text-xs font-medium text-primary mt-1">
                      {transitionType}
                    </span>
                  </div>

                  {/* Next Stage */}
                  <div className="flex-1 text-center">
                    <Badge 
                      variant="default" 
                      className="mb-2 px-3 py-1.5 text-sm font-medium"
                    >
                      {selectedStage}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {stageDescriptions[selectedStage] || 'Next stage'}
                    </p>
                  </div>
                </div>

                {/* Impact Notice */}
                <Alert className="bg-background/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {transitionType === 'Forward' && (
                      <>This will advance the case to <strong>{selectedStage}</strong> stage. All stakeholders will be notified.</>
                    )}
                    {transitionType === 'Send Back' && (
                      <>This will return the case to <strong>{selectedStage}</strong> for corrections or additional work.</>
                    )}
                    {transitionType === 'Remand' && (
                      <>This will restart the <strong>{selectedStage}</strong> stage workflow from the beginning.</>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

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

          {/* Right Column: Stage History */}
          <div className="col-span-1">
            {caseId && <StageTransitionHistory caseId={caseId} />}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleTransition} 
            disabled={!selectedStage || isProcessing || (hasBlockingItems && !forceOverride)}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {forceOverride && hasBlockingItems ? 'Force Transition' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
