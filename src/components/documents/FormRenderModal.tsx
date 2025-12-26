import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Download, AlertCircle, CheckCircle, Loader2, Wand2, Upload } from 'lucide-react';
import { uploadDocument } from '@/services/supabaseDocumentService';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalLayout } from '@/components/ui/modal-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { FormTemplate, FormField, FormValidationError, formTemplatesService } from '@/services/formTemplatesService';
import { reportsService } from '@/services/reportsService';
import { useAppState } from '@/contexts/AppStateContext';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/useAdvancedRBAC';
import { AIAssistantPanel } from './AIAssistantPanel';
import { AIDraftResult } from '@/services/aiDraftService';
import { IssueNavigator } from '@/components/ui/issue-navigator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  // Type guard: Block DOCX templates from using this modal
  if ('templateType' in template && template.templateType === 'docx') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              DOCX Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                This is a Word document template and must be generated using the DOCX generator. 
                Please use the <strong>Generate</strong> button from the templates list.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { state, dispatch } = useAppState();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<FormValidationError[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [improvingField, setImprovingField] = useState<string | null>(null);
  const [currentIssue, setCurrentIssue] = useState<number>(0);
  const [issueStatus, setIssueStatus] = useState<('complete' | 'incomplete' | 'error')[]>([]);
  const [issueProgress, setIssueProgress] = useState<{ [key: number]: number }>({});
  
  // AI permissions
  const canUseAI = usePermission('ai', 'read');

  // Initialize form data when template changes
  useEffect(() => {
    if (template && isOpen) {
      initializeFormData();
    }
  }, [template, isOpen]);

  const initializeFormData = () => {
    setIsInitializing(true);
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
          case 'repeatable_group':
            // Initialize based on repeat count field
            const countField = template.fields.find(f => f.key === field.repeat_count_field);
            const defaultCount = countField?.default || 1;
            initialData[field.key] = Array.from({ length: defaultCount }, () => {
              const item: Record<string, any> = {};
              if (field.fields) {
                field.fields.forEach(subField => {
                  switch (subField.type) {
                    case 'array':
                      item[subField.key] = [];
                      break;
                    case 'boolean':
                      item[subField.key] = false;
                      break;
                    default:
                      item[subField.key] = subField.default || '';
                  }
                });
              }
              return item;
            });
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
    setIsInitializing(false);
  };

  const handleFieldChange = (fieldKey: string, value: any, parentKey?: string, issueIndex?: number) => {
    setFormData(prev => {
      const updated = { ...prev };
      if (issueIndex !== undefined && parentKey === 'issues') {
        updated[parentKey] = [...(updated[parentKey] || [])];
        updated[parentKey][issueIndex] = { ...updated[parentKey][issueIndex], [fieldKey]: value };
      } else if (parentKey) {
        updated[parentKey] = { ...updated[parentKey], [fieldKey]: value };
      } else {
        updated[fieldKey] = value;
        
        // Handle issue count change for repeatable groups
        if (fieldKey === 'issue_count' && typeof value === 'number') {
          const currentIssues = updated.issues || [];
          if (value > currentIssues.length) {
            // Add new issues
            const newIssues = Array.from({ length: value - currentIssues.length }, () => {
              const newIssue: Record<string, any> = {};
              const issueTemplate = template.fields.find(f => f.key === 'issues');
              if (issueTemplate?.fields) {
                issueTemplate.fields.forEach(subField => {
                  switch (subField.type) {
                    case 'array':
                      newIssue[subField.key] = [];
                      break;
                    case 'boolean':
                      newIssue[subField.key] = false;
                      break;
                    default:
                      newIssue[subField.key] = subField.default || '';
                  }
                });
              }
              return newIssue;
            });
            updated.issues = [...currentIssues, ...newIssues];
          } else if (value < currentIssues.length) {
            // Remove excess issues
            updated.issues = currentIssues.slice(0, value);
          }
          
          // Update issue status array
          setIssueStatus(prev => {
            const newStatus = Array.from({ length: value }, (_, i) => prev[i] || 'incomplete');
            return newStatus;
          });
          
          // Adjust current issue if necessary
          if (currentIssue >= value) {
            setCurrentIssue(Math.max(0, value - 1));
          }
        }
      }
      return updated;
    });

    // Clear errors for this field
    setErrors(prev => prev.filter(error => {
      if (issueIndex !== undefined && parentKey === 'issues') {
        return !error.field.startsWith(`${parentKey}[${issueIndex}].${fieldKey}`);
      }
      return parentKey ? !error.field.startsWith(`${parentKey}.${fieldKey}`) : error.field !== fieldKey;
    }));
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

      // Create File object from the blob for Supabase Storage upload
      const file = new File([blob], suggestedFilename, { type: 'application/pdf' });

      // Get authenticated user and tenant_id for proper upload
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to upload documents');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('Unable to determine tenant context');
      }

      // Upload to Supabase Storage + create database record
      const uploadResult = await uploadDocument(file, {
        tenant_id: profile.tenant_id,
        case_id: caseId,
        client_id: caseData?.clientId,
        folder_id: 'litigation-docs',
        category: 'Reply'
      });

      // Dispatch to update UI state with proper field mapping
      dispatch({
        type: 'ADD_DOCUMENT',
        payload: {
          id: uploadResult.id,
          name: uploadResult.file_name,
          type: uploadResult.file_type,
          size: uploadResult.file_size,
          caseId: caseId,
          clientId: caseData?.clientId || '',
          uploadedAt: new Date().toISOString(),
          uploadedById: user.id,
          uploadedByName: currentEmployee?.full_name || 'System',
          tags: ['form-generated', template.code, 'auto-generated'],
          isShared: false,
          path: uploadResult.file_path,
          folderId: 'litigation-docs',
          category: 'Reply'
        }
      });

      // Create generated form record with actual document ID
      const generatedForm = {
        formCode: template.code,
        version: (caseData?.generatedForms?.filter(f => f.formCode === template.code).length || 0) + 1,
        generatedDate: new Date().toISOString(),
        employeeId: currentEmployee?.id || 'emp-1',
        employeeName: currentEmployee?.full_name || 'Current User',
        fileName: suggestedFilename,
        status: 'Uploaded' as const,
        documentId: uploadResult.id
      };

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
            <Textarea
              id={fieldKey}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value, parentKey)}
              className={fieldErrors.length > 0 ? 'border-destructive' : ''}
              rows={4}
            />
            {canUseAI && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => handleImproveSectionWithAI(parentKey ? `${parentKey}.${field.key}` : field.key)}
                disabled={improvingField === (parentKey ? `${parentKey}.${field.key}` : field.key)}
              >
                {improvingField === (parentKey ? `${parentKey}.${field.key}` : field.key) ? (
                  <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Improving with AI...</>
                ) : (
                  <><Wand2 className="h-3 w-3 mr-2" />Improve with AI</>
                )}
              </Button>
            )}
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

      case 'repeatable_group':
        const issueCount = formData[field.repeat_count_field || 'issue_count'] || 1;
        const issues = formData[field.key] || [];
        
        return fieldWrapper(
          <div className="space-y-4">
            {/* Issue Navigator */}
            <IssueNavigator
              currentIssue={currentIssue}
              totalIssues={issueCount}
              issueStatus={issueStatus}
              onIssueChange={setCurrentIssue}
              issueProgress={issueProgress}
            />
            
            {/* Current Issue Form */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">
                  Issue {currentIssue + 1} of {issueCount}
                </h4>
                <Badge variant="outline">
                  {issueStatus[currentIssue] === 'complete' ? 'Complete' : 
                   issueStatus[currentIssue] === 'error' ? 'Has Errors' : 'In Progress'}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {field.fields?.map(subField => {
                  const subFieldKey = `${field.key}[${currentIssue}].${subField.key}`;
                  const subValue = issues[currentIssue]?.[subField.key];
                  const subFieldErrors = errors.filter(error => error.field === subFieldKey);
                  
                  return (
                    <div key={subField.key} className="space-y-2">
                      <Label htmlFor={subFieldKey} className={`text-sm font-medium ${subField.required ? 'required' : ''}`}>
                        {subField.label}
                        {subField.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      
                       {subField.type === 'textarea' ? (
                        <div className="space-y-2">
                          <Textarea
                            id={subFieldKey}
                            value={subValue || ''}
                            onChange={(e) => handleFieldChange(subField.key, e.target.value, field.key, currentIssue)}
                            className={subFieldErrors.length > 0 ? 'border-destructive' : ''}
                            rows={4}
                            placeholder={`Enter ${subField.label.toLowerCase()} for issue ${currentIssue + 1}...`}
                          />
                          {canUseAI && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => handleImproveSectionWithAI(`${field.key}[${currentIssue}].${subField.key}`)}
                              disabled={improvingField === `${field.key}[${currentIssue}].${subField.key}`}
                            >
                              {improvingField === `${field.key}[${currentIssue}].${subField.key}` ? (
                                <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Improving with AI...</>
                              ) : (
                                <><Wand2 className="h-3 w-3 mr-2" />Improve with AI</>
                              )}
                            </Button>
                          )}
                        </div>
                      ) : subField.type === 'array' ? (
                        <div className="space-y-2">
                          {(subValue || []).map((item: any, index: number) => (
                            <div key={index} className="flex gap-2 items-start">
                              {subField.items?.type === 'file' ? (
                                <div className="flex-1 space-y-2">
                                  <Input
                                    type="file"
                                    accept={(subField.items as any)?.accept || '*'}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const newArray = [...(subValue || [])];
                                        newArray[index] = {
                                          name: file.name,
                                          size: file.size,
                                          type: file.type,
                                          file: file
                                        };
                                        handleFieldChange(subField.key, newArray, field.key, currentIssue);
                                      }
                                    }}
                                    className="cursor-pointer"
                                  />
                                  {item?.name && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.name} ({(item.size / 1024).toFixed(1)} KB)
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Input
                                  value={item}
                                  onChange={(e) => {
                                    const newArray = [...(subValue || [])];
                                    newArray[index] = e.target.value;
                                    handleFieldChange(subField.key, newArray, field.key, currentIssue);
                                  }}
                                  placeholder={`${subField.label} ${index + 1}`}
                                />
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newArray = (subValue || []).filter((_: any, i: number) => i !== index);
                                  handleFieldChange(subField.key, newArray, field.key, currentIssue);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newArray = [...(subValue || []), subField.items?.type === 'file' ? null : ''];
                              handleFieldChange(subField.key, newArray, field.key, currentIssue);
                            }}
                          >
                            Add {subField.label}
                          </Button>
                        </div>
                      ) : (
                        <Input
                          id={subFieldKey}
                          value={subValue || ''}
                          onChange={(e) => handleFieldChange(subField.key, e.target.value, field.key, currentIssue)}
                          className={subFieldErrors.length > 0 ? 'border-destructive' : ''}
                          placeholder={`Enter ${subField.label.toLowerCase()}...`}
                        />
                      )}
                      
                      {subFieldErrors.map((error, index) => (
                        <div key={index} className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {error.message}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Helper function to determine modal width based on field count
  const getModalWidth = (fieldCount: number): string => {
    if (fieldCount <= 8) return "max-w-2xl";
    if (fieldCount <= 15) return "max-w-3xl";
    return "max-w-4xl";
  };

  // Get case and client data for context badges
  const caseId = selectedCaseId || selectedCase;
  const caseData = caseId ? state.cases.find(c => c.id === caseId) : undefined;
  const clientData = caseData ? state.clients.find(c => c.id === caseData.clientId) : undefined;

  // Build description with context badges
  const getDescription = () => {
    if (!caseData && !clientData) return undefined;
    
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {clientData && (
          <Badge variant="outline" className="text-xs">
            {clientData.name}
          </Badge>
        )}
        {caseData && (
          <Badge variant="outline" className="text-xs">
            {caseData.caseNumber}
          </Badge>
        )}
        <Badge variant="secondary" className="text-xs">
          {template.stage}
        </Badge>
      </div>
    );
  };

  return (
    <ModalLayout
      open={isOpen}
      onOpenChange={onClose}
      title={`Generate ${template.title}`}
      description={getDescription() as any}
      icon={<FileText className="h-5 w-5" />}
      maxWidth={getModalWidth(template.fields.length)}
      showHeaderDivider={true}
      showFooterDivider={true}
      footer={
        <div className="flex items-center justify-between w-full">
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
      }
    >
      {isInitializing ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Case Selection Card */}
          {!selectedCaseId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Case Details
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* AI Assistant Card */}
          {canUseAI && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wand2 className="h-4 w-4" />
                  AI Draft Assistant
                  <Badge variant="secondary" className="ml-auto text-xs">Beta</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIAssistantPanel
                  template={template}
                  caseData={caseData}
                  clientData={clientData}
                  formData={formData}
                  onDraftGenerated={handleDraftGenerated}
                  onFieldImproved={handleFieldImproved}
                  disabled={!canUseAI}
                />
              </CardContent>
            </Card>
          )}

          {/* Form Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Form Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.fields.map(field => renderField(field))}
            </CardContent>
          </Card>

          {/* Error Summary Alert */}
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
        </div>
      )}
    </ModalLayout>
  );
};