import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { docxTemplateService, DetectedVariable, VariableMapping } from '@/services/docxTemplateService';
import { cn } from '@/lib/utils';
import { CASE_STAGES } from '@/utils/stageUtils';

interface TemplateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: {
    code: string;
    title: string;
    stage: string;
    docxFile: Blob;
    variableMappings: VariableMapping[];
  }) => void;
}

// Using canonical CASE_STAGES from stageUtils

type UploadStep = 'upload' | 'mapping' | 'review';

export const TemplateUploadModal: React.FC<TemplateUploadModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [templateCode, setTemplateCode] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateStage, setTemplateStage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [detectedVariables, setDetectedVariables] = useState<DetectedVariable[]>([]);
  const [variableMappings, setVariableMappings] = useState<VariableMapping[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const availableFields = docxTemplateService.getAvailableSystemFields();

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setError('Please upload a Word document (.docx)');
      return;
    }

    setError('');
    setProcessing(true);
    setUploadedFile(file);

    try {
      const { fileBlob, detectedVariables } = await docxTemplateService.parseDocxTemplate(file);
      
      setFileBlob(fileBlob);
      setDetectedVariables(detectedVariables);
      
      // Initialize mappings with suggestions
      const initialMappings: VariableMapping[] = detectedVariables.map(v => {
        const suggestedField = availableFields.find(f => f.path === v.suggestedMapping);
        return {
          placeholder: v.placeholder,
          systemPath: v.suggestedMapping || '',
          label: suggestedField?.label || v.placeholder
        };
      });
      
      setVariableMappings(initialMappings);
      setProcessing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse document');
      setProcessing(false);
    }
  }, [availableFields]);

  const handleMappingChange = (placeholder: string, systemPath: string) => {
    setVariableMappings(prev => 
      prev.map(m => 
        m.placeholder === placeholder 
          ? { ...m, systemPath, label: availableFields.find(f => f.path === systemPath)?.label || placeholder }
          : m
      )
    );
  };

  const handleNext = () => {
    if (currentStep === 'upload') {
      if (!uploadedFile || !fileBlob) {
        setError('Please upload a valid DOCX file');
        return;
      }
      // Allow proceeding even if no variables detected
      if (detectedVariables.length === 0) {
        console.warn('No variables detected in template - template will be static');
      }
      setError('');
      // Skip mapping if no variables detected
      if (detectedVariables.length === 0) {
        setCurrentStep('review');
      } else {
        setCurrentStep('mapping');
      }
    } else if (currentStep === 'mapping') {
      const unmappedVariables = variableMappings.filter(m => !m.systemPath);
      if (unmappedVariables.length > 0) {
        setError(`Please map all variables. ${unmappedVariables.length} variable(s) remaining.`);
        return;
      }
      setError('');
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      if (!templateCode || !templateTitle || !templateStage) {
        setError('Please fill in all template information');
        return;
      }
      onSave({
        code: templateCode,
        title: templateTitle,
        stage: templateStage,
        docxFile: fileBlob!,
        variableMappings
      });
    }
  };

  const handleBack = () => {
    if (currentStep === 'mapping') {
      setCurrentStep('upload');
    } else if (currentStep === 'review') {
      // Go back to mapping if there are variables, otherwise upload
      setCurrentStep(detectedVariables.length > 0 ? 'mapping' : 'upload');
    }
  };

  const resetModal = () => {
    setCurrentStep('upload');
    setTemplateCode('');
    setTemplateTitle('');
    setTemplateStage('');
    setUploadedFile(null);
    setFileBlob(null);
    setDetectedVariables([]);
    setVariableMappings([]);
    setError('');
    onClose();
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'upload': return 33;
      case 'mapping': return 66;
      case 'review': return 100;
    }
  };

  const fieldsByCategory = availableFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof availableFields>);

  return (
    <Dialog open={isOpen} onOpenChange={resetModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload DOCX Template
          </DialogTitle>
          <DialogDescription>
            Upload a Word document with variable placeholders (e.g., {'{{client_name}}'})
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={cn(currentStep === 'upload' && 'font-semibold text-primary')}>
              1. Upload
            </span>
            <span className={cn(currentStep === 'mapping' && 'font-semibold text-primary')}>
              2. Map Variables
            </span>
            <span className={cn(currentStep === 'review' && 'font-semibold text-primary')}>
              3. Review
            </span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'upload' && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 hover:border-primary/50 transition-colors">
                {!uploadedFile ? (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drop your DOCX file here or click to browse
                    </p>
                    <Input
                      type="file"
                      accept=".docx"
                      onChange={handleFileSelect}
                      className="max-w-xs"
                      disabled={processing}
                    />
                  </>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="font-medium mb-2">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Found {detectedVariables.length} variable(s)
                    </p>
                    {detectedVariables.length === 0 && (
                      <Alert className="mb-4 text-left">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No variables detected. Make sure your template uses the format: <code className="px-1 py-0.5 bg-muted rounded">{'{{variable_name}}'}</code>
                          <br/>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            You can still upload this as a static template, or go back and add variables.
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedFile(null);
                        setFileBlob(null);
                        setDetectedVariables([]);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Change File
                    </Button>
                  </div>
                )}
              </div>

              {processing && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Processing document...</p>
                </div>
              )}

              {detectedVariables.length > 0 && !processing && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Detected Variables</h4>
                  <div className="flex flex-wrap gap-2">
                    {detectedVariables.map(v => (
                      <Badge key={v.placeholder} variant="secondary">
                        {'{{'}{v.placeholder}{'}}'}
                        <span className="ml-1 text-xs">×{v.occurrences}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'mapping' && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Map each variable placeholder to a system field
                </p>
                
                {variableMappings.map((mapping, index) => (
                  <div key={mapping.placeholder} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {'{{'}{mapping.placeholder}{'}}'}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {mapping.systemPath && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`mapping-${index}`}>Map to System Field</Label>
                      <Select
                        value={mapping.systemPath}
                        onValueChange={(value) => handleMappingChange(mapping.placeholder, value)}
                      >
                        <SelectTrigger id={`mapping-${index}`} className="mt-1">
                          <SelectValue placeholder="Select a field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(fieldsByCategory).map(([category, fields]) => (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {category}
                              </div>
                              {fields.map(field => (
                                <SelectItem key={field.path} value={field.path}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {currentStep === 'review' && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="template-code">Template Code*</Label>
                  <Input
                    id="template-code"
                    value={templateCode}
                    onChange={(e) => setTemplateCode(e.target.value)}
                    placeholder="e.g., DOCX_APPEAL_01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="template-title">Template Title*</Label>
                  <Input
                    id="template-title"
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    placeholder="e.g., GST Appeal Letter"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="template-stage">Lifecycle Stage*</Label>
                  <Select value={templateStage} onValueChange={setTemplateStage}>
                    <SelectTrigger id="template-stage" className="mt-1">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {CASE_STAGES.map(stage => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File:</span>
                    <span className="font-medium">{uploadedFile?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variables:</span>
                    <span className="font-medium">{variableMappings.length} mapped</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template Type:</span>
                    <Badge variant="secondary">DOCX Upload</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={currentStep === 'upload' ? resetModal : handleBack}>
            {currentStep === 'upload' ? 'Cancel' : 'Back'}
          </Button>
          <Button onClick={handleNext} disabled={processing}>
            {currentStep === 'review' ? 'Save Template' : 'Next'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
