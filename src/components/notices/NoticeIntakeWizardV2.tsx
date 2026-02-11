/**
 * Notice Intake Wizard V2.0
 * Upgraded wizard supporting both New Case creation and Adding to Existing Case
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ModalLayout } from '@/components/ui/modal-layout';
import { 
  CheckCircle, Upload, FileText, User, FolderOpen, Calendar, 
  AlertCircle, Loader2, Key, Eye, EyeOff, ArrowLeft, ArrowRight,
  AlertTriangle, FileWarning, IndianRupee, CheckSquare, ChevronDown, Bug,
  ExternalLink, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { noticeExtractionService } from '@/services/noticeExtractionService';
import { clientsService } from '@/services/clientsService';
import { casesService } from '@/services/casesService';
import { uploadDocument } from '@/services/supabaseDocumentService';
import { stageNoticesService } from '@/services/stageNoticesService';
import { supabase } from '@/integrations/supabase/client';
import { taskBundleTriggerService } from '@/services/taskBundleTriggerService';
import { tasksService } from '@/services/tasksService';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/contexts/AppStateContext';
import { formatFileSize } from '@/utils/formatFileSize';
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

// ── Confidence helper ──────────────────────────────────────────────────
const getConfidenceBadge = (score: number) => {
  if (score >= 0.8) return { label: 'High', className: 'bg-primary/10 text-primary border-primary/30' };
  if (score >= 0.5) return { label: 'Medium', className: 'bg-accent/20 text-accent-foreground border-accent/40' };
  return { label: 'Low', className: 'bg-destructive/10 text-destructive border-destructive/30' };
};

// ── Extracted-field display label mapping ──────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  notice_type: 'Notice Type',
  notice_number: 'Reference No.',
  din: 'DIN',
  notice_date: 'Notice Date',
  due_date: 'Reply Due Date',
  gstin: 'GSTIN',
  taxpayer_name: 'Taxpayer Name',
  trade_name: 'Trade Name',
  section_invoked: 'Section Invoked',
  notice_title: 'Notice Title',
  issuing_authority: 'Issuing Authority',
  issuing_designation: 'Designation',
  financial_year: 'Financial Year',
  tax_period_start: 'Tax Period Start',
  tax_period_end: 'Tax Period End',
  tax_amount: 'Tax Amount',
  interest_amount: 'Interest Amount',
  penalty_amount: 'Penalty Amount',
  total_demand: 'Total Demand',
};

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

  // Debug state
  const [pdfDebugInfo, setPdfDebugInfo] = useState<{
    fileSize: number;
    arrayBufferSize: number | null;
    headerBytes: string;
    workerSrc: string;
  } | null>(null);
  
  const isDebugEnabled = typeof window !== 'undefined' && (
    localStorage.getItem('notice_ocr_debug') === '1' ||
    new URLSearchParams(window.location.search).get('noticeOcrDebug') === '1'
  );

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

  // ── Progress ─────────────────────────────────────────────────────────
  const currentStepIndex = getStepIndex(currentStep);
  const totalSteps = WIZARD_STEPS.length;
  const progressPercent = ((currentStepIndex + 1) / totalSteps) * 100;

  // ── File upload ──────────────────────────────────────────────────────
  const handleFileUpload = useCallback((files: FileList) => {
    if (files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast({ title: "Invalid file type", description: "Please upload a PDF file.", variant: "destructive" });
      return;
    }
    if (!file || file.size === 0) {
      toast({ title: "Invalid file", description: "The PDF file appears to be empty or corrupted.", variant: "destructive" });
      return;
    }
    setExtractedData({});
    setFieldConfidence({});
    setDataConfirmed(false);
    setUploadedFile(file);
    toast({ title: "File uploaded", description: `${file.name} (${formatFileSize(file.size)}) is ready for processing.` });
  }, [toast]);

  // ── Data extraction ──────────────────────────────────────────────────
  const handleExtractData = async () => {
    if (!uploadedFile) return;
    setIsLoading(true);
    try {
      const result = await noticeExtractionService.extractFromPDF(uploadedFile);
      if (result.success && result.data) {
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

        const confidences: Record<string, number> = {};
        if (result.data.fieldConfidence) {
          Object.entries(result.data.fieldConfidence).forEach(([key, field]: [string, any]) => {
            confidences[key] = field.confidence || 0;
          });
        }
        setFieldConfidence(confidences);
        toast({ title: "Data extracted", description: "Review the extracted information and fill any gaps." });
        // Go to extract preview step (Issue 2)
        setCurrentStep('extract');
      } else {
        if (result.errorCode === 'AI_SERVICE_MISCONFIGURED') {
          toast({ title: 'AI OCR unavailable', description: 'AI OCR is temporarily unavailable. Please contact support.', variant: 'destructive' });
        } else {
          toast({ title: 'Extraction failed', description: result.error || 'Unable to extract data.', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let title = 'Extraction failed';
      let description = errorMessage;
      if (errorMessage.includes('empty') || errorMessage.includes('0 bytes')) { title = 'File upload issue'; description = 'The PDF file is empty. Please re-upload.'; }
      else if (errorMessage.includes('scanned PDF') || errorMessage.includes('SCANNED_PDF_NO_OCR')) { title = 'Scanned Notice Detected'; description = 'This notice appears to be scanned. AI OCR could not complete.'; }
      else if (errorMessage.includes('password')) { title = 'Password protected'; description = 'Please remove the password and re-upload.'; }
      else if (errorMessage.includes('browser') || errorMessage.includes('blocking')) { title = 'PDF parser blocked'; description = 'Try Incognito mode or another browser.'; }
      else if (errorMessage.includes('valid PDF') || errorMessage.includes('header')) { title = 'Invalid PDF'; description = 'This doesn\'t appear to be a valid PDF.'; }
      else if (errorMessage.includes('corrupted') || errorMessage.includes('no pages')) { title = 'PDF parsing failed'; description = 'Could not read the PDF. Try a different file.'; }
      else if (errorMessage.includes('INVALID_API_KEY') || errorMessage.includes('API key')) { title = 'Invalid API Key'; description = 'Your OpenAI API key is invalid or expired.'; }
      else if (errorMessage.includes('RATE_LIMIT')) { title = 'Rate Limit Exceeded'; description = 'Please wait a moment and try again.'; }
      toast({ title, description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Field update ─────────────────────────────────────────────────────
  const handleUpdateField = (field: keyof ExtractedNoticeDataV2, value: any) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  // ── Case selection ───────────────────────────────────────────────────
  const handleCaseSelect = (caseId: string, caseData: any) => {
    setSelectedCaseId(caseId);
    setSelectedCase(caseData);
    if (caseData) {
      setClientId(caseData.clientId || '');
      setAssignedToId(caseData.assignedToId || '');
    }
  };

  // ── Create case & notice ─────────────────────────────────────────────
  const handleCreateCaseAndNotice = async () => {
    // ISSUE 1 FIX: robust duplicate guard
    if (createdCaseId) {
      setCurrentStep('stage_tasks');
      return;
    }
    
    setIsLoading(true);
    try {
      let caseId = selectedCaseId;
      let caseNumber = selectedCase?.caseNumber || '';
      
      if (mode === 'new_case') {
        let effectiveClientId = clientId;
        if (!effectiveClientId && extractedData.gstin) {
          const existingClient = (state.clients || []).find(
            (c: any) => c.gstin?.toLowerCase() === extractedData.gstin?.toLowerCase()
          );
          if (existingClient) {
            effectiveClientId = existingClient.id;
          } else {
            const newClient = await clientsService.create({
              name: extractedData.taxpayer_name || 'New Client',
              gstin: extractedData.gstin,
              status: 'Active'
            }, dispatch);
            effectiveClientId = newClient.id;
          }
          setClientId(effectiveClientId);
        }
        
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
          notice_date: extractedData.notice_date || undefined,
          reply_due_date: extractedData.due_date || undefined,
          tax_demand: extractedData.total_demand,
          formType: extractedData.notice_type,
          noticeDate: extractedData.notice_date || undefined,
          replyDueDate: extractedData.due_date || undefined,
          taxDemand: extractedData.total_demand,
          noticeType: extractedData.notice_type,
          assignedToId: assignedToId || undefined
        };
        
        const createdCase = await casesService.create(casePayload, dispatch);
        caseId = createdCase.id;
        caseNumber = createdCase.caseNumber;
        setCreatedCaseId(caseId);
      } else {
        setCreatedCaseId(selectedCaseId);
      }
      
      let stageInstanceId: string | undefined;
      try {
        const { data: activeInstance } = await supabase
          .from('stage_instances')
          .select('id')
          .eq('case_id', caseId)
          .eq('status', 'Active')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        stageInstanceId = activeInstance?.id;
      } catch (err) {
        console.warn('Could not fetch stage instance:', err);
      }

      const noticeInput: CreateStageNoticeInput = {
        case_id: caseId,
        stage_instance_id: stageInstanceId,
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
      
      if (uploadedFile) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
          if (!profile?.tenant_id) throw new Error('No tenant found');

          const result = await uploadDocument(uploadedFile, {
            tenant_id: profile.tenant_id,
            case_id: caseId,
            client_id: clientId || (selectedCase?.clientId) || undefined,
            category: 'Notice',
          });
          setDocumentUploaded(true);

          dispatch({
            type: 'ADD_DOCUMENT',
            payload: {
              id: result.id,
              name: result.file_name,
              type: result.file_type,
              size: result.file_size,
              path: result.file_path,
              caseId: caseId,
              clientId: clientId || (selectedCase?.clientId) || '',
              category: 'Notice',
              uploadedById: user.id,
              uploadedByName: 'User',
              uploadedAt: new Date().toISOString(),
              isShared: false,
              tags: []
            } as any
          });
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

  // ── Fallback task definitions ────────────────────────────────────────
  const STAGE_TASK_DEFINITIONS: Record<string, Array<{ title: string; priority: string }>> = {
    SCN: [
      { title: 'Draft Reply', priority: 'High' },
      { title: 'Collect Supporting Documents', priority: 'Medium' },
      { title: 'Review & Approval', priority: 'High' },
      { title: 'File Response', priority: 'Critical' }
    ],
    Reminder: [
      { title: 'Review Requirements', priority: 'Medium' },
      { title: 'Prepare Response', priority: 'High' },
      { title: 'Submit Compliance', priority: 'High' }
    ],
    Hearing: [
      { title: 'Prepare Hearing Brief', priority: 'High' },
      { title: 'Organize Documents', priority: 'Medium' },
      { title: 'Hearing Attendance', priority: 'Critical' },
      { title: 'Record Proceedings', priority: 'Medium' }
    ],
    Order: [
      { title: 'Analyze Order', priority: 'High' },
      { title: 'Calculate Appeal Timeline', priority: 'Critical' },
      { title: 'Draft Appeal (if applicable)', priority: 'High' },
      { title: 'Compliance Action', priority: 'Medium' }
    ]
  };

  const calculateDueDate = (replyDueDate?: string): string => {
    if (replyDueDate) return replyDueDate;
    const date = new Date();
    let added = 0;
    while (added < 7) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) added++;
    }
    return date.toISOString().split('T')[0];
  };

  // ── Generate tasks ───────────────────────────────────────────────────
  const handleGenerateTasks = async () => {
    if (!createdCaseId) return;
    setIsLoading(true);
    try {
      const caseData = selectedCase || (state.cases || []).find((c: any) => c.id === createdCaseId);
      const currentStage = caseData?.currentStage || 'Assessment';

      let totalCreated = 0;
      try {
        const result = await taskBundleTriggerService.triggerTaskBundles(
          { id: createdCaseId, currentStage, clientId, caseNumber: caseData?.caseNumber || '', assignedToId: assignedToId || 'emp-1', assignedToName: 'Assigned User' },
          mode === 'new_case' ? 'case_created' : 'notice_added',
          currentStage,
          dispatch
        );
        totalCreated = result.totalTasksCreated;
      } catch (e) {
        console.warn('[Wizard] Bundle trigger failed, falling back to stage tasks', e);
      }

      if (totalCreated === 0) {
        const fallbackTasks = STAGE_TASK_DEFINITIONS[stageTag] || [];
        for (const taskDef of fallbackTasks) {
          await tasksService.create({
            title: taskDef.title,
            description: `[Auto-created from Notice Intake Wizard - ${stageTag}]`,
            caseId: createdCaseId,
            clientId,
            caseNumber: caseData?.caseNumber || '',
            stage: currentStage,
            priority: taskDef.priority as any,
            status: 'Not Started',
            assignedToId: assignedToId || 'emp-1',
            assignedToName: 'Assigned User',
            dueDate: calculateDueDate(extractedData.due_date),
            estimatedHours: 8
          } as any, dispatch);
          totalCreated++;
        }
      }

      setTasksCreated(totalCreated);
      toast({ title: "Tasks generated", description: `${totalCreated} task(s) created.` });
      setCurrentStep('completion');
    } catch (error) {
      console.error('Task generation error:', error);
      toast({ title: "Task generation warning", description: "Could not auto-generate tasks. You can add them manually.", variant: "destructive" });
      setCurrentStep('completion');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Navigation ───────────────────────────────────────────────────────
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
        if (!extractedData.notice_type || !extractedData.notice_date || !extractedData.due_date) {
          toast({ title: "Missing required fields", description: "Notice Type, Notice Date, and Due Date are required.", variant: "destructive" });
          return;
        }
        if (mode === 'new_case' && !extractedData.gstin) {
          toast({ title: "GSTIN required", description: "GSTIN is required to create a new case.", variant: "destructive" });
          return;
        }
        setCurrentStep('case_mapping');
        break;
      case 'case_mapping':
        if (mode === 'existing_case' && !selectedCaseId) {
          toast({ title: "Select a case", description: "Please select an existing case to link this notice.", variant: "destructive" });
          return;
        }
        setCurrentStep('timeline_assignment');
        break;
      case 'timeline_assignment':
        setCurrentStep('financial_validation');
        break;
      case 'financial_validation':
        // ISSUE 1 FIX: if case already created, skip directly to stage_tasks
        if (createdCaseId) {
          setCurrentStep('stage_tasks');
          return;
        }
        if (!dataConfirmed) {
          toast({ title: "Confirmation required", description: "Please confirm the notice details are correct.", variant: "destructive" });
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
    if (!prev) return;
    // ISSUE 1 FIX: skip create_link step (has no UI), go straight to financial_validation
    if (prev === 'create_link') {
      setCurrentStep('financial_validation');
      return;
    }
    setCurrentStep(prev);
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
        // If case already created, always allow "Next"
        return createdCaseId ? true : dataConfirmed;
      default:
        return true;
    }
  };

  // ── Button label (ISSUE 1 FIX) ──────────────────────────────────────
  const getNextButtonLabel = (): string => {
    if (currentStep === 'financial_validation') {
      return createdCaseId ? 'Next' : 'Create';
    }
    if (currentStep === 'stage_tasks') return 'Generate Tasks';
    return 'Next';
  };

  // ── PDF preview URL ──────────────────────────────────────────────────
  const pdfPreviewUrl = useMemo(() => {
    if (uploadedFile) return URL.createObjectURL(uploadedFile);
    return null;
  }, [uploadedFile]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  // ── Grouped extracted fields for preview ─────────────────────────────
  const extractedFieldGroups = useMemo(() => {
    const groups = [
      {
        title: 'Notice Identification',
        icon: <FileText className="w-4 h-4" />,
        fields: ['notice_type', 'notice_number', 'din', 'notice_date', 'due_date']
      },
      {
        title: 'Taxpayer Details',
        icon: <User className="w-4 h-4" />,
        fields: ['gstin', 'taxpayer_name', 'trade_name']
      },
      {
        title: 'Legal Classification',
        icon: <AlertCircle className="w-4 h-4" />,
        fields: ['section_invoked', 'notice_title', 'issuing_authority', 'issuing_designation']
      },
      {
        title: 'Period & Financial',
        icon: <IndianRupee className="w-4 h-4" />,
        fields: ['financial_year', 'tax_period_start', 'tax_period_end', 'tax_amount', 'interest_amount', 'penalty_amount', 'total_demand']
      }
    ];
    return groups;
  }, []);

  // ── Render step content ──────────────────────────────────────────────
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
          <div className="space-y-4">
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
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
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
                <p className="text-sm text-muted-foreground">Click to select or drag and drop</p>
              </label>
            </div>

            {uploadedFile && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(uploadedFile.size)}</p>
                  </div>
                  <Badge>PDF</Badge>
                </CardContent>
              </Card>
            )}

            {/* PDF Debug Panel */}
            {uploadedFile && isDebugEnabled && (
              <Collapsible>
                <Card className="border-muted">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="py-2 px-4 flex flex-row items-center gap-2 cursor-pointer hover:bg-muted/50">
                      <Bug className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">PDF Debug Info</span>
                      <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-3 pt-0">
                      <div className="text-xs font-mono bg-muted/50 rounded p-2 space-y-1">
                        <p><strong>file.size:</strong> {uploadedFile.size} bytes</p>
                        <p><strong>file.type:</strong> {uploadedFile.type || '(empty)'}</p>
                        <p><strong>file.name:</strong> {uploadedFile.name}</p>
                        {pdfDebugInfo && (
                          <>
                            <p><strong>arrayBuffer:</strong> {pdfDebugInfo.arrayBufferSize} bytes</p>
                            <p><strong>header:</strong> {pdfDebugInfo.headerBytes}</p>
                            <p><strong>workerSrc:</strong> {pdfDebugInfo.workerSrc.substring(0, 50)}...</p>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs h-6"
                          onClick={async () => {
                            try {
                              const buf = await uploadedFile.arrayBuffer();
                              const header = new Uint8Array(buf.slice(0, 5));
                              const headerStr = String.fromCharCode(...header);
                              const pdfjsLib = await import('pdfjs-dist');
                              setPdfDebugInfo({
                                fileSize: uploadedFile.size,
                                arrayBufferSize: buf.byteLength,
                                headerBytes: headerStr,
                                workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc || '(not set)'
                              });
                            } catch (e) {
                              console.error('Debug info error:', e);
                            }
                          }}
                        >
                          Analyze File
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>
        );

      // ── ISSUE 2: OCR Extract Preview Step ────────────────────────────
      case 'extract':
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Extracted Data Preview</h3>
              <p className="text-sm text-muted-foreground">
                Review AI-extracted fields before editing. Low-confidence fields are highlighted.
              </p>
            </div>

            {/* View PDF button */}
            {pdfPreviewUrl && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pdfPreviewUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Original PDF
                </Button>
              </div>
            )}

            {/* Grouped field cards */}
            {extractedFieldGroups.map((group) => {
              const fieldsWithValues = group.fields.filter(f => {
                const val = (extractedData as any)[f];
                return val !== null && val !== undefined && val !== '';
              });
              const emptyFields = group.fields.filter(f => {
                const val = (extractedData as any)[f];
                return val === null || val === undefined || val === '';
              });

              return (
                <Card key={group.title}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {group.icon}
                      {group.title}
                      <Badge variant="outline" className="ml-auto text-xs">
                        {fieldsWithValues.length}/{group.fields.length} extracted
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {group.fields.map(field => {
                        const value = (extractedData as any)[field];
                        const confidence = fieldConfidence[field];
                        const hasValue = value !== null && value !== undefined && value !== '';
                        const badge = confidence !== undefined ? getConfidenceBadge(confidence) : null;

                        return (
                          <div key={field} className={`flex flex-col py-1 ${!hasValue ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">
                                {FIELD_LABELS[field] || field}
                              </span>
                              {badge && (
                                <span className={`text-[10px] px-1.5 py-0 rounded-full border ${badge.className}`}>
                                  {badge.label}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-medium truncate">
                              {hasValue ? (
                                typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : String(value)
                              ) : (
                                <span className="italic text-muted-foreground">Not extracted</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {emptyFields.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {emptyFields.length} field(s) not extracted — you can fill them in the next step.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Overall confidence summary */}
            {Object.keys(fieldConfidence).length > 0 && (
              <Alert>
                <AlertDescription className="text-xs flex items-center gap-2">
                  {(() => {
                    const scores = Object.values(fieldConfidence);
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                    if (avg >= 0.8) return <><ShieldCheck className="w-4 h-4 text-primary" /> High overall confidence — extraction looks reliable.</>;
                    if (avg >= 0.5) return <><AlertTriangle className="w-4 h-4 text-accent-foreground" /> Medium confidence — please verify highlighted fields.</>;
                    return <><ShieldAlert className="w-4 h-4 text-destructive" /> Low confidence — manual verification strongly recommended.</>;
                  })()}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'resolve_gaps':
        return (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Verify Extracted Data</h3>
              <p className="text-sm text-muted-foreground">Review and correct the extracted information</p>
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
          <div className="space-y-4">
            {mode === 'existing_case' ? (
              <CaseSearchPanel
                selectedCaseId={selectedCaseId}
                onCaseSelect={handleCaseSelect}
                extractedGstin={extractedData.gstin}
              />
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">New Case Details</h3>
                  <p className="text-sm text-muted-foreground">A new case will be created with these details</p>
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
          <div className="space-y-4">
            <div className="text-center mb-2">
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
                        {(state.employees || []).filter((member: any) => member.status === 'Active' || !member.status).map((member: any) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name || member.fullName || member.name || 'Unnamed'}
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
            confirmed={createdCaseId ? true : dataConfirmed}
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

  // ── Footer buttons ───────────────────────────────────────────────────
  const footer = (
    <div className="flex items-center w-full">
      {/* Left: Back button */}
      <div className="flex-1">
        {currentStep !== 'entry_decision' && currentStep !== 'completion' && (
          <Button variant="outline" onClick={handlePrevious} disabled={isLoading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
      </div>
      {/* Right: Next / Create / Done */}
      <div>
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
            {getNextButtonLabel()}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Notice Intake Wizard"
      description={currentStepConfig?.description || 'Process GST notices with AI-powered extraction'}
      icon={<FileText className="h-5 w-5" />}
      footer={footer}
      maxWidth="max-w-2xl"
    >
      {/* Mode badge */}
      {mode && (
        <div className="flex justify-center mb-2">
          <Badge variant="outline">
            {mode === 'new_case' ? 'New Case' : 'Add to Existing'}
          </Badge>
        </div>
      )}

      {/* Progress */}
      <div className="space-y-2 pb-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Step {currentStepIndex + 1} of {totalSteps}</span>
          <span>{currentStepConfig?.title}</span>
        </div>
        <Progress value={progressPercent} className="h-1" />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Processing...</p>
        </div>
      ) : (
        renderStepContent()
      )}
    </ModalLayout>
  );
};
