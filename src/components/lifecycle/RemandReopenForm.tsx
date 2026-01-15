/**
 * Remand/Reopen Form Component
 * Complete form with validation for Remand/Reopen transitions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RemandTargetStageSelector } from './RemandTargetStageSelector';
import { stageHistoryService } from '@/services/stageHistoryService';
import { 
  RemandTransitionDetails, 
  RemandReasonCategory, 
  StageHistoryContext,
  RemandFormValidation,
  REASON_CATEGORY_DESCRIPTIONS,
  RemandType
} from '@/types/remand';
import { 
  Info, 
  Upload, 
  FileText, 
  X, 
  AlertTriangle,
  HelpCircle
} from 'lucide-react';

const REASON_CATEGORIES: RemandReasonCategory[] = [
  'Court/Tribunal Order',
  'Higher Authority Direction',
  'Fresh Evidence Discovered',
  'Procedural Error Identified',
  'Limitation/Deadline Extended',
  'Party Request Accepted',
  'Other'
];

const MIN_REASON_DETAILS_LENGTH = 50;

interface RemandReopenFormProps {
  caseId: string;
  currentStage: string;
  onFormChange: (details: Partial<RemandTransitionDetails>, validation: RemandFormValidation) => void;
}

export const RemandReopenForm: React.FC<RemandReopenFormProps> = ({
  caseId,
  currentStage,
  onFormChange
}) => {
  const [availableStages, setAvailableStages] = useState<StageHistoryContext[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(true);
  
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [remandType, setRemandType] = useState<RemandType>('Reopen');
  const [reasonCategory, setReasonCategory] = useState<RemandReasonCategory | ''>('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderDocumentFile, setOrderDocumentFile] = useState<File | null>(null);
  const [clientVisibleSummary, setClientVisibleSummary] = useState('');

  // Load available stages
  useEffect(() => {
    const loadStages = async () => {
      setIsLoadingStages(true);
      try {
        const stages = await stageHistoryService.getStageHistoryContext(caseId, currentStage);
        setAvailableStages(stages);
      } catch (error) {
        console.error('Failed to load stage history:', error);
      } finally {
        setIsLoadingStages(false);
      }
    };
    loadStages();
  }, [caseId, currentStage]);

  // Validate form
  const validate = useCallback((): RemandFormValidation => {
    const errors: RemandFormValidation['errors'] = {};

    if (!selectedStage) {
      errors.targetStage = 'Please select a target stage';
    }

    if (!reasonCategory) {
      errors.reasonCategory = 'Please select a reason category';
    }

    if (!reasonDetails || reasonDetails.length < MIN_REASON_DETAILS_LENGTH) {
      errors.reasonDetails = `Detailed notes are required (minimum ${MIN_REASON_DETAILS_LENGTH} characters)`;
    }

    // Order details required if reason is Court/Tribunal Order
    if (reasonCategory === 'Court/Tribunal Order') {
      if (!orderNumber) {
        errors.orderNumber = 'Order number is required for Court/Tribunal Order';
      }
      if (!orderDate) {
        errors.orderDate = 'Order date is required for Court/Tribunal Order';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [selectedStage, reasonCategory, reasonDetails, orderNumber, orderDate]);

  // Notify parent of changes
  useEffect(() => {
    const validation = validate();
    const details: Partial<RemandTransitionDetails> = {
      targetStage: selectedStage,
      remandType,
      reasonCategory: reasonCategory as RemandReasonCategory,
      reasonDetails,
      orderNumber: orderNumber || undefined,
      orderDate: orderDate || undefined,
      orderDocumentFile: orderDocumentFile || undefined,
      clientVisibleSummary: clientVisibleSummary || undefined,
      preservesFutureHistory: true
    };
    onFormChange(details, validation);
  }, [selectedStage, remandType, reasonCategory, reasonDetails, orderNumber, orderDate, orderDocumentFile, clientVisibleSummary, validate, onFormChange]);

  const handleStageSelect = (stage: string, type: RemandType) => {
    setSelectedStage(stage);
    setRemandType(type);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        return;
      }
      setOrderDocumentFile(file);
    }
  };

  const removeFile = () => {
    setOrderDocumentFile(null);
  };

  const validation = validate();
  const showOrderFields = reasonCategory === 'Court/Tribunal Order' || 
                          reasonCategory === 'Higher Authority Direction';

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Inline Help */}
        <Alert className="bg-info/10 border-info/20">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-sm">
            <strong>Remand/Reopen</strong> moves the case backward in its lifecycle for re-processing.
            <ul className="mt-2 list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Remand:</strong> Case returned by higher authority (Court/Tribunal) to lower level</li>
              <li><strong>Reopen:</strong> Case reopened at current level for additional work</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              All future stage history will be preserved as read-only for audit purposes.
            </p>
          </AlertDescription>
        </Alert>

        {/* Target Stage Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="font-medium">Target Stage for Remand/Reopen *</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                Select the stage where processing should resume. Current stage = Reopen, earlier stage = Remand.
              </TooltipContent>
            </Tooltip>
          </div>
          <RemandTargetStageSelector
            availableStages={availableStages}
            selectedStage={selectedStage}
            onSelect={handleStageSelect}
            currentStage={currentStage}
            isLoading={isLoadingStages}
          />
          {validation.errors.targetStage && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {validation.errors.targetStage}
            </p>
          )}
        </div>

        {/* Selected Stage Indicator */}
        {selectedStage && (
          <Alert className={remandType === 'Reopen' ? 'bg-info/10 border-info/30' : 'bg-warning/10 border-warning/30'}>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={
                remandType === 'Reopen' 
                  ? 'bg-info/20 text-info border-info/30' 
                  : 'bg-warning/20 text-warning border-warning/30'
              }>
                {remandType}
              </Badge>
              <span className="text-sm">
                Case will be {remandType === 'Reopen' ? 'reopened at' : 'remanded to'}{' '}
                <strong>{selectedStage}</strong>
              </span>
            </div>
          </Alert>
        )}

        {/* Reason Category */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="font-medium">Reason Category *</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                Select the primary reason for this lifecycle reversal. This helps track quality metrics and compliance.
              </TooltipContent>
            </Tooltip>
          </div>
          <Select 
            value={reasonCategory} 
            onValueChange={(v) => setReasonCategory(v as RemandReasonCategory)}
          >
            <SelectTrigger className={validation.errors.reasonCategory ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select reason..." />
            </SelectTrigger>
            <SelectContent className="z-[300] bg-popover">
              {REASON_CATEGORIES.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  <div className="flex flex-col">
                    <span>{reason}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {reasonCategory && (
            <p className="text-xs text-muted-foreground">
              {REASON_CATEGORY_DESCRIPTIONS[reasonCategory as RemandReasonCategory]}
            </p>
          )}
          {validation.errors.reasonCategory && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {validation.errors.reasonCategory}
            </p>
          )}
        </div>

        {/* Detailed Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="font-medium">Detailed Notes *</Label>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  Provide comprehensive details about why this remand/reopen is necessary. This is part of the permanent audit trail.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className={`text-xs ${
              reasonDetails.length < MIN_REASON_DETAILS_LENGTH 
                ? 'text-muted-foreground' 
                : 'text-success'
            }`}>
              {reasonDetails.length}/{MIN_REASON_DETAILS_LENGTH} min
            </span>
          </div>
          <Textarea
            placeholder="Provide detailed explanation for this remand/reopen. Include specific reasons, relevant facts, and any directions from higher authority..."
            value={reasonDetails}
            onChange={(e) => setReasonDetails(e.target.value)}
            rows={4}
            className={validation.errors.reasonDetails && reasonDetails.length < MIN_REASON_DETAILS_LENGTH ? 'border-destructive' : ''}
          />
          {validation.errors.reasonDetails && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {validation.errors.reasonDetails}
            </p>
          )}
        </div>

        {/* Order Details (Conditional) */}
        {showOrderFields && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <Label className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Order/Direction Details
              {reasonCategory === 'Court/Tribunal Order' && (
                <Badge variant="secondary" className="text-xs">Required</Badge>
              )}
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Order Number {reasonCategory === 'Court/Tribunal Order' && '*'}</Label>
                <Input
                  placeholder="e.g., OIA/12345/2024"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className={validation.errors.orderNumber ? 'border-destructive' : ''}
                />
                {validation.errors.orderNumber && (
                  <p className="text-xs text-destructive">{validation.errors.orderNumber}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Order Date {reasonCategory === 'Court/Tribunal Order' && '*'}</Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className={validation.errors.orderDate ? 'border-destructive' : ''}
                />
                {validation.errors.orderDate && (
                  <p className="text-xs text-destructive">{validation.errors.orderDate}</p>
                )}
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label className="text-sm">Order Document (Optional)</Label>
              {orderDocumentFile ? (
                <div className="flex items-center gap-2 p-2 border rounded bg-background">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{orderDocumentFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF, DOC, DOCX
              </p>
            </div>
          </div>
        )}

        {/* Client Visible Summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="font-medium">Client-Visible Summary (Optional)</Label>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                If provided, this summary will be visible to the client in their portal. Keep it professional and concise.
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            placeholder="Optional: Enter a brief summary that will be visible to the client..."
            value={clientVisibleSummary}
            onChange={(e) => setClientVisibleSummary(e.target.value)}
            rows={2}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};
