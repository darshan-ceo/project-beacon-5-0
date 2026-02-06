/**
 * Notice Intake Wizard V2.0
 * Upgraded wizard supporting both New Case creation and Adding to Existing Case
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, Upload, FileText, User, FolderOpen, Calendar, 
  AlertCircle, Loader2, Key, Eye, EyeOff, ArrowLeft, ArrowRight,
  AlertTriangle, FileWarning, IndianRupee, CheckSquare
} from 'lucide-react';
import { noticeExtractionService } from '@/services/noticeExtractionService';
import { clientsService } from '@/services/clientsService';
import { casesService } from '@/services/casesService';
import { dmsService } from '@/services/dmsService';
import { stageNoticesService } from '@/services/stageNoticesService';
import { taskBundleTriggerService } from '@/services/taskBundleTriggerService';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/contexts/AppStateContext';
import { 
  WizardMode, WizardStep, WIZARD_STEPS, getInitialWizardState, 
  getStepIndex, getNextStep, getPreviousStep, ExtractedNoticeDataV2, NoticeStageTag
} from './wizard/types';
import { EntryDecisionStep } from './wizard/EntryDecisionStep';
import { CaseSearchPanel } from './wizard/CaseSearchPanel';
import { FinancialValidationStep } from './wizard/FinancialValidationStep';
import { StageAwarenessStep } from './wizard/StageAwarenessStep';
import { CompletionStep } from './wizard/CompletionStep';
import type { CreateStageNoticeInput } from '@/types/stageWorkflow';

interface NoticeIntakeWizardV2Props {
  isOpen: boolean;
  onClose: () => void;
  initialDocument?: File;
}

export const NoticeIntakeWizardV2: React.FC<NoticeIntakeWizardV2Props> = ({
  isOpen,
  onClose,
  initialDocument
}) => {
  const { toast } = useToast();
  const { state, dispatch } = useAppState();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('entry_decision');
  const [mode, setMode] = useState<WizardMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // File & extraction state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<ExtractedNoticeDataV2>>({});
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, number>>({});
  
  // Case state
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [clientId, setClientId] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  
  // Stage & tasks
  const [stageTag, setStageTag] = useState<NoticeStageTag>('SCN');
  const [internalNotes, setInternalNotes] = useState('');
  const [legalObservations, setLegalObservations] = useState('');
  const [dataConfirmed, setDataConfirmed] = useState(false);
  
  // Results
  const [createdCaseId, setCreatedCaseId] = useState<string>('');
  const [createdNoticeId, setCreatedNoticeId] = useState<string>('');
  const [tasksCreated, setTasksCreated] = useState(0);
  const [documentUploaded, setDocumentUploaded] = useState(false);

  // API Key config
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const apiKeyInfo = noticeExtractionService.getAPIKeyInfo();

  // Reset wizard on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('entry_decision');
      setMode(null);
      setUploadedFile(null);
      setExtractedData({});
      setFieldConfidence({});
      setSelectedCaseId('');
      setSelectedCase(null);
      setClientId('');
      setAssignedToId('');
      setStageTag('SCN');
      setDataConfirmed(false);
      setCreatedCaseId('');
      setCreatedNoticeId('');
      setTasksCreated(0);
      setDocumentUploaded(false);
    }
  }, [isOpen]);

  // Handle initial document
  useEffect(() => {
    if (initialDocument && isOpen) {
      setUploadedFile(initialDocument);
      if (mode) {
        setCurrentStep('extract');
      }
    }
  }, [initialDocument, isOpen, mode]);

  // Get step progress
  const currentStepIndex = getStepIndex(currentStep);
  const totalSteps = WIZARD_STEPS.length;
  const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;

  // Handle file upload
  const handleFileUpload = useCallback((files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Clear previous state
    setExtractedData({});
    setFieldConfidence({});
    setDataConfirmed(false);
    
    setUploadedFile(file);
    toast({
      title: "File uploaded",
      description: `${file.name} is ready for processing.`,
    });
  }, [toast]);

  // Handle data extraction
  const handleExtractData = async () => {
    if (!uploadedFile) return;
    
    setIsLoading(true);
    try {
      const result = await noticeExtractionService.extractFromPDF(uploadedFile);
      
      if (result.success && result.data) {
        // Map to V2 format
        const mapped: Partial<ExtractedNoticeDataV2> = {
          notice_type: result.data.noticeType || 'ASMT-10',
          notice_number: result.data.noticeNo || result.data.din || '',
          din: result.data.din || '',
          notice_date: result.data.issueDate || '',
          due_date: result.data.dueDate || '',
          gstin: result.data.gstin || '',
          taxpayer_name: result.data.taxpayerName || '',
          trade_name: result.data.tradeName || '',
          section_invoked: result.data.legalSection || '',
          notice_title: result.data.subject || '',
          issuing_authority: result.data.office || '',
          financial_year: result.data.period || '',
          tax_amount: parseFloat(result.data.amount?.replace(/[₹,\s]/g, '') || '0') || null,
          interest_amount: null,
          penalty_amount: null,
          tax_applicable: true,
          interest_applicable: true,
          penalty_applicable: true,
          total_demand: parseFloat(result.data.amount?.replace(/[₹,\s]/g, '') || '0') || null,
          document_type: result.data.documentType as any || 'main_notice'
        };
        
        setExtractedData(mapped);
        
        // Extract confidence scores
        const confidences: Record<string, number> = {};
        if (result.data.fieldConfidence) {
          Object.entries(result.data.fieldConfidence).forEach(([key, field]: [string, any]) => {
            confidences[key] = field.confidence || 0;
          });
        }
        setFieldConfidence(confidences);
        
        toast({
          title: "Data extracted",
          description: "Review the extracted information and fill any gaps.",
        });
        
        setCurrentStep('resolve_gaps');
      } else {
        toast({
          title: "Extraction failed",
          description: result.error || "Unable to extract data from the notice.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: "Extraction error",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update extracted field
  const handleUpdateField = (field: keyof ExtractedNoticeDataV2, value: any) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  // Handle case selection (existing case mode)
  const handleCaseSelect = (caseId: string, caseData: any) => {
    setSelectedCaseId(caseId);
    setSelectedCase(caseData);
    if (caseData) {
      setClientId(caseData.clientId || '');
      setAssignedToId(caseData.assignedToId || '');
    }
  };

  // Create case and notice
  const handleCreateCaseAndNotice = async () => {
    setIsLoading(true);
    try {
      let caseId = selectedCaseId;
      let caseNumber = selectedCase?.caseNumber || '';
      
      // For new case mode, create the case first
      if (mode === 'new_case') {
        // Find or create client by GSTIN
        let effectiveClientId = clientId;
        
        if (!effectiveClientId && extractedData.gstin) {
          const existingClient = (state.clients || []).find(
            (c: any) => c.gstin?.toLowerCase() === extractedData.gstin?.toLowerCase()
          );
          
          if (existingClient) {
            effectiveClientId = existingClient.id;
          } else {
            // Create new client
            const newClient = await clientsService.create({
              name: extractedData.taxpayer_name || 'New Client',
              gstin: extractedData.gstin,
              status: 'Active'
            }, dispatch);
            effectiveClientId = newClient.id;
          }
          setClientId(effectiveClientId);
        }
        
        // Create case
        const casePayload: any = {
          clientId: effectiveClientId,
          title: `${extractedData.notice_type} - ${extractedData.notice_number}`,
          currentStage: 'Assessment',
          priority: priority,
          status: 'Active',
          noticeNo: extractedData.notice_number,
          form_type: extractedData.notice_type,
          section_invoked: extractedData.section_invoked,
          financial_year: extractedData.financial_year,
          notice_date: extractedData.notice_date,
          reply_due_date: extractedData.due_date,
          tax_demand: extractedData.total_demand,
          assignedToId: assignedToId || undefined
        };
        
        const createdCase = await casesService.create(casePayload, dispatch);
        caseId = createdCase.id;
        caseNumber = createdCase.caseNumber;
        setCreatedCaseId(caseId);
      } else {
        setCreatedCaseId(selectedCaseId);
      }
      
      // Create stage notice
      const noticeInput: CreateStageNoticeInput = {
        case_id: caseId,
        notice_type: extractedData.notice_type,
        notice_number: extractedData.notice_number,
        offline_reference_no: extractedData.offline_reference_no,
        notice_date: extractedData.notice_date,
        due_date: extractedData.due_date,
        issuing_authority: extractedData.issuing_authority,
        issuing_designation: extractedData.issuing_designation,
        section_invoked: extractedData.section_invoked,
        tax_period_start: extractedData.tax_period_start,
        tax_period_end: extractedData.tax_period_end,
        financial_year: extractedData.financial_year,
        tax_amount: extractedData.tax_amount,
        interest_amount: extractedData.interest_amount,
        penalty_amount: extractedData.penalty_amount,
        tax_applicable: extractedData.tax_applicable,
        interest_applicable: extractedData.interest_applicable,
        penalty_applicable: extractedData.penalty_applicable,
        amount_demanded: extractedData.total_demand,
        workflow_step: 'notice',
        is_original: mode === 'new_case',
        metadata: {
          source: 'notice_intake_wizard_v2',
          stage_tag: stageTag,
          internal_notes: internalNotes,
          legal_observations: legalObservations
        }
      };
      
      const createdNotice = await stageNoticesService.createNotice(noticeInput);
      if (createdNotice) {
        setCreatedNoticeId(createdNotice.id);
      }
      
      // Upload document
      if (uploadedFile) {
        try {
          await dmsService.files.upload(
            'system',
            uploadedFile,
            {
              caseId: caseId,
              stage: 'Assessment',
              folderId: 'gst-notices',
              tags: [extractedData.notice_type || 'Notice', 'Wizard-Upload']
            },
            dispatch
          );
          setDocumentUploaded(true);
        } catch (err) {
          console.warn('Document upload failed:', err);
        }
      }
      
      toast({
        title: mode === 'new_case' ? "Case created" : "Notice added",
        description: `Successfully ${mode === 'new_case' ? 'created case' : 'linked notice'} ${caseNumber}`,
      });
      
      setCurrentStep('stage_tasks');
    } catch (error) {
      console.error('Creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create case/notice.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate tasks
  const handleGenerateTasks = async () => {
    if (!createdCaseId) return;
    
    setIsLoading(true);
    try {
      const caseData = selectedCase || (state.cases || []).find((c: any) => c.id === createdCaseId);
      
      const result = await taskBundleTriggerService.triggerTaskBundles(
        {
          id: createdCaseId,
          currentStage: caseData?.currentStage || 'Assessment',
          clientId: clientId,
          caseNumber: caseData?.caseNumber || '',
          assignedToId: assignedToId || 'emp-1',
          assignedToName: 'Assigned User'
        },
        mode === 'new_case' ? 'case_created' : 'notice_added',
        caseData?.currentStage || 'Assessment',
        dispatch
      );
      
      setTasksCreated(result.totalTasksCreated);
      
      toast({
        title: "Tasks generated",
        description: `${result.totalTasksCreated} task(s) created.`,
      });
      
      setCurrentStep('completion');
    } catch (error) {
      console.error('Task generation error:', error);
      toast({
        title: "Task generation warning",
        description: "Could not auto-generate tasks. You can add them manually.",
        variant: "destructive",
      });
      setCurrentStep('completion');
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation
  const handleNext = () => {
    if (!mode) return;
    
    switch (currentStep) {
      case 'entry_decision':
        setCurrentStep('upload');
        break;
      case 'upload':
        if (uploadedFile) handleExtractData();
        break;
      case 'extract':
        setCurrentStep('resolve_gaps');
        break;
      case 'resolve_gaps':
        // Validate mandatory fields
        if (!extractedData.notice_type || !extractedData.notice_date || !extractedData.due_date) {
          toast({
            title: "Missing required fields",
            description: "Notice Type, Notice Date, and Due Date are required.",
            variant: "destructive",
          });
          return;
        }
        if (mode === 'new_case' && !extractedData.gstin) {
          toast({
            title: "GSTIN required",
            description: "GSTIN is required to create a new case.",
            variant: "destructive",
          });
          return;
        }
        setCurrentStep('case_mapping');
        break;
      case 'case_mapping':
        if (mode === 'existing_case' && !selectedCaseId) {
          toast({
            title: "Select a case",
            description: "Please select an existing case to link this notice.",
            variant: "destructive",
          });
          return;
        }
        setCurrentStep('timeline_assignment');
        break;
      case 'timeline_assignment':
        setCurrentStep('financial_validation');
        break;
      case 'financial_validation':
        if (!dataConfirmed) {
          toast({
            title: "Confirmation required",
            description: "Please confirm the notice details are correct.",
            variant: "destructive",
          });
          return;
        }
        handleCreateCaseAndNotice();
        break;
      case 'create_link':
        setCurrentStep('stage_tasks');
        break;
      case 'stage_tasks':
        handleGenerateTasks();
        break;
      case 'completion':
        onClose();
        break;
    }
  };

  const handlePrevious = () => {
    if (!mode) return;
    const prev = getPreviousStep(currentStep, mode);
    if (prev) setCurrentStep(prev);
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'entry_decision':
        return !!mode;
      case 'upload':
        return !!uploadedFile;
      case 'resolve_gaps':
        return !!(extractedData.notice_type && extractedData.notice_date && extractedData.due_date);
      case 'case_mapping':
        return mode === 'new_case' ? true : !!selectedCaseId;
      case 'financial_validation':
        return dataConfirmed;
      default:
        return true;
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'entry_decision':
        return (
          <EntryDecisionStep
            selectedMode={mode}
            onModeSelect={(m) => setMode(m)}
          />
        );

      case 'upload':
        return (
          <div className="space-y-6">
            {/* API Key Config */}
            <Card className={apiKeyInfo.hasKeys ? "border-primary/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  AI/OCR Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertDescription className="text-xs">
                    {apiKeyInfo.instructions}
                  </AlertDescription>
                </Alert>
                
                {!apiKeyInfo.hasKeys && (
                  <div className="space-y-2">
                    <Label className="text-xs">OpenAI API Key (Optional)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          placeholder="sk-..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="text-xs pr-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-2"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (apiKey.trim()) {
                            noticeExtractionService.setAPIKey(apiKey.trim());
                            setApiKey('');
                            toast({ title: "API Key saved" });
                          }
                        }}
                        disabled={!apiKey.trim()}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
                
                {apiKeyInfo.hasKeys && (
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      OpenAI Vision Active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        noticeExtractionService.clearAPIKey();
                        window.location.reload();
                      }}
                      className="text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="wizard-file-input"
              />
              <label htmlFor="wizard-file-input" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-1">Upload Notice PDF</p>
                <p className="text-sm text-muted-foreground">
                  Click to select or drag and drop
                </p>
              </label>
            </div>

            {uploadedFile && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Badge>PDF</Badge>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'resolve_gaps':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Verify Extracted Data</h3>
              <p className="text-sm text-muted-foreground">
                Review and correct the extracted information
              </p>
            </div>

            {/* Mandatory Fields */}
            <Card className="border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Required Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Notice Type *</Label>
                    <Select
                      value={extractedData.notice_type || ''}
                      onValueChange={(v) => handleUpdateField('notice_type', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ASMT-10">ASMT-10</SelectItem>
                        <SelectItem value="ASMT-11">ASMT-11</SelectItem>
                        <SelectItem value="ASMT-12">ASMT-12</SelectItem>
                        <SelectItem value="DRC-01">DRC-01</SelectItem>
                        <SelectItem value="DRC-01A">DRC-01A</SelectItem>
                        <SelectItem value="DRC-03">DRC-03</SelectItem>
                        <SelectItem value="DRC-07">DRC-07</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Notice Reference No *</Label>
                    <Input
                      value={extractedData.notice_number || ''}
                      onChange={(e) => handleUpdateField('notice_number', e.target.value)}
                      placeholder="Reference number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Notice Date *</Label>
                    <Input
                      type="date"
                      value={extractedData.notice_date || ''}
                      onChange={(e) => handleUpdateField('notice_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reply Due Date *</Label>
                    <Input
                      type="date"
                      value={extractedData.due_date || ''}
                      onChange={(e) => handleUpdateField('due_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  {mode === 'new_case' && (
                    <div className="col-span-2">
                      <Label className="text-xs">GSTIN * (for client matching)</Label>
                      <Input
                        value={extractedData.gstin || ''}
                        onChange={(e) => handleUpdateField('gstin', e.target.value.toUpperCase())}
                        placeholder="15-character GSTIN"
                        className="mt-1 font-mono"
                        maxLength={15}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Optional Fields */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Additional Information (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Taxpayer Name</Label>
                    <Input
                      value={extractedData.taxpayer_name || ''}
                      onChange={(e) => handleUpdateField('taxpayer_name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Section Invoked</Label>
                    <Input
                      value={extractedData.section_invoked || ''}
                      onChange={(e) => handleUpdateField('section_invoked', e.target.value)}
                      placeholder="e.g., Section 73"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Financial Year</Label>
                    <Input
                      value={extractedData.financial_year || ''}
                      onChange={(e) => handleUpdateField('financial_year', e.target.value)}
                      placeholder="e.g., 2023-24"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Issuing Authority</Label>
                    <Input
                      value={extractedData.issuing_authority || ''}
                      onChange={(e) => handleUpdateField('issuing_authority', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'case_mapping':
        return (
          <div className="space-y-6">
            {mode === 'existing_case' ? (
              <CaseSearchPanel
                selectedCaseId={selectedCaseId}
                onCaseSelect={handleCaseSelect}
                extractedGstin={extractedData.gstin}
              />
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">New Case Details</h3>
                  <p className="text-sm text-muted-foreground">
                    A new case will be created with these details
                  </p>
                </div>
                
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Case Type</Label>
                        <Input value="GST" disabled className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Client (from GSTIN)</Label>
                        <Input 
                          value={extractedData.taxpayer_name || extractedData.gstin || 'Will be matched'} 
                          disabled 
                          className="mt-1" 
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Case Title</Label>
                      <Input 
                        value={`${extractedData.notice_type} - ${extractedData.notice_number}`} 
                        disabled 
                        className="mt-1" 
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      case 'timeline_assignment':
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Timeline & Assignment</h3>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Reply Due Date</Label>
                    <Input
                      type="date"
                      value={extractedData.due_date || ''}
                      onChange={(e) => handleUpdateField('due_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {mode === 'new_case' && (
                  <div>
                    <Label className="text-xs">Assign To</Label>
                    <Select value={assignedToId} onValueChange={setAssignedToId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {(state.employees || []).map((member: any) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {extractedData.due_date && (
                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {(() => {
                        const dueDate = new Date(extractedData.due_date);
                        const today = new Date();
                        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays < 0) return `⚠️ Overdue by ${Math.abs(diffDays)} days`;
                        if (diffDays === 0) return `⚠️ Due today`;
                        return `${diffDays} days remaining`;
                      })()}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'financial_validation':
        return (
          <FinancialValidationStep
            extractedData={extractedData}
            onUpdateField={handleUpdateField}
            confirmed={dataConfirmed}
            onConfirmChange={setDataConfirmed}
          />
        );

      case 'stage_tasks':
        return (
          <StageAwarenessStep
            stageTag={stageTag}
            onStageTagChange={setStageTag}
            wizardMode={mode!}
            tasksToGenerate={[]}
          />
        );

      case 'completion':
        return (
          <CompletionStep
            mode={mode!}
            caseNumber={selectedCase?.caseNumber || ''}
            caseId={createdCaseId}
            noticeNumber={extractedData.notice_number || ''}
            noticeId={createdNoticeId}
            tasksCreated={tasksCreated}
            documentUploaded={documentUploaded}
            internalNotes={internalNotes}
            legalObservations={legalObservations}
            onNotesChange={setInternalNotes}
            onObservationsChange={setLegalObservations}
            onViewCase={() => {
              onClose();
              // Navigate to case - would need router
            }}
            onAddAnotherNotice={() => {
              setCurrentStep('entry_decision');
              setUploadedFile(null);
              setExtractedData({});
              setCreatedCaseId('');
              setCreatedNoticeId('');
            }}
            onClose={onClose}
          />
        );

      default:
        return null;
    }
  };

  const currentStepConfig = WIZARD_STEPS.find(s => s.id === currentStep);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notice Intake Wizard
            {mode && (
              <Badge variant="outline" className="ml-2">
                {mode === 'new_case' ? 'New Case' : 'Add to Existing'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentStepConfig?.description || 'Process GST notices with AI-powered extraction'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {currentStepIndex + 1} of {totalSteps}</span>
            <span>{currentStepConfig?.title}</span>
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>

        <DialogBody className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Processing...</p>
            </div>
          ) : (
            renderStepContent()
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          {currentStep !== 'entry_decision' && currentStep !== 'completion' && (
            <Button variant="outline" onClick={handlePrevious} disabled={isLoading}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          {currentStep === 'completion' ? (
            <Button onClick={onClose}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isLoading || !canGoNext()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {currentStep === 'financial_validation' ? 'Create' : 
               currentStep === 'stage_tasks' ? 'Generate Tasks' : 'Next'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
