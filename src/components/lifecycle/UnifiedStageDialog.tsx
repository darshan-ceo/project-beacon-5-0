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
  Info
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
  // Feature flag check
  const lifecycleCyclesEnabled = featureFlagService.isEnabled('lifecycle_cycles_v1');
  const checklistEnabled = featureFlagService.isEnabled('stage_checklist_v1');
  const contextSnapshotEnabled = featureFlagService.isEnabled('stage_context_snapshot_v1');
  const contextNewTabEnabled = featureFlagService.isEnabled('stage_context_open_newtab_v1');

  console.log('UnifiedStageDialog feature flags:', {
    lifecycleCyclesEnabled,
    checklistEnabled, 
    contextSnapshotEnabled,
    caseId,
    isOpen
  });

  // State management
  const [lifecycleState, setLifecycleState] = useState<LifecycleState | null>(null);
  const [transitionType, setTransitionType] = useState<TransitionType>('Forward');
  const [selectedStage, setSelectedStage] = useState('');
  const [comments, setComments] = useState('');
  const [orderDetails, setOrderDetails] = useState<Partial<OrderDetails>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [checklistOverrides, setChecklistOverrides] = useState<Record<string, string>>({});
  const [attestingItems, setAttestingItems] = useState<Set<string>>(new Set());
  const [overrideModal, setOverrideModal] = useState<{ 
    isOpen: boolean; 
    itemKey: string; 
    itemLabel: string;
    note: string;
  }>({
    isOpen: false,
    itemKey: '',
    itemLabel: '',
    note: ''
  });
  const [inlineContextOpen, setInlineContextOpen] = useState(false);
  const { toast } = useToast();

  // Load lifecycle data
  useEffect(() => {
    if (isOpen && caseId && lifecycleCyclesEnabled) {
      loadLifecycleData();
    }
  }, [isOpen, caseId, lifecycleCyclesEnabled]);

  const loadLifecycleData = async () => {
    if (!caseId) return;
    
    console.log('Loading lifecycle data for case:', caseId);
    
    try {
      const data = await lifecycleService.getLifecycle(caseId);
      console.log('Lifecycle data loaded:', data);
      setLifecycleState(data);
    } catch (error) {
      console.error('Failed to load lifecycle data:', error);
      toast({
        title: "Error",
        description: "Failed to load case lifecycle data",
        variant: "destructive"
      });
    }
  };

  // Get available stages based on transition type
  const availableStages = lifecycleService.getAvailableStages(currentStage, transitionType);

  // Validate transition based on checklist
  const validation = lifecycleState?.checklistItems ? 
    lifecycleService.validateTransition(lifecycleState.checklistItems, transitionType) :
    { isValid: true, missingItems: [] };

  // Check if order details are required
  const requiresOrderDetails = ['Send Back', 'Remand'].includes(transitionType);

  // Validate order details completeness
  const orderDetailsValid = !requiresOrderDetails || (
    orderDetails.reasonEnum && 
    orderDetails.orderNo && 
    orderDetails.orderDate
  );

  const canProceed = selectedStage && 
    (validation.isValid || transitionType !== 'Forward') && 
    orderDetailsValid;

  const handleTransitionTypeChange = (value: TransitionType) => {
    setTransitionType(value);
    setSelectedStage('');
    setOrderDetails({});
  };

  const handleAttestItem = async (itemKey: string) => {
    if (!lifecycleState?.checklistItems || attestingItems.has(itemKey)) return;
    
    const item = lifecycleState.checklistItems.find(i => i.itemKey === itemKey);
    if (!item || item.ruleType !== 'manual' || item.status !== 'Pending') return;

    setAttestingItems(prev => new Set(prev).add(itemKey));
    
    try {
      await lifecycleService.attestChecklistItem(itemKey);
      
      // Update local state immediately for better UX
      setLifecycleState(prev => prev ? {
        ...prev,
        checklistItems: prev.checklistItems.map(i => 
          i.itemKey === itemKey 
            ? { ...i, status: 'Attested', attestedBy: 'current-user', attestedAt: new Date().toISOString() }
            : i
        )
      } : prev);
      
      toast({
        title: "Item Attested",
        description: `${item.label} has been marked as completed`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to attest checklist item",
        variant: "destructive"
      });
    } finally {
      setAttestingItems(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleOverrideItem = async (itemKey: string, note: string) => {
    if (!lifecycleState?.checklistItems) return;
    
    const item = lifecycleState.checklistItems.find(i => i.itemKey === itemKey);
    if (!item) return;

    try {
      await lifecycleService.overrideChecklistItem(itemKey, note);
      
      // Update local state immediately
      setLifecycleState(prev => prev ? {
        ...prev,
        checklistItems: prev.checklistItems.map(i => 
          i.itemKey === itemKey 
            ? { ...i, status: 'Override', attestedBy: 'current-user', attestedAt: new Date().toISOString(), note }
            : i
        )
      } : prev);
      
      toast({
        title: "Item Overridden",
        description: `${item.label} has been overridden with justification`
      });
      
      setOverrideModal({ isOpen: false, itemKey: '', itemLabel: '', note: '' });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to override checklist item",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!caseId || !selectedStage || isProcessing) return;

    setIsProcessing(true);

    try {
      // Process checklist overrides
      const overrides = Object.entries(checklistOverrides).map(([itemKey, note]) => ({
        itemKey,
        note
      }));

      await lifecycleService.createTransition({
        caseId,
        type: transitionType,
        toStageKey: selectedStage,
        comments,
        checklistOverrides: overrides,
        orderDetails: requiresOrderDetails ? orderDetails as OrderDetails : undefined,
        dispatch
      });

      if (onStageUpdated) {
        onStageUpdated({ 
          stage: selectedStage, 
          type: transitionType,
          caseId: caseId,
          updatedAt: new Date().toISOString()
        });
      }

      onClose();
      resetForm();
    } catch (error) {
      console.error('Stage transition failed:', error);
      toast({
        title: "Error",
        description: "Failed to process stage transition",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setTransitionType('Forward');
    setSelectedStage('');
    setComments('');
    setOrderDetails({});
    setChecklistOverrides({});
    setAttestingItems(new Set());
  };

  const getCycleDisplay = () => {
    if (!lifecycleState?.currentInstance) return '';
    return ` (C${lifecycleState.currentInstance.cycleNo})`;
  };

  const getTransitionButtonLabel = () => {
    switch (transitionType) {
      case 'Forward': return 'Advance Stage';
      case 'Send Back': return 'Send Back';
      case 'Remand': return 'Remand Case';
      default: return 'Process';
    }
  };

  // Fallback to basic dialog if feature flags are disabled
  if (!lifecycleCyclesEnabled) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feature Not Available</DialogTitle>
          </DialogHeader>
          <p>Cyclic lifecycle management is not enabled. Please contact your administrator.</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Manage Case Stage</DialogTitle>
              {/* Context Integration */}
              {contextSnapshotEnabled && caseId && (
                <>
                  {contextNewTabEnabled ? (
                    <ContextSplitButton
                      caseId={caseId}
                      stageInstanceId={lifecycleState?.currentInstance?.id || 'temp-instance-id'}
                      onOpenInline={() => setInlineContextOpen(!inlineContextOpen)}
                      isInlineOpen={inlineContextOpen}
                    />
                  ) : (
                    <ContextPanel 
                      caseId={caseId}
                      stageInstanceId={lifecycleState?.currentInstance?.id || 'temp-instance-id'}
                    />
                  )}
                </>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Stage Header */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  Current Stage
                  <Badge variant="outline">
                    {currentStage}{getCycleDisplay()}
                  </Badge>
                  <Badge 
                    variant={lifecycleState?.currentInstance?.status === 'Active' ? 'default' : 'secondary'}
                  >
                    {lifecycleState?.currentInstance?.status || 'Active'}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Transition Type Selection */}
            <div className="space-y-3">
              <Label>Transition Type</Label>
              <RadioGroup 
                value={transitionType} 
                onValueChange={handleTransitionTypeChange}
                className="grid grid-cols-3 gap-4"
              >
                {transitionTypeOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <div key={option.value}>
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={option.value}
                        className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <Icon className="h-6 w-6 mb-2" />
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground text-center">
                          {option.description}
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Next Stage Selection */}
            <div className="space-y-2">
              <Label htmlFor="nextStage">
                {transitionType === 'Remand' ? 'Restart Stage' : 'Next Stage'}
              </Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${transitionType.toLowerCase()} stage`} />
                </SelectTrigger>
                <SelectContent>
                  {availableStages.map(stage => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Checklist (for Forward transitions) */}
            {checklistEnabled && transitionType === 'Forward' && lifecycleState?.checklistItems && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Stage Checklist
                    {!validation.isValid && (
                      <Badge variant="destructive">
                        {validation.missingItems.length} Required
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lifecycleState.checklistItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{item.label}</span>
                              {/* Context Info Icon */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <div className="text-xs space-y-1">
                                      <div className="font-medium">Context:</div>
                                      <div>
                                        {item.ruleType === 'auto_dms' && 'Checks document status in DMS'}
                                        {item.ruleType === 'auto_hearing' && 'Validates hearing completion'}
                                        {item.ruleType === 'auto_field' && 'Validates required case data'}
                                        {item.ruleType === 'manual' && 'Requires manual attestation'}
                                      </div>
                                      {item.note && (
                                        <div className="text-muted-foreground">
                                          Note: {item.note}
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.required && <Badge variant="outline">Required</Badge>}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                item.status === 'Auto✓' ? 'default' :
                                item.status === 'Attested' ? 'default' :
                                item.status === 'Override' ? 'secondary' :
                                'outline'
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.status === 'Pending' && item.ruleType === 'manual' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAttestItem(item.itemKey)}
                                  disabled={attestingItems.has(item.itemKey)}
                                >
                                  {attestingItems.has(item.itemKey) ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  )}
                                  {attestingItems.has(item.itemKey) ? 'Attesting...' : 'Attest'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setOverrideModal({
                                    isOpen: true,
                                    itemKey: item.itemKey,
                                    itemLabel: item.label,
                                    note: ''
                                  })}
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  Override
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Order Details (for Send Back/Remand) */}
            {requiresOrderDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Order Details
                    <Badge variant="destructive">Mandatory</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason</Label>
                      <Select 
                        value={orderDetails.reasonEnum || ''} 
                        onValueChange={(value: ReasonEnum) => 
                          setOrderDetails(prev => ({ ...prev, reasonEnum: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {reasonOptions.map(reason => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="orderNo">Order Number</Label>
                      <Input
                        id="orderNo"
                        placeholder="Enter order number"
                        value={orderDetails.orderNo || ''}
                        onChange={e => setOrderDetails(prev => ({ ...prev, orderNo: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Order Date</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={orderDetails.orderDate || ''}
                      onChange={e => setOrderDetails(prev => ({ ...prev, orderDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reasonText">Additional Notes</Label>
                    <Textarea
                      id="reasonText"
                      placeholder="Provide additional details..."
                      value={orderDetails.reasonText || ''}
                      onChange={e => setOrderDetails(prev => ({ ...prev, reasonText: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Attach Order PDF</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setOrderDetails(prev => ({ ...prev, attachedFile: file }));
                          }
                        }}
                      />
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                placeholder="Add notes about this transition..."
                value={comments}
                onChange={e => setComments(e.target.value)}
                rows={3}
              />
            </div>

            {/* Validation Warnings */}
            {!validation.isValid && transitionType === 'Forward' && (
              <Card className="border-destructive">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Cannot advance stage</p>
                      <p className="text-xs text-muted-foreground">
                        The following required items must be completed:
                      </p>
                      <ul className="text-xs text-muted-foreground mt-1 ml-4">
                        {validation.missingItems.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator className="my-4" />

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            <Button 
              onClick={handleSubmit}
              disabled={!canProceed || isProcessing}
              className="min-w-32"
            >
              {isProcessing ? 'Processing...' : getTransitionButtonLabel()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Override Reason Modal */}
      <Dialog open={overrideModal.isOpen} onOpenChange={(open) => 
        setOverrideModal(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Override Checklist Item</DialogTitle>
            <DialogDescription>
              Provide a reason for overriding: {overrideModal.itemLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="overrideReason">Justification</Label>
              <Textarea
                id="overrideReason"
                placeholder="Explain why this item is being overridden..."
                value={overrideModal.note}
                onChange={(e) => setOverrideModal(prev => ({
                  ...prev,
                  note: e.target.value
                }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOverrideModal({ isOpen: false, itemKey: '', itemLabel: '', note: '' })}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (overrideModal.note?.trim()) {
                  handleOverrideItem(overrideModal.itemKey, overrideModal.note.trim());
                }
              }}
              disabled={!overrideModal.note?.trim()}
            >
              Override Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};