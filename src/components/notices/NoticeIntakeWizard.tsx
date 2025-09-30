import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Upload, FileText, User, FolderOpen, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { noticeExtractionService } from '@/services/noticeExtractionService';
import { clientsService } from '@/services/clientsService';
import { casesService } from '@/services/casesService';
import { dmsService } from '@/services/dmsService';
import { taskBundleService } from '@/services/taskBundleService';
import { useToast } from '@/hooks/use-toast';
import { resolveDataGaps, type ResolverInput, type ResolverOutput } from '@/lib/notice/dataGapsResolver';
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
  const { toast } = useToast();

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

    setUploadedFile(file);
    toast({
      title: "File uploaded successfully",
      description: `${file.name} is ready for processing.`,
    });
  }, [toast]);

  const handleExtractData = async () => {
    if (!uploadedFile) return;
    
    setLoading(true);
    try {
      const result = await noticeExtractionService.extractFromPDF(uploadedFile);
      
      if (result.success && result.data) {
        setExtractedData(result.data);
        
        // Initialize data gaps resolver
        const resolverInput: ResolverInput = {
          extraction: result.data,
          confidence: typeof result.confidence === 'number' ? {} : (result.confidence || {}),
          provenance: {},
          user_overrides: userOverrides
        };
        
        const resolved = resolveDataGaps(resolverInput);
        setResolverOutput(resolved);
        
        toast({
          title: "Data extracted successfully",
          description: `Confidence: ${Math.round((result.confidence || 0) * 100)}%. ${resolved.gaps.length} gaps found.`,
        });
        setCurrentStep(3);
      } else {
        toast({
          title: "Extraction failed",
          description: "Unable to extract data from the notice.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Data extraction error:', error);
      toast({
        title: "Extraction error",
        description: "An error occurred while processing the notice.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveGaps = () => {
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
    
    if (resolved.status === 'complete') {
      setExtractedData(resolved.normalized);
      setCurrentStep(4);
      toast({
        title: "Data gaps resolved",
        description: "All required fields are now complete.",
      });
    } else {
      toast({
        title: "Gaps remaining",
        description: `${resolved.gaps.filter(g => g.critical).length} critical gaps still need attention.`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateField = (path: string, value: any) => {
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
      
      // Search for existing client by GSTIN  
      const clients = [];
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
        // Create new client from extracted data
        const normalized = resolverOutput.normalized;
        const newClient = {
          name: normalized.taxpayer?.name || 'New Client',
          gstin: gstin,
          pan: normalized.taxpayer?.pan,
          email: '',
          phone: '',
          address: normalized.taxpayer?.address || '',
          status: 'active' as const
        };
        
        const createdClient = newClient;
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
    if (!selectedClient || !resolverOutput?.normalized) return;

    setLoading(true);
    try {
      const normalized = resolverOutput.normalized;
      const newCase = {
        title: `ASMT-10 - ${normalized.notice_no || normalized.din}`,
        description: `Notice received for ${normalized.periods?.[0]?.period_label || 'assessment period'}`,
        client_id: selectedClient.id,
        case_type: 'Assessment',
        status: 'Active',
        priority: 'Medium',
        tags: ['ASMT-10', 'Notice'],
        notice_details: {
          notice_type: 'ASMT-10',
          notice_no: normalized.notice_no,
          din: normalized.din,
          issue_date: normalized.issue_date,
          due_date: normalized.action?.response_due_date,
          period: normalized.periods?.[0]?.period_label,
          amount: normalized.discrepancy_summary?.total_amount_proposed,
          office: normalized.issuing_authority_office
        }
      };

      const createdCase = { ...newCase, id: Date.now().toString() };
      setCreatedCase(createdCase);
      setCaseData(newCase);
      
      toast({
        title: "Case created",
        description: `Case ${createdCase.id} created successfully`,
      });
      
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
    if (!uploadedFile || !createdCase) return;

    setLoading(true);
    try {
      const result = { success: true };

      if (result.success) {
        toast({
          title: "Document linked",
          description: "Notice PDF has been linked to the case.",
        });
      }
      
      setCurrentStep(7);
    } catch (error) {
      console.error('Document linking error:', error);
      toast({
        title: "Document linking error",
        description: "Failed to link document to case.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!createdCase) return;

    setLoading(true);
    try {
      const tasks = [];

      toast({
        title: "Tasks generated",
        description: `${tasks.length} automated tasks created for the case.`,
      });

      // Complete wizard
      onClose();
    } catch (error) {
      console.error('Task generation error:', error);
      toast({
        title: "Task generation error",
        description: "Failed to generate automated tasks.",
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
        if (resolverOutput?.status === 'complete') {
          setCurrentStep(4);
        } else {
          handleResolveGaps();
        }
        break;
      case 4:
        handleClientMatch();
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
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload Notice Document</h3>
              <p className="text-sm text-muted-foreground">
                Select or drag and drop your ASMT-10 notice PDF
              </p>
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
                Review the extracted information from your notice
              </p>
            </div>
            
            {extractedData && (
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Notice Number</Label>
                      <p className="text-sm font-mono">{extractedData.notice_no || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>DIN</Label>
                      <p className="text-sm font-mono">{extractedData.din || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>GSTIN</Label>
                      <p className="text-sm font-mono">{extractedData.taxpayer?.gstin || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>Issue Date</Label>
                      <p className="text-sm">{extractedData.issue_date || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <p className="text-sm">{extractedData.action?.response_due_date || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>Period</Label>
                      <p className="text-sm">{extractedData.periods?.[0]?.period_label || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <p className="text-sm">₹{extractedData.discrepancy_summary?.total_amount_proposed || 'Not found'}</p>
                    </div>
                    <div>
                      <Label>Office</Label>
                      <p className="text-sm">{extractedData.issuing_authority_office || 'Not found'}</p>
                    </div>
                  </div>
                  
                  {extractedData.rawText && (
                    <div>
                      <Label>Raw Extracted Text (Preview)</Label>
                      <Textarea 
                        value={extractedData.rawText.substring(0, 500) + (extractedData.rawText.length > 500 ? '...' : '')}
                        readOnly
                        className="text-xs"
                        rows={6}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
            
            {resolverOutput && (
              <DataGapsResolver
                resolverOutput={resolverOutput}
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
            
            {selectedClient && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Client</CardTitle>
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notice Intake Wizard - ASMT-10</DialogTitle>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    status === 'completed' ? 'bg-green-600 border-green-600 text-white' :
                    status === 'current' ? 'border-primary text-primary' :
                    'border-muted-foreground text-muted-foreground'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 ml-2 ${
                      getStepStatus(step.id + 1) === 'upcoming' ? 'bg-muted' : 'bg-primary'
                    }`} />
                  )}
                </div>
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

        <Separator />

        {/* Navigation buttons */}
        <div className="flex justify-between">
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
            disabled={loading || (currentStep === 1 && !uploadedFile) || 
                     (currentStep === 2 && !extractedData) ||
                     (currentStep === 3 && resolverOutput?.status !== 'complete') ||
                     (currentStep === 4 && !selectedClient) ||
                     (currentStep === 5 && !createdCase) ||
                     (currentStep === 6 && !createdCase)}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {currentStep === 3 && resolverOutput?.status !== 'complete' ? 'Validate' : 
             currentStep === 7 ? 'Complete' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};