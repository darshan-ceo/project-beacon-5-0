import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppState } from '@/contexts/AppStateContext';
import { toast } from '@/hooks/use-toast';
import { noticeExtractionService, ExtractedNoticeData } from '@/services/noticeExtractionService';
import { casesService } from '@/services/casesService';
import { taskBundleService } from '@/services/taskBundleService';
import { dmsService } from '@/services/dmsService';
import { 
  Upload, 
  FileText, 
  Users, 
  Scale, 
  Link, 
  CheckCircle,
  AlertCircle,
  Edit3,
  Eye,
  ArrowLeft,
  ArrowRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { Separator } from '@/components/ui/separator';

interface NoticeIntakeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocument?: any;
}

interface WizardStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export const NoticeIntakeWizard: React.FC<NoticeIntakeWizardProps> = ({
  isOpen,
  onClose,
  initialDocument
}) => {
  const { state, dispatch } = useAppState();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedNoticeData | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [caseData, setCaseData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as const,
    assignedToId: '',
    assignedToName: ''
  });
  const [createdCase, setCreatedCase] = useState<any>(null);
  const [manualEdit, setManualEdit] = useState(false);

  const steps: WizardStep[] = [
    { id: 1, title: 'Upload Notice', description: 'Select or upload PDF notice document', completed: false },
    { id: 2, title: 'Extract Details', description: 'Extract DIN, GSTIN, and other details', completed: false },
    { id: 3, title: 'Match Client', description: 'Find or create client by GSTIN', completed: false },
    { id: 4, title: 'Create Case', description: 'Set up case with prefilled details', completed: false },
    { id: 5, title: 'Link Documents', description: 'Link notice PDF to the case', completed: false },
    { id: 6, title: 'Generate Tasks', description: 'Create automated task bundle', completed: false }
  ];

  useEffect(() => {
    if (initialDocument) {
      setUploadedFile(initialDocument);
      setCurrentStep(2);
    }
  }, [initialDocument]);

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setCurrentStep(2);
    
    toast({
      title: "File Uploaded",
      description: `${file.name} uploaded successfully.`,
    });
  };

  const handleExtractData = async () => {
    if (!uploadedFile) return;

    setLoading(true);
    try {
      const result = await noticeExtractionService.extractFromPDF(uploadedFile);
      
      if (result.success && result.data) {
        setExtractedData(result.data);
        setCurrentStep(3);
        
        // Prefill case data
        setCaseData(prev => ({
          ...prev,
          title: `ASMT-10 Assessment - ${result.data?.din || 'Unknown DIN'}`,
          description: `Assessment notice for period ${result.data?.period || 'Unknown'} from ${result.data?.office || 'Unknown office'}`
        }));
      } else {
        toast({
          title: "Extraction Failed",
          description: result.error || "Could not extract data from the notice.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Extraction Error",
        description: "An error occurred while extracting data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientMatch = async () => {
    if (!extractedData?.gstin) {
      toast({
        title: "Missing GSTIN",
        description: "GSTIN is required to match clients.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Search for existing client by GSTIN
      const existingClient = state.clients.find(client => 
        client.gstin === extractedData.gstin
      );

      if (existingClient) {
        setSelectedClient(existingClient);
        setCaseData(prev => ({
          ...prev,
          assignedToId: existingClient.id || '',
          assignedToName: existingClient.name
        }));
        setCurrentStep(4);
        
        toast({
          title: "Client Matched",
          description: `Found existing client: ${existingClient.name}`,
        });
      } else {
        // Show client creation dialog or automatically create
        const newClient = {
          name: `Client for GSTIN ${extractedData.gstin}`,
          gstin: extractedData.gstin,
          status: 'Active',
          type: 'Corporate',
          primaryContactName: 'Primary Contact',
          primaryContactEmail: '',
          primaryContactPhone: ''
        };
        
        setSelectedClient(newClient);
        setCurrentStep(4);
        
        toast({
          title: "New Client Created",
          description: "A new client will be created for this GSTIN.",
        });
      }
    } catch (error) {
      toast({
        title: "Client Matching Failed",
        description: "Could not match or create client.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!selectedClient || !extractedData) return;

    setLoading(true);
    try {
      const newCase = await casesService.create({
        ...caseData,
        clientId: selectedClient.id || `client_${Date.now()}`,
        currentStage: 'Scrutiny',
        slaStatus: 'Green',
        caseNumber: `CASE-${Date.now()}`
      }, dispatch);

      setCreatedCase(newCase);
      setCurrentStep(5);
      
      toast({
        title: "Case Created",
        description: `Case ${newCase.caseNumber} created successfully.`,
      });
    } catch (error) {
      toast({
        title: "Case Creation Failed",
        description: "Could not create the case.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkDocument = async () => {
    if (!uploadedFile || !createdCase) return;

    setLoading(true);
    try {
      // Upload and link the document
      await handleDocumentUpload(uploadedFile, {
        caseId: createdCase.id,
        tags: ['Notice', 'ASMT-10', extractedData?.din || ''],
        category: 'Legal Notice'
      });

      setCurrentStep(6);
      
      toast({
        title: "Document Linked",
        description: "Notice PDF linked to the case successfully.",
      });
    } catch (error) {
      toast({
        title: "Document Linking Failed",
        description: "Could not link the document to the case.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (file: File, options: any) => {
    return dmsService.files.upload(file, options, dispatch);
  };

  const handleGenerateTasks = async () => {
    if (!createdCase) return;

    setLoading(true);
    try {
      // Create ASMT-10 specific task bundle
      const tasks = await taskBundleService.triggerTaskBundle(
        'OnStageEnter',
        {
          id: `stage_${Date.now()}`,
          caseId: createdCase.id,
          stageKey: 'Scrutiny',
          cycleNo: 1,
          startedAt: new Date().toISOString(),
          status: 'Active'
        },
        {
          id: createdCase.id,
          caseNumber: createdCase.caseNumber,
          clientId: createdCase.clientId,
          assignedToId: createdCase.assignedToId,
          assignedToName: createdCase.assignedToName
        }
      );

      toast({
        title: "Workflow Complete",
        description: `Notice intake completed. ${tasks.length} tasks created automatically.`,
      });

      // Close wizard and navigate to case
      onClose();
      
    } catch (error) {
      toast({
        title: "Task Generation Failed",
        description: "Could not generate automated tasks.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 2:
        handleExtractData();
        break;
      case 3:
        handleClientMatch();
        break;
      case 4:
        handleCreateCase();
        break;
      case 5:
        handleLinkDocument();
        break;
      case 6:
        handleGenerateTasks();
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
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Notice Document</h3>
              <p className="text-muted-foreground">Select or drag and drop your ASMT-10 notice PDF</p>
            </div>
            
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="notice-file-input"
              />
              <label htmlFor="notice-file-input" className="cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to select or drag and drop your PDF notice
                </p>
              </label>
            </div>
            
            {uploadedFile && (
              <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
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
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Extract Notice Details</h3>
              <p className="text-muted-foreground">AI will extract key information from the notice</p>
            </div>

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Extracting data from notice...</p>
              </div>
            )}

            {extractedData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Extracted Information</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManualEdit(!manualEdit)}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    {manualEdit ? 'View' : 'Edit'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>DIN</Label>
                    {manualEdit ? (
                      <Input
                        value={extractedData.din}
                        onChange={(e) => setExtractedData({...extractedData, din: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-secondary/50 rounded">{extractedData.din || 'Not found'}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>GSTIN</Label>
                    {manualEdit ? (
                      <Input
                        value={extractedData.gstin}
                        onChange={(e) => setExtractedData({...extractedData, gstin: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-secondary/50 rounded">{extractedData.gstin || 'Not found'}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Period</Label>
                    {manualEdit ? (
                      <Input
                        value={extractedData.period}
                        onChange={(e) => setExtractedData({...extractedData, period: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-secondary/50 rounded">{extractedData.period || 'Not found'}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Due Date</Label>
                    {manualEdit ? (
                      <Input
                        value={extractedData.dueDate}
                        onChange={(e) => setExtractedData({...extractedData, dueDate: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-secondary/50 rounded">{extractedData.dueDate || 'Not found'}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Issuing Office</Label>
                    {manualEdit ? (
                      <Input
                        value={extractedData.office}
                        onChange={(e) => setExtractedData({...extractedData, office: e.target.value})}
                      />
                    ) : (
                      <p className="mt-1 p-2 bg-secondary/50 rounded">{extractedData.office || 'Not found'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Match Client</h3>
              <p className="text-muted-foreground">Find existing client or create new one by GSTIN</p>
            </div>

            {extractedData?.gstin && (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="font-medium">GSTIN: {extractedData.gstin}</p>
                {selectedClient && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground">Matched Client:</p>
                    <p className="font-medium">{selectedClient.name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Scale className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Create Case</h3>
              <p className="text-muted-foreground">Set up case with prefilled details</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Case Title</Label>
                <Input
                  id="title"
                  value={caseData.title}
                  onChange={(e) => setCaseData({...caseData, title: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={caseData.description}
                  onChange={(e) => setCaseData({...caseData, description: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stage</Label>
                  <p className="mt-1 p-2 bg-secondary/50 rounded">Scrutiny (Auto-set)</p>
                </div>
                
                <div>
                  <Label>Priority</Label>
                  <select
                    value={caseData.priority}
                    onChange={(e) => setCaseData({...caseData, priority: e.target.value as any})}
                    className="mt-1 w-full p-2 border rounded"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Link className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Link Document</h3>
              <p className="text-muted-foreground">Link notice PDF to the created case</p>
            </div>

            {createdCase && (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="font-medium">Case: {createdCase.caseNumber}</p>
                <p className="text-sm text-muted-foreground">Document will be linked to this case</p>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-success mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generate Tasks</h3>
              <p className="text-muted-foreground">Create automated task bundle for ASMT-10 workflow</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Acknowledge Receipt</p>
                  <p className="text-sm text-muted-foreground">Due in 7 days</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Reconciliation Analysis</p>
                  <p className="text-sm text-muted-foreground">Due in 15 days</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Draft ASMT-11 Reply</p>
                  <p className="text-sm text-muted-foreground">Due in 25 days</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Case from Notice
          </DialogTitle>
          <DialogDescription>
            Automated workflow to create a case from ASMT-10 notice with OCR data extraction
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      getStepStatus(step.id) === 'completed'
                        ? 'bg-success text-success-foreground'
                        : getStepStatus(step.id) === 'current'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {getStepStatus(step.id) === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <p className="text-xs mt-1 text-center max-w-20">{step.title}</p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      getStepStatus(step.id) === 'completed' ? 'bg-success' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[300px]"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious} disabled={loading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {currentStep < steps.length ? (
              <Button 
                onClick={handleNext} 
                disabled={loading || (currentStep === 1 && !uploadedFile)}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {currentStep === 2 ? 'Extract Data' : 
                 currentStep === 3 ? 'Match Client' :
                 currentStep === 4 ? 'Create Case' :
                 currentStep === 5 ? 'Link Document' :
                 'Next'}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={loading}>
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Complete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};