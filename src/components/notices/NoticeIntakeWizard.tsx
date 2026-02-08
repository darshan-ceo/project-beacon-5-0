import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Upload, FileText, User, FolderOpen, Calendar, AlertCircle, Loader2, Key, Eye, EyeOff, Settings, ExternalLink, AlertTriangle, FileWarning } from 'lucide-react';
import { noticeExtractionService } from '@/services/noticeExtractionService';
import { clientsService } from '@/services/clientsService';
import { casesService } from '@/services/casesService';
import { dmsService } from '@/services/dmsService';
import { taskBundleService } from '@/services/taskBundleService';
import { taskBundleTriggerService } from '@/services/taskBundleTriggerService';
import { useToast } from '@/hooks/use-toast';
import { useAppState } from '@/contexts/AppStateContext';
import { resolveDataGaps, type ResolverInput, type ResolverOutput } from '@/lib/notice/dataGapsResolver';
import { useAsmt10Resolver, type ValidationResult } from '@/validation/asmt10Resolver';
import { DataGapsResolver } from './DataGapsResolver';

interface NoticeIntakeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocument?: any;
}

interface WizardStep {
  id: number;
  title: string;
  icon: React.ElementType;
}

export const NoticeIntakeWizard: React.FC<NoticeIntakeWizardProps> = ({
  isOpen,
  onClose,
  initialDocument
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [resolverOutput, setResolverOutput] = useState<ResolverOutput | null>(null);
  const [userOverrides, setUserOverrides] = useState<Record<string, any>>({});
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [createdCase, setCreatedCase] = useState<any>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const { toast } = useToast();
  const { state, dispatch } = useAppState();
  
  // Use the new relaxed validator
  const validationResult = useAsmt10Resolver({
    extraction: extractedData || {},
    confidence: resolverOutput?.gaps.reduce((acc, gap) => {
      acc[gap.path] = gap.confidence;
      return acc;
    }, {} as Record<string, number>) || {},
    user_overrides: userOverrides
  });

  // Check if API key is already configured
  const apiKeyInfo = noticeExtractionService.getAPIKeyInfo();

  const steps: WizardStep[] = [
    { id: 1, title: 'Upload Notice', icon: Upload },
    { id: 2, title: 'Extract Data', icon: FileText },
    { id: 3, title: 'Resolve Gaps', icon: AlertCircle },
    { id: 4, title: 'Match Client', icon: User },
    { id: 5, title: 'Create Case', icon: FolderOpen },
    { id: 6, title: 'Link Document', icon: Calendar },
    { id: 7, title: 'Generate Tasks', icon: CheckCircle }
  ];

  useEffect(() => {
    if (initialDocument && initialDocument instanceof File) {
      setUploadedFile(initialDocument);
      setCurrentStep(2);
    }
  }, [initialDocument]);

  // Auto-trigger client matching when entering Step 4
  useEffect(() => {
    if (currentStep === 4 && !selectedClient && !loading && resolverOutput?.normalized?.taxpayer?.gstin) {
      console.debug('[Wizard] Auto-triggering client match on Step 4');
      handleClientMatch();
    }
  }, [currentStep, selectedClient, loading]);

  // Prefill case data when entering Step 5
  useEffect(() => {
    if (currentStep === 5 && !caseData && selectedClient && resolverOutput?.normalized) {
      console.debug('[Wizard] Auto-filling case data on Step 5');
      const normalized = resolverOutput.normalized;
      // Preserve uppercase for legal form codes in title
      const formType = (normalized.notice_type || normalized.form_type || 'ASMT-10').toUpperCase();
      const noticeNo = (normalized.notice_no || normalized.din || '').toUpperCase();
      const prefilled = {
        title: `${formType} - ${noticeNo}`,
        description: `Notice received for ${normalized.periods?.[0]?.period_label || 'assessment period'}`,
        client_id: selectedClient.id,
        case_type: 'Assessment',
        status: 'Active',
        priority: 'Medium',
        tags: [formType, 'Notice'],
        // Phase 1: GST metadata auto-fill (all uppercase for legal identifiers)
        notice_no: noticeNo,
        form_type: formType,
        section_invoked: (normalized.section_invoked || '').toUpperCase(),
        financial_year: normalized.financial_year || '',
        tax_period: normalized.periods?.[0]?.period_label || '',
        notice_details: {
          notice_type: formType,
          notice_no: noticeNo,
          din: (normalized.din || '').toUpperCase(),
          issue_date: normalized.issue_date,
          due_date: normalized.action?.response_due_date,
          period: normalized.periods?.[0]?.period_label,
          amount: normalized.discrepancy_summary?.total_amount_proposed,
          office: normalized.issuing_authority_office,
          // NEW: Include notice title and section
          notice_title: normalized.notice_title || '',
          section_invoked: (normalized.section_invoked || '').toUpperCase()
        }
      };
      setCaseData(prefilled);
    }
  }, [currentStep, caseData, selectedClient, resolverOutput]);

  // Debug logging for wizard state
  useEffect(() => {
    console.debug('[Wizard] State:', {
      step: currentStep,
      hasFile: !!uploadedFile,
      hasExtracted: !!extractedData,
      canProceed: validationResult.canProceed,
      hasClient: !!selectedClient,
      hasCase: !!createdCase
    });
  }, [currentStep, uploadedFile, extractedData, validationResult, selectedClient, createdCase]);

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

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

    // Validate file is properly loaded (not empty/corrupted)
    if (!file || file.size === 0) {
      toast({
        title: "Invalid file",
        description: "The PDF file appears to be empty or corrupted. Please try uploading again.",
        variant: "destructive",
      });
      return;
    }

    // Clear all previous extraction state when new file is uploaded
    setExtractedData(null);
    setResolverOutput(null);
    setUserOverrides({});
    setSelectedClient(null);
    setCaseData(null);
    setCreatedCase(null);
    
    // Set new file
    setUploadedFile(file);
    toast({
      title: "File uploaded successfully",
      description: `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) is ready for processing.`,
    });
  }, [toast]);

  const handleExtractData = async () => {
    if (!uploadedFile) return;
    
    setLoading(true);
    console.debug('📤 [handleExtractData] Starting extraction...');
    console.debug('  📄 File:', uploadedFile?.name);
    console.debug('  🔑 API Key configured:', apiKeyInfo.hasKeys);
    
    try {
      const result = await noticeExtractionService.extractFromPDF(uploadedFile);
      console.debug('  ✅ [Extraction result]:', { success: result.success, hasData: !!result.data });
      
      // Handle specific errors
      if (result.errorCode === 'INVALID_API_KEY') {
        console.debug('  ❌ [Error] Invalid API key');
        toast({
          title: "Invalid OpenAI API Key",
          description: "Please configure a valid API key to use AI extraction.",
          variant: "destructive",
        });
        setShowApiKeyModal(true);
        setLoading(false);
        return;
      }
      
      if (result.errorCode === 'RATE_LIMIT') {
        console.debug('  ⏱️ [Error] Rate limit exceeded');
        toast({
          title: "Rate Limit Reached",
          description: "OpenAI rate limit exceeded. Please try again in a minute.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      if (result.success && result.data) {
        // Helper to normalize currency amounts (e.g., "2,45,000" → 245000)
        const normalizeAmount = (amt: any): number => {
          if (typeof amt === 'number') return amt;
          if (typeof amt === 'string') {
            const cleaned = amt.replace(/[₹,\s]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        };

        // Map extracted data to validator schema format
        const mappedExtraction = {
          din: result.data.din,
          notice_no: result.data.noticeNo || result.data.din,
          notice_type: (result.data.noticeType || 'ASMT-10').toUpperCase(),
          issue_date: result.data.issueDate || '',
          issuing_authority_office: result.data.office,
          // Notice title from subject
          notice_title: result.data.subject || '',
          // Legal section
          section_invoked: (result.data.legalSection || '').toUpperCase(),
          // Document type detection
          document_type: result.data.documentType || 'main_notice',
          document_type_label: result.data.documentTypeLabel || '',
          taxpayer: {
            gstin: result.data.gstin,
            // Use extracted taxpayer name
            name: result.data.taxpayerName || '',
            tradeName: result.data.tradeName || '',
            pan: result.data.gstin ? result.data.gstin.substring(2, 12) : '',
            address: ''
          },
          periods: result.data.period ? [{
            period_label: result.data.period,
            start_date: '',
            end_date: ''
          }] : [],
          action: {
            response_due_date: result.data.dueDate,
            response_mode: 'GST Portal' // Default suggestion
          },
          discrepancy_summary: {
            // Use normalizeAmount helper to handle "2,45,000" → 245000
            total_amount_proposed: normalizeAmount(result.data.amount)
          },
          // Discrepancy details array
          discrepancies: result.data.discrepancies || []
        };
        
        // Build confidence map (0-1 scale for resolver)
        const confidenceMap: Record<string, number> = {};
        if (result.data.fieldConfidence) {
          Object.entries(result.data.fieldConfidence).forEach(([key, field]) => {
            const confidenceValue = field.confidence / 100; // Convert 0-100 to 0-1
            
            // Map to resolver paths
            if (key === 'din') confidenceMap['/din'] = confidenceValue;
            if (key === 'noticeNo') confidenceMap['/notice_no'] = confidenceValue;
            if (key === 'gstin') confidenceMap['/taxpayer/gstin'] = confidenceValue;
            if (key === 'period') confidenceMap['/periods/0/period_label'] = confidenceValue;
            if (key === 'dueDate') confidenceMap['/action/response_due_date'] = confidenceValue;
            if (key === 'office') confidenceMap['/issuing_authority_office'] = confidenceValue;
            if (key === 'amount') confidenceMap['/discrepancy_summary/total_amount_proposed'] = confidenceValue;
            if (key === 'issueDate') confidenceMap['/issue_date'] = confidenceValue;
          });
        }
        
        // Create UI-ready extracted data with mapped schema and confidence
        const extractedForUI = {
          ...mappedExtraction,
          fieldConfidence: result.data.fieldConfidence,
          rawText: result.data.rawText
        };
        
        console.debug('Notice extraction:', { 
          raw: result.data, 
          mapped: mappedExtraction,
          forUI: extractedForUI,
          errorCode: result.errorCode,
          usedFallback: result.errorCode ? true : false
        });
        
        setExtractedData(extractedForUI);
        
        // Initialize data gaps resolver with mapped data
        const resolverInput: ResolverInput = {
          extraction: mappedExtraction,
          confidence: confidenceMap,
          provenance: {},
          user_overrides: userOverrides
        };
        
        const resolved = resolveDataGaps(resolverInput);
        setResolverOutput(resolved);
        
        // Calculate average confidence from field confidences
        const avgConfidence = Object.keys(confidenceMap).length > 0
          ? Object.values(confidenceMap).reduce((a, b) => a + b, 0) / Object.values(confidenceMap).length
          : (result.confidence || 0) / 100;
        
        toast({
          title: "Data extracted successfully",
          description: `Average confidence: ${Math.round(avgConfidence * 100)}%. ${resolved.gaps.length} gaps identified.`,
        });
        setCurrentStep(3);
      } else {
        toast({
          title: "Extraction failed",
          description: result.error || "Unable to extract data from the notice.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Data extraction error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      let title = 'Extraction failed';
      let description = errorMessage;
      
      // Provide specific guidance based on failure type
      if (errorMessage.includes('empty') || errorMessage.includes('0 bytes')) {
        title = 'File upload issue';
        description = 'The PDF file is empty. Please close the wizard and re-upload the file.';
      } else if (errorMessage.includes('corrupted') || errorMessage.includes('password-protected')) {
        title = 'PDF parsing failed';
        description = 'Could not read the PDF. It may be password-protected or corrupted. Try a different file.';
      } else if (errorMessage.includes('no pages')) {
        title = 'Invalid PDF';
        description = 'The PDF has no pages. Please upload a valid notice document.';
      } else if (errorMessage.includes('INVALID_API_KEY') || errorMessage.includes('API key')) {
        title = 'Invalid API Key';
        description = 'Your OpenAI API key is invalid or expired. Please update it in the configuration panel.';
      } else if (errorMessage.includes('RATE_LIMIT')) {
        title = 'Rate Limit Exceeded';
        description = 'Too many requests. Please wait a moment and try again.';
      }
      
      toast({ title, description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveGaps = () => {
    console.debug('🔍 [handleResolveGaps] Starting...');
    console.debug('  userOverrides:', userOverrides);
    console.debug('  validationResult:', { canProceed: validationResult.canProceed, errors: validationResult.errors });
    
    if (!extractedData || !resolverOutput) return;
    
    // Re-run resolver with current user overrides
    const resolverInput: ResolverInput = {
      extraction: extractedData,
      confidence: resolverOutput.errors.length === 0 ? {} : resolverOutput.gaps.reduce((acc, gap) => {
        acc[gap.path] = gap.confidence;
        return acc;
      }, {} as Record<string, number>),
      user_overrides: userOverrides
    };
    
    const resolved = resolveDataGaps(resolverInput);
    setResolverOutput(resolved);
    
    // Use new validation to check if can proceed (only GSTIN blocks)
    if (validationResult.canProceed) {
      // Merge normalized data from validation
      const mergedData = {
        ...resolved.normalized,
        ...validationResult.normalized
      };
      setExtractedData(mergedData);
      setCurrentStep(4);
      
      const warningCount = validationResult.warnings.length;
      toast({
        title: "Validation Complete",
        description: warningCount > 0 
          ? `${warningCount} intimation${warningCount > 1 ? 's' : ''} logged. You can proceed.`
          : "All data validated successfully.",
      });
    } else {
      // Only GSTIN error blocks
      toast({
        title: "GSTIN Required",
        description: "Please provide a valid 15-character GSTIN to continue.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateField = (path: string, value: any) => {
    console.debug('[handleUpdateField]', { path, value });
    setUserOverrides(prev => ({
      ...prev,
      [path]: value
    }));
  };

  const handleClientMatch = async () => {
    if (!resolverOutput?.normalized?.taxpayer?.gstin) {
      toast({
        title: "Missing GSTIN",
        description: "GSTIN is required to match or create a client.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const gstin = resolverOutput.normalized.taxpayer.gstin;
      
      // Search for existing client by GSTIN from AppStateContext
      const clients = state.clients || [];
      const existingClient = clients.find(client => 
        client.gstin?.toLowerCase() === gstin.toLowerCase()
      );

      if (existingClient) {
        setSelectedClient(existingClient);
        toast({
          title: "Client matched",
          description: `Found existing client: ${existingClient.name}`,
        });
      } else {
        // Create new client from extracted data and persist via clientsService
        const normalized = resolverOutput.normalized;
        // Use extracted taxpayer name, falling back to trade name, then default
        const clientName = normalized.taxpayer?.name || normalized.taxpayer?.tradeName || 'New Client';
        const newClientData = {
          name: clientName,
          gstin: gstin,
          pan: normalized.taxpayer?.pan,
          email: '',
          phone: '',
          address: normalized.taxpayer?.address || '',
          status: 'Active' as const
        };
        
        // Persist client using clientsService
        const createdClient = await clientsService.create(newClientData, dispatch);
        setSelectedClient(createdClient);
        
        toast({
          title: "Client created",
          description: `New client created: ${createdClient.name}`,
        });
      }
      
      setCurrentStep(5);
    } catch (error) {
      console.error('Client matching error:', error);
      toast({
        title: "Client matching error",
        description: "Failed to match or create client.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!selectedClient || !caseData) return;

    // Validate client has ID
    if (!selectedClient.id) {
      toast({
        title: "Client missing ID",
        description: "Cannot create case without a valid client ID.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare case payload for persistence
      const casePayload = {
        ...caseData,
        clientId: selectedClient.id,
        title: caseData.title || `ASMT-10 Case - ${selectedClient.name}`,
        currentStage: caseData.currentStage || 'ASMT-10 Notice Received',
        priority: caseData.priority || 'High',
        status: caseData.status || 'Active'
      };

      // Persist case using casesService (service handles toast notification)
      const persistedCase = await casesService.create(casePayload, dispatch);
      setCreatedCase(persistedCase);
      
      setCurrentStep(6);
    } catch (error) {
      console.error('Case creation error:', error);
      toast({
        title: "Case creation error",
        description: "Failed to create case.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkDocument = async () => {
    if (!uploadedFile || !createdCase) {
      toast({
        title: "Missing required data",
        description: "Cannot link document without uploaded file and created case.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[Wizard] Uploading document to case:', {
        fileName: uploadedFile.name,
        caseId: createdCase.id,
        stage: createdCase.currentStage
      });

      // Upload document using dmsService - this will also trigger task automation
      const uploadResult = await dmsService.files.upload(
        'system',
        uploadedFile,
        {
          caseId: createdCase.id,
          stage: createdCase.currentStage,
          folderId: 'gst-assessment',
          tags: ['ASMT-10', 'Notice', 'Automated'],
        },
        dispatch
      );

      // Handle potential duplicate response
      if (uploadResult && 'isDuplicate' in uploadResult) {
        console.warn('[Wizard] Duplicate document detected, proceeding anyway');
      }

      // Log to timeline
      try {
        const { timelineService } = await import('@/services/timelineService');
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Get authenticated user for proper timeline tracking
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await timelineService.addEntry({
            caseId: createdCase.id,
            type: 'doc_saved',
            title: 'Notice Document Linked',
            description: `${uploadedFile.name} uploaded via Notice Intake Wizard`,
            createdBy: 'System', // Will be converted to actual user UUID in timelineService
            metadata: {
              fileName: uploadedFile.name,
              noticeType: createdCase.noticeType,
              stage: createdCase.currentStage,
              source: 'notice_intake_wizard'
            }
          });
        }
      } catch (error) {
        console.warn('[Wizard] Failed to log timeline entry:', error);
      }

      toast({
        title: "Document linked",
        description: `Notice PDF "${uploadedFile.name}" has been linked to the case.`,
      });
      
      setCurrentStep(7);
    } catch (error: any) {
      console.error('[Wizard] Document linking failed:', error);
      toast({
        title: "Document linking error",
        description: error.message || "Failed to link document to case",
        variant: "destructive",
      });
      // Don't block wizard - allow user to continue and upload manually later
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!createdCase) return;

    setLoading(true);
    try {
      // Trigger task bundle automation for case_created
      const result = await taskBundleTriggerService.triggerTaskBundles(
        {
          id: createdCase.id,
          currentStage: createdCase.currentStage || 'ASMT-10 Notice Received',
          clientId: createdCase.clientId,
          caseNumber: createdCase.caseNumber,
          assignedToId: createdCase.assignedToId || 'emp-1',
          assignedToName: createdCase.assignedToName || 'Current User'
        } as any,
        'case_created',
        createdCase.currentStage || 'ASMT-10 Notice Received',
        dispatch
      );

      console.log('[Wizard] Task automation complete:', result);

      toast({
        title: "Tasks generated",
        description: `${result.totalTasksCreated} automated task(s) created from ${result.createdTasks.length} bundle(s).`,
      });

      // Complete wizard
      onClose();
    } catch (error) {
      console.error('Task generation error:', error);
      toast({
        title: "Task generation error",
        description: error instanceof Error ? error.message : "Failed to generate automated tasks.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 1:
        if (uploadedFile) handleExtractData();
        break;
      case 2:
        if (extractedData) setCurrentStep(3);
        break;
      case 3:
        // Only GSTIN blocks progress - use validation result
        if (validationResult.canProceed) {
          setCurrentStep(4);
        } else {
          handleResolveGaps();
        }
        break;
      case 4:
        // Client matching is auto-triggered by useEffect, just move forward if already matched
        if (selectedClient) {
          setCurrentStep(5);
        }
        break;
      case 5:
        handleCreateCase();
        break;
      case 6:
        handleLinkDocument();
        break;
      case 7:
        handleGenerateTasks();
        break;
      default:
        break;
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* API Key Configuration */}
            <Card className={apiKeyInfo.hasKeys ? "border-green-500/50" : "border-yellow-500/50"}>
              <CardHeader>
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
                    <Label htmlFor="openai-key" className="text-xs">OpenAI API Key (Optional)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="openai-key"
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
                          }
                        }}
                        disabled={!apiKey.trim()}
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Without AI: ~60-70% accuracy. With AI: ~90-95% accuracy + confidence scores
                    </p>
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
                      Remove Key
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="notice-file-input"
              />
              <label htmlFor="notice-file-input" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select or drag and drop your PDF notice
                </p>
              </label>
            </div>
            
            {uploadedFile && (
              <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Badge variant="secondary">PDF</Badge>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Data Extraction Results</h3>
              <p className="text-sm text-muted-foreground">
                Review the extracted information with confidence scores
              </p>
            </div>
            
            {extractedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Extracted Information</span>
                    {extractedData.fieldConfidence && (
                      <Badge variant="secondary" className="text-xs">
                        {apiKeyInfo.hasKeys ? 'AI-Powered OCR' : 'Regex Extraction'}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Helper function to render field with confidence */}
                    {(() => {
                      const renderField = (label: string, value: any, fieldKey?: string) => {
                        const confidence = fieldKey && extractedData.fieldConfidence?.[fieldKey];
                        const confidenceScore = confidence?.confidence || 0;
                        
                        let confidenceColor = 'bg-gray-500';
                        if (confidenceScore >= 85) confidenceColor = 'bg-green-500';
                        else if (confidenceScore >= 70) confidenceColor = 'bg-yellow-500';
                        else if (confidenceScore >= 50) confidenceColor = 'bg-orange-500';
                        else if (confidenceScore > 0) confidenceColor = 'bg-red-500';

                        return (
                          <div key={label} className="flex items-start justify-between p-3 bg-secondary/30 rounded-lg">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">{label}</Label>
                              <p className="text-sm font-mono mt-1">{value || 'Not found'}</p>
                            </div>
                            {confidence && (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-xs font-medium">{confidenceScore}%</p>
                                  <p className="text-xs text-muted-foreground">{confidence.source}</p>
                                </div>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: confidenceColor }}></div>
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <>
                          {renderField('Notice Number', extractedData.notice_no, 'noticeNo')}
                          {renderField('DIN', extractedData.din, 'din')}
                          {renderField('GSTIN', extractedData.taxpayer?.gstin, 'gstin')}
                          {renderField('Issue Date', extractedData.issue_date, 'issueDate')}
                          {renderField('Due Date', extractedData.action?.response_due_date, 'dueDate')}
                          {renderField('Period', extractedData.periods?.[0]?.period_label, 'period')}
                          {renderField('Amount', extractedData.discrepancy_summary?.total_amount_proposed ? `₹${extractedData.discrepancy_summary.total_amount_proposed}` : 'Not found', 'amount')}
                          {renderField('Office', extractedData.issuing_authority_office, 'office')}
                        </>
                      );
                    })()}
                  </div>

                  {extractedData.fieldConfidence && (
                    <Alert>
                      <AlertDescription className="text-xs">
                        <strong>Confidence Legend:</strong> 
                        <span className="ml-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span> 85%+ Excellent
                        </span>
                        <span className="ml-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span> 70-84% Good
                        </span>
                        <span className="ml-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1"></span> 50-69% Fair
                        </span>
                        <span className="ml-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span> &lt;50% Low
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {extractedData.rawText && (
                    <div>
                      <Label className="text-xs">Raw Extracted Text (Preview)</Label>
                      <Textarea 
                        value={extractedData.rawText.substring(0, 500) + (extractedData.rawText.length > 500 ? '...' : '')}
                        readOnly
                        className="text-xs mt-2"
                        rows={6}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {extractedData && (() => {
              // Check if most key fields are empty
              const keyFields = [
                extractedData.din,
                extractedData.taxpayer?.gstin,
                extractedData.notice_no,
                extractedData.issue_date,
                extractedData.action?.response_due_date
              ];
              const emptyCount = keyFields.filter(f => !f || f === 'Not found').length;
              const mostlyEmpty = emptyCount >= 3;
              
              return mostlyEmpty ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Low Extraction Results:</strong> AI/OCR could not detect most key fields from this notice. 
                    You can proceed to manually fill in the required information (especially GSTIN) in the next step.
                  </AlertDescription>
                </Alert>
              ) : null;
            })()}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Resolve Data Gaps</h3>
              <p className="text-sm text-muted-foreground">
                Complete missing or low-confidence information before proceeding
              </p>
            </div>
            
            {/* Annexure Detection Warning */}
            {extractedData?.document_type === 'annexure' && (
              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                <FileWarning className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <strong className="text-yellow-800 dark:text-yellow-400">Annexure Document Detected</strong>
                  <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                    This appears to be <strong>{extractedData.document_type_label || 'an Annexure'}</strong>, not the main notice.
                    Taxpayer details (GSTIN, Name) may not be present. For complete extraction, please upload the main notice document (Form GST DRC-01, ASMT-10, etc.).
                  </p>
                </AlertDescription>
              </Alert>
            )}
            
            {resolverOutput && (
              <DataGapsResolver
                resolverOutput={resolverOutput}
                validationResult={validationResult}
                onUpdateField={handleUpdateField}
                onResolve={handleResolveGaps}
              />
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Client Matching</h3>
              <p className="text-sm text-muted-foreground">
                Match notice to existing client or create new one
              </p>
            </div>
            
            {loading && !selectedClient && (
              <Card>
                <CardContent className="py-8">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Searching for existing client with GSTIN...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {selectedClient && (
              <Card className="border-green-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    {selectedClient.id ? 'Client Matched' : 'New Client Created'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {selectedClient.name}</p>
                    <p><strong>GSTIN:</strong> {selectedClient.gstin}</p>
                    <p><strong>Status:</strong> {selectedClient.status}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Create Case</h3>
              <p className="text-sm text-muted-foreground">
                Set up case with prefilled details from the notice
              </p>
            </div>
            
            {caseData && (
              <Card>
                <CardHeader>
                  <CardTitle>Case Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={caseData.title || ''}
                        onChange={(e) => setCaseData({...caseData, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={caseData.description || ''}
                        onChange={(e) => setCaseData({...caseData, description: e.target.value})}
                        rows={4}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Link Document</h3>
              <p className="text-sm text-muted-foreground">
                Link the uploaded notice to the created case
              </p>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The notice PDF will be uploaded to the case documents and properly organized.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold mb-2">Generate Tasks</h3>
              <p className="text-sm text-muted-foreground">
                Create automated task bundle for ASMT-10 response workflow
              </p>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Ready to generate automated tasks including notice analysis, response preparation, and filing deadlines.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Notice Intake Wizard - {extractedData?.notice_type?.toUpperCase() || 'GST Notice'}
          </DialogTitle>
        </DialogHeader>
        
        <DialogBody>
          {/* Progress indicator - Enhanced Timeline */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                const Icon = step.icon;
                
                return (
                  <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center gap-2 relative">
                      <div className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                        status === 'completed' ? 'bg-green-600 border-green-600 text-white shadow-md' :
                        status === 'current' ? 'border-primary bg-primary/10 text-primary shadow-lg ring-2 ring-primary/20' :
                        'border-muted bg-background text-muted-foreground'
                      }`}>
                        {status === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                        {/* Step number badge */}
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                          status === 'completed' ? 'bg-green-700 text-white' :
                          status === 'current' ? 'bg-primary text-primary-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {step.id}
                        </div>
                      </div>
                      <span className={`text-xs text-center max-w-[70px] leading-tight transition-all ${
                        status === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 transition-all ${
                        status === 'completed' ? 'bg-green-600' :
                        status === 'current' ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <Progress 
              value={(currentStep / steps.length) * 100} 
              className="h-2"
            />
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={loading || 
                     (currentStep === 1 && !uploadedFile) || 
                     (currentStep === 2 && !extractedData) ||
                     (currentStep === 3 && !validationResult.canProceed) ||
                     (currentStep === 6 && !createdCase)}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {currentStep === 3 && !validationResult.canProceed ? 'Validate' : 
             currentStep === 4 && loading ? 'Matching Client...' :
             currentStep === 5 && loading ? 'Creating Case...' :
             currentStep === 5 ? 'Create Case' :
             currentStep === 7 ? 'Complete' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* API Key Configuration Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure OpenAI API Key</DialogTitle>
            <DialogDescription>
              Enter your OpenAI API key for high-accuracy AI extraction (90%+ accuracy)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">OpenAI API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally and never sent to our servers
              </p>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                Don't have an API key?{' '}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Get one from OpenAI
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowApiKeyModal(false);
                setApiKeyInput('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (apiKeyInput.trim()) {
                  noticeExtractionService.setAPIKey(apiKeyInput.trim());
                  setShowApiKeyModal(false);
                  setApiKeyInput('');
                  toast({
                    title: "API Key Configured",
                    description: "AI extraction is now enabled",
                  });
                }
              }}
              disabled={!apiKeyInput.trim()}
            >
              Save Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};