import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Download, AlertCircle, CheckCircle, Loader2, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormTemplate, FormField, FormValidationError, formTemplatesService } from '@/services/formTemplatesService';
import { reportsService } from '@/services/reportsService';
import { useAppState } from '@/contexts/AppStateContext';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/useRBAC';
import { AIAssistantPanel } from './AIAssistantPanel';
import { AIDraftResult } from '@/services/aiDraftService';

interface FormRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: FormTemplate;
  selectedCaseId?: string;
  onFormGenerated?: (generatedForm: any) => void;
}

export const FormRenderModal: React.FC<FormRenderModalProps> = ({
  isOpen,
  onClose,
  template,
  selectedCaseId,
  onFormGenerated
}) => {
  const { state, dispatch } = useAppState();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<FormValidationError[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [improvingField, setImprovingField] = useState<string | null>(null);
  
  // AI permissions
  const canUseAI = usePermission('ai', 'read');

  // Initialize form data when template changes
  useEffect(() => {
    if (template && isOpen) {
      initializeFormData();
    }
  }, [template, isOpen]);

  const initializeFormData = () => {
    const initialData: Record<string, any> = {};
    
    // Set default values from template
    template.fields.forEach(field => {
      if (field.default !== undefined) {
        initialData[field.key] = field.default;
      } else {
        // Initialize with appropriate empty values
        switch (field.type) {
          case 'boolean':
            initialData[field.key] = false;
            break;
          case 'array':
            initialData[field.key] = [];
            break;
          case 'number':
            initialData[field.key] = '';
            break;
          case 'group':
            initialData[field.key] = {};
            if (field.fields) {
              field.fields.forEach(subField => {
                initialData[field.key][subField.key] = subField.default || '';
              });
            }
            break;
          default:
            initialData[field.key] = '';
        }
      }
    });

    // Apply prefill mappings if case is selected
    const caseId = selectedCaseId || selectedCase;
    if (caseId) {
      const caseData = state.cases.find(c => c.id === caseId);
      const clientData = caseData ? state.clients.find(c => c.id === caseData.clientId) : null;
      
      if (caseData && clientData) {
        const prefillData = formTemplatesService.applyPrefillMappings(template, caseData, clientData);
        Object.assign(initialData, prefillData);
      }
    }

    setFormData(initialData);
    setErrors([]);
  };

  const handleFieldChange = (fieldKey: string, value: any, parentKey?: string) => {
    setFormData(prev => {
      const updated = { ...prev };
      if (parentKey) {
        updated[parentKey] = { ...updated[parentKey], [fieldKey]: value };
      } else {
        updated[fieldKey] = value;
      }
      return updated;
    });

    // Clear errors for this field
    setErrors(prev => prev.filter(error => 
      parentKey ? !error.field.startsWith(`${parentKey}.${fieldKey}`) : error.field !== fieldKey
    ));
  };

  const handleArrayAdd = (fieldKey: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: [...(prev[fieldKey] || []), '']
    }));
  };

  const handleArrayRemove = (fieldKey: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].filter((_: any, i: number) => i !== index)
    }));
  };

  const handleArrayItemChange = (fieldKey: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: prev[fieldKey].map((item: string, i: number) => i === index ? value : item)
    }));
  };

  const validateAndGenerate = async () => {
    // Validate form data
    const validationErrors = formTemplatesService.validateFormData(template, formData);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast({
        title: "Validation Failed",
        description: `Please fix ${validationErrors.length} error(s) before generating the document.`,
        variant: "destructive"
      });
      return;
    }

    const caseId = selectedCaseId || selectedCase;
    if (!caseId) {
      toast({
        title: "Case Required",
        description: "Please select a case to generate the document.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate PDF using the reports service
      const { blob, suggestedFilename } = await reportsService.renderFormPDF(template.code, caseId, formData);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = suggestedFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Get case and current employee info
      const caseData = state.cases.find(c => c.id === caseId);
      const currentEmployee = state.employees.find(e => e.id === 'emp-1'); // TODO: Get from auth context

      // Create generated form record
      const generatedForm = {
        formCode: template.code,
        version: (caseData?.generatedForms?.filter(f => f.formCode === template.code).length || 0) + 1,
        generatedDate: new Date().toISOString(),
        employeeId: currentEmployee?.id || 'emp-1',
        employeeName: currentEmployee?.full_name || 'Current User',
        fileName: suggestedFilename,
        status: 'Uploaded' as const,
        documentId: `doc-${Date.now()}`
      };

      // Simulate DMS upload (in real app, would upload to DMS)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Notify parent component
      if (onFormGenerated) {
        onFormGenerated(generatedForm);
      }

      toast({
        title: "Form Generated & Uploaded",
        description: `${template.title} has been successfully generated and uploaded to DMS.`,
      });

      onClose();

    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate the document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDraftGenerated = (result: AIDraftResult) => {
    // Apply AI generated content to form fields
    result.sections.forEach(section => {
      setFormData(prev => ({
        ...prev,
        [section.fieldKey]: section.content
      }));
    });

    toast({
      title: "AI Draft Applied",
      description: `Generated content applied to ${result.sections.length} fields.`,
    });
  };

  const handleFieldImproved = (fieldKey: string, content: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: content
    }));
  };

  const handleImproveSectionWithAI = async (fieldKey: string) => {
    const caseId = selectedCaseId || selectedCase;
    if (!caseId || !canUseAI) return;

    const caseData = state.cases.find(c => c.id === caseId);
    const clientData = caseData ? state.clients.find(c => c.id === caseData.clientId) : null;
    
    if (!caseData || !clientData) return;

    setImprovingField(fieldKey);
    
    try {
      const { aiDraftService } = await import('@/services/aiDraftService');
      
      const improvedContent = await aiDraftService.improveSectionWithAI(
        fieldKey,
        formData[fieldKey] || '',
        {
          tone: 'formal',
          audience: 'officer',
          focusAreas: ['Facts', 'Legal Grounds'],
          personalization: '',
          language: 'english',
          insertCitations: false
        },
        { template, caseData, clientData },
        'current-user' // TODO: Get from auth context
      );

      handleFieldImproved(fieldKey, improvedContent);
      
    } catch (error) {
      console.error('Failed to improve section:', error);
    } finally {
      setImprovingField(null);
    }
  };

  const renderField = (field: FormField, parentKey?: string): React.ReactNode => {
    const fieldKey = parentKey ? `${parentKey}.${field.key}` : field.key;
    const value = parentKey ? formData[parentKey]?.[field.key] : formData[field.key];
    const fieldErrors = errors.filter(error => error.field === fieldKey);

    const fieldWrapper = (children: React.ReactNode) => (
      <div key={fieldKey} className="space-y-2">
        <Label htmlFor={fieldKey} className={`text-sm font-medium ${field.required ? 'required' : ''}`}>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {children}
        {fieldErrors.map((error, index) => (
          <div key={index} className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error.message}
          </div>
        ))}
      </div>
    );

    switch (field.type) {
      case 'string':
        return fieldWrapper(
          <Input
            id={fieldKey}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value, parentKey)}
            className={fieldErrors.length > 0 ? 'border-destructive' : ''}
          />
        );

      case 'textarea':
        return fieldWrapper(
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                id={fieldKey}
                value={value || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value, parentKey)}
                className={fieldErrors.length > 0 ? 'border-destructive' : ''}
                rows={4}
              />
              {canUseAI && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-6 px-2 text-xs"
                  onClick={() => handleImproveSectionWithAI(parentKey ? `${parentKey}.${field.key}` : field.key)}
                  disabled={improvingField === (parentKey ? `${parentKey}.${field.key}` : field.key)}
                >
                  {improvingField === (parentKey ? `${parentKey}.${field.key}` : field.key) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </div>
        );

      case 'number':
        return fieldWrapper(
          <Input
            id={fieldKey}
            type="number"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value) || '', parentKey)}
            className={fieldErrors.length > 0 ? 'border-destructive' : ''}
            min={field.minimum}
            max={field.maximum}
          />
        );

      case 'date':
        return fieldWrapper(
          <Input
            id={fieldKey}
            type="date"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value, parentKey)}
            className={fieldErrors.length > 0 ? 'border-destructive' : ''}
          />
        );

      case 'boolean':
        return fieldWrapper(
          <div className="flex items-center space-x-2">
            <Checkbox
              id={fieldKey}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.key, checked, parentKey)}
            />
            <Label htmlFor={fieldKey} className="text-sm">
              {field.label}
            </Label>
          </div>
        );

      case 'array':
        return fieldWrapper(
          <div className="space-y-2">
            {(value || []).map((item: string, index: number) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => handleArrayItemChange(field.key, index, e.target.value)}
                  placeholder={`${field.label} ${index + 1}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleArrayRemove(field.key, index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleArrayAdd(field.key)}
            >
              Add {field.label}
            </Button>
          </div>
        );

      case 'group':
        return fieldWrapper(
          <div className="border border-border rounded-md p-4 space-y-4">
            {field.fields?.map(subField => renderField(subField, field.key))}
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
            <FileText className="h-5 w-5 text-primary" />
            Generate {template.title}
            <Badge variant="secondary">{template.stage}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Assistant Panel */}
          {canUseAI && (
            <AIAssistantPanel
              template={template}
              caseData={(() => {
                const caseId = selectedCaseId || selectedCase;
                return caseId ? state.cases.find(c => c.id === caseId) : undefined;
              })()}
              clientData={(() => {
                const caseId = selectedCaseId || selectedCase;
                const caseData = caseId ? state.cases.find(c => c.id === caseId) : undefined;
                return caseData ? state.clients.find(c => c.id === caseData.clientId) : undefined;
              })()}
              formData={formData}
              onDraftGenerated={handleDraftGenerated}
              onFieldImproved={handleFieldImproved}
              disabled={!canUseAI}
            />
          )}

          {/* Case Selection */}
          {!selectedCaseId && (
            <div className="space-y-2">
              <Label htmlFor="case-select">Select Case *</Label>
              <Select value={selectedCase} onValueChange={setSelectedCase}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a case..." />
                </SelectTrigger>
                <SelectContent>
                  {state.cases.map(caseItem => (
                    <SelectItem key={caseItem.id} value={caseItem.id}>
                      {caseItem.caseNumber} - {caseItem.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Form Details</h3>
            {template.fields.map(field => renderField(field))}
          </div>

          {/* Error Summary */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the following errors:
                <ul className="list-disc list-inside mt-2">
                  {errors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {canUseAI && "AI-assisted draft. Please review before submission."}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={validateAndGenerate} 
                disabled={isGenerating}
                className="min-w-[120px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};