import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormTemplate, FormField } from '@/services/formTemplatesService';
import { 
  Plus, 
  Building2, 
  Users, 
  Scale, 
  FileText, 
  Calendar,
  Hash,
  Type,
  List,
  ToggleLeft,
  ArrowRight,
  Search
} from 'lucide-react';

interface TemplateBuilderProps {
  onCreateTemplate: (template: FormTemplate) => void;
  onClose: () => void;
}

interface FieldLibraryItem {
  key: string;
  label: string;
  type: string;
  category: 'client' | 'case' | 'employee' | 'court' | 'common';
  prefillPath?: string;
  required?: boolean;
  description?: string;
}

export const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  onCreateTemplate,
  onClose
}) => {
  const [templateFields, setTemplateFields] = useState<FormField[]>([]);
  const [templateInfo, setTemplateInfo] = useState({
    code: '',
    title: '',
    stage: 'Scrutiny'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Predefined field library based on system masters
  const fieldLibrary: FieldLibraryItem[] = [
    // Client Fields
    { key: 'client_name', label: 'Client Name', type: 'string', category: 'client', prefillPath: 'case.client.name', required: true },
    { key: 'client_gstin', label: 'Client GSTIN', type: 'string', category: 'client', prefillPath: 'case.client.gstin' },
    { key: 'client_pan', label: 'Client PAN', type: 'string', category: 'client', prefillPath: 'case.client.pan', required: true },
    { key: 'client_address', label: 'Client Address', type: 'textarea', category: 'client', prefillPath: 'case.client.address' },
    { key: 'client_type', label: 'Client Type', type: 'select', category: 'client', description: 'Individual, Company, Partnership, etc.' },
    { key: 'client_category', label: 'Client Category', type: 'select', category: 'client', description: 'Regular Dealer, Composition, etc.' },
    
    // Case Fields
    { key: 'case_id', label: 'Case ID', type: 'string', category: 'case', prefillPath: 'case.id', required: true },
    { key: 'case_title', label: 'Case Title', type: 'string', category: 'case', prefillPath: 'case.title', required: true },
    { key: 'case_number', label: 'Case Number', type: 'string', category: 'case', prefillPath: 'case.caseNumber' },
    { key: 'current_stage', label: 'Current Stage', type: 'string', category: 'case', prefillPath: 'case.currentStage' },
    { key: 'notice_number', label: 'Notice Number', type: 'string', category: 'case', prefillPath: 'case.notice.number' },
    { key: 'notice_date', label: 'Notice Date', type: 'date', category: 'case', prefillPath: 'case.notice.date' },
    { key: 'demand_amount', label: 'Demand Amount', type: 'number', category: 'case', prefillPath: 'case.demand.amount' },
    { key: 'tax_period', label: 'Tax Period', type: 'string', category: 'case', description: 'Period covered by the case' },
    
    // Employee Fields
    { key: 'authorized_signatory', label: 'Authorized Signatory', type: 'string', category: 'employee', prefillPath: 'case.signatory.fullName' },
    { key: 'employee_name', label: 'Employee Name', type: 'string', category: 'employee', prefillPath: 'employee.name' },
    { key: 'employee_designation', label: 'Employee Designation', type: 'string', category: 'employee', prefillPath: 'employee.designation' },
    { key: 'employee_role', label: 'Employee Role', type: 'select', category: 'employee', description: 'Partner, CA, Advocate, etc.' },
    
    // Court Fields
    { key: 'court_name', label: 'Court Name', type: 'string', category: 'court', description: 'Name of the court' },
    { key: 'judge_name', label: 'Judge Name', type: 'string', category: 'court', description: 'Presiding judge name' },
    { key: 'hearing_date', label: 'Hearing Date', type: 'date', category: 'court', description: 'Next hearing date' },
    { key: 'jurisdiction', label: 'Jurisdiction', type: 'string', category: 'court', description: 'Court jurisdiction' },
    
    // Common Fields
    { key: 'reference_number', label: 'Reference Number', type: 'string', category: 'common', required: true, description: 'Document reference number' },
    { key: 'date_of_filing', label: 'Date of Filing', type: 'date', category: 'common', description: 'Filing date' },
    { key: 'factual_background', label: 'Factual Background', type: 'textarea', category: 'common', description: 'Background facts' },
    { key: 'legal_submissions', label: 'Legal Submissions', type: 'textarea', category: 'common', description: 'Legal arguments' },
    { key: 'prayer', label: 'Prayer', type: 'textarea', category: 'common', description: 'Relief sought' },
    { key: 'grounds', label: 'Grounds', type: 'textarea', category: 'common', description: 'Grounds for the application' },
    { key: 'objections', label: 'Objections', type: 'textarea', category: 'common', description: 'Objections raised' },
    { key: 'evidence_list', label: 'Evidence List', type: 'array', category: 'common', description: 'List of evidence documents' },
    { key: 'annexures', label: 'Annexures', type: 'array', category: 'common', description: 'Supporting documents' },
    { key: 'verification_place', label: 'Verification Place', type: 'string', category: 'common', description: 'Place of verification' },
    { key: 'verification_date', label: 'Verification Date', type: 'date', category: 'common', description: 'Date of verification' },
    { key: 'amount_in_dispute', label: 'Amount in Dispute', type: 'number', category: 'common', description: 'Disputed amount' },
    { key: 'payment_made', label: 'Payment Made', type: 'number', category: 'common', description: 'Payment amount' },
    { key: 'personal_hearing', label: 'Personal Hearing Requested', type: 'boolean', category: 'common', description: 'Whether personal hearing is requested' }
  ];

  const categories = [
    { value: 'all', label: 'All Fields', icon: List },
    { value: 'client', label: 'Client', icon: Users },
    { value: 'case', label: 'Case', icon: FileText },
    { value: 'employee', label: 'Employee', icon: Building2 },
    { value: 'court', label: 'Court', icon: Scale },
    { value: 'common', label: 'Common', icon: Type }
  ];

  const filteredFields = fieldLibrary.filter(field => {
    const matchesSearch = field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || field.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addFieldToTemplate = (libraryField: FieldLibraryItem) => {
    const newField: FormField = {
      key: libraryField.key,
      label: libraryField.label,
      type: libraryField.type as any,
      required: libraryField.required || false
    };

    setTemplateFields(prev => [...prev, newField]);
  };

  const removeFieldFromTemplate = (index: number) => {
    setTemplateFields(prev => prev.filter((_, i) => i !== index));
  };

  const createTemplate = () => {
    if (!templateInfo.code || !templateInfo.title || templateFields.length === 0) {
      return;
    }

    // Build prefill mappings
    const prefill: Record<string, string> = {};
    templateFields.forEach(field => {
      const libraryField = fieldLibrary.find(lf => lf.key === field.key);
      if (libraryField?.prefillPath) {
        prefill[field.key] = libraryField.prefillPath;
      }
    });

    const template: FormTemplate = {
      code: templateInfo.code,
      title: templateInfo.title,
      stage: templateInfo.stage as any,
      version: '1.0',
      prefill,
      fields: templateFields,
      output: {
        filename: `${templateInfo.code}_\${case.id}_\${now:YYYYMMDD}.pdf`,
        dms_folder_by_stage: true,
        timeline_event: `${templateInfo.title} submitted`
      }
    };

    onCreateTemplate(template);
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'string': return Type;
      case 'number': return Hash;
      case 'date': return Calendar;
      case 'boolean': return ToggleLeft;
      case 'textarea': return FileText;
      case 'array': return List;
      default: return Type;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6 h-[80vh]">
      {/* Field Library */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Field Library
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-4"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.value}
                    variant={selectedCategory === category.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.value)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {category.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2">
                {filteredFields.map((field, index) => {
                  const Icon = getFieldIcon(field.type);
                  const isAdded = templateFields.some(tf => tf.key === field.key);
                  
                  return (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card className={`cursor-pointer transition-colors ${
                        isAdded ? 'bg-muted border-primary' : 'hover:bg-accent'
                      }`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{field.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {field.type} • {field.category}
                                </div>
                                {field.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {field.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addFieldToTemplate(field)}
                              disabled={isAdded}
                            >
                              {isAdded ? '✓' : <Plus className="h-3 w-3" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Template Builder */}
      <div className="col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="template-code">Code</Label>
              <Input
                id="template-code"
                value={templateInfo.code}
                onChange={(e) => setTemplateInfo(prev => ({ ...prev, code: e.target.value }))}
                placeholder="TEMPLATE_CODE"
              />
            </div>
            <div>
              <Label htmlFor="template-title">Title</Label>
              <Input
                id="template-title"
                value={templateInfo.title}
                onChange={(e) => setTemplateInfo(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Template Title"
              />
            </div>
            <div>
              <Label htmlFor="template-stage">Stage</Label>
              <Input
                id="template-stage"
                value={templateInfo.stage}
                onChange={(e) => setTemplateInfo(prev => ({ ...prev, stage: e.target.value }))}
                placeholder="Stage"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Template Fields ({templateFields.length})
              <Button
                onClick={createTemplate}
                disabled={!templateInfo.code || !templateInfo.title || templateFields.length === 0}
              >
                Create Template
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {templateFields.map((field, index) => {
                  const Icon = getFieldIcon(field.type);
                  return (
                    <motion.div
                      key={`${field.key}-${index}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded bg-muted">
                                <span className="text-sm font-medium">{index + 1}</span>
                              </div>
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{field.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {field.type}
                                  {field.required && (
                                    <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFieldFromTemplate(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              ×
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}

                {templateFields.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fields added yet</p>
                    <p className="text-sm">Select fields from the library to build your template</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};