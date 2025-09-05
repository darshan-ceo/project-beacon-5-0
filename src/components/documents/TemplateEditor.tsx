import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormTemplate, FormField } from '@/services/formTemplatesService';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Type, 
  Hash, 
  Calendar, 
  ToggleLeft,
  List,
  Users,
  FileText,
  Building,
  Image,
  Save,
  Eye,
  ArrowLeft
} from 'lucide-react';

interface TemplateEditorProps {
  template?: FormTemplate | null;
  onSave: (template: FormTemplate) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
  isOpen
}) => {
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate>({
    code: '',
    title: '',
    stage: 'Scrutiny',
    version: '1.0',
    prefill: {},
    fields: [],
    output: {
      filename: '',
      dms_folder_by_stage: true,
      timeline_event: ''
    }
  });

  const [companyHeader, setCompanyHeader] = useState('');
  const [companyFooter, setCompanyFooter] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const stages = ['Scrutiny', 'Demand', 'Adjudication', 'Appeals', 'Tribunal', 'High Court', 'Supreme Court'];
  
  const fieldTypes = [
    { value: 'string', label: 'Text Input', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'boolean', label: 'Yes/No', icon: ToggleLeft },
    { value: 'textarea', label: 'Long Text', icon: FileText },
    { value: 'select', label: 'Dropdown', icon: List },
    { value: 'array', label: 'List', icon: Users },
    { value: 'group', label: 'Group', icon: Building },
    { value: 'repeatable_group', label: 'Repeatable Group', icon: Users }
  ];

  const prefillOptions = [
    { value: 'case.client.name', label: 'Client Name' },
    { value: 'case.client.gstin', label: 'Client GSTIN' },
    { value: 'case.client.pan', label: 'Client PAN' },
    { value: 'case.client.address', label: 'Client Address' },
    { value: 'case.id', label: 'Case ID' },
    { value: 'case.title', label: 'Case Title' },
    { value: 'case.currentStage', label: 'Current Stage' },
    { value: 'case.notice.number', label: 'Notice Number' },
    { value: 'case.notice.date', label: 'Notice Date' },
    { value: 'case.signatory.fullName', label: 'Authorized Signatory' },
    { value: 'case.demand.amount', label: 'Demand Amount' },
    { value: 'case.demand.section', label: 'Demand Section' },
    { value: 'employee.name', label: 'Employee Name' },
    { value: 'employee.designation', label: 'Employee Designation' },
    { value: 'now:YYYYMMDD', label: 'Current Date (YYYYMMDD)' },
    { value: 'now:DD/MM/YYYY', label: 'Current Date (DD/MM/YYYY)' }
  ];

  useEffect(() => {
    if (template) {
      setEditingTemplate({ ...template });
      // Extract company header/footer from template if exists
      setCompanyHeader(template.customization?.companyHeader || '');
      setCompanyFooter(template.customization?.companyFooter || '');
    } else {
      // Reset for new template
      setEditingTemplate({
        code: '',
        title: '',
        stage: 'Scrutiny',
        version: '1.0',
        prefill: {},
        fields: [],
        output: {
          filename: '',
          dms_folder_by_stage: true,
          timeline_event: ''
        }
      });
      setCompanyHeader('');
      setCompanyFooter('');
    }
  }, [template]);

  const addField = () => {
    const newField: FormField = {
      key: `field_${Date.now()}`,
      label: 'New Field',
      type: 'string',
      required: false
    };
    setEditingTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (index: number, field: FormField) => {
    setEditingTemplate(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === index ? field : f)
    }));
  };

  const removeField = (index: number) => {
    setEditingTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    setEditingTemplate(prev => {
      const fields = [...prev.fields];
      const [removed] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, removed);
      return { ...prev, fields };
    });
  };

  const handleSave = () => {
    if (!editingTemplate.code || !editingTemplate.title) {
      toast({
        title: "Validation Error",
        description: "Template code and title are required",
        variant: "destructive"
      });
      return;
    }

    const templateToSave = {
      ...editingTemplate,
      customization: {
        companyHeader,
        companyFooter
      }
    };

    onSave(templateToSave);
    toast({
      title: "Template Saved",
      description: `Template "${editingTemplate.title}" has been saved successfully`,
    });
  };

  const renderFieldEditor = (field: FormField, index: number) => {
    return (
      <Card key={field.key} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <Badge variant="outline">{field.type}</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeField(index)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`field-key-${index}`}>Field Key</Label>
              <Input
                id={`field-key-${index}`}
                value={field.key}
                onChange={(e) => updateField(index, { ...field, key: e.target.value })}
                placeholder="field_key"
              />
            </div>
            <div>
              <Label htmlFor={`field-label-${index}`}>Label</Label>
              <Input
                id={`field-label-${index}`}
                value={field.label}
                onChange={(e) => updateField(index, { ...field, label: e.target.value })}
                placeholder="Field Label"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor={`field-type-${index}`}>Type</Label>
              <Select
                value={field.type}
                onValueChange={(value) => updateField(index, { ...field, type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id={`field-required-${index}`}
                checked={field.required}
                onCheckedChange={(checked) => updateField(index, { ...field, required: checked })}
              />
              <Label htmlFor={`field-required-${index}`}>Required</Label>
            </div>
          </div>

          {field.type === 'textarea' && (
            <div>
              <Label htmlFor={`field-minlength-${index}`}>Minimum Length</Label>
              <Input
                id={`field-minlength-${index}`}
                type="number"
                value={field.minLength || ''}
                onChange={(e) => updateField(index, { ...field, minLength: parseInt(e.target.value) || undefined })}
                placeholder="Minimum character length"
              />
            </div>
          )}

          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`field-min-${index}`}>Minimum</Label>
                <Input
                  id={`field-min-${index}`}
                  type="number"
                  value={field.minimum || ''}
                  onChange={(e) => updateField(index, { ...field, minimum: parseInt(e.target.value) || undefined })}
                  placeholder="Minimum value"
                />
              </div>
              <div>
                <Label htmlFor={`field-max-${index}`}>Maximum</Label>
                <Input
                  id={`field-max-${index}`}
                  type="number"
                  value={field.maximum || ''}
                  onChange={(e) => updateField(index, { ...field, maximum: parseInt(e.target.value) || undefined })}
                  placeholder="Maximum value"
                />
              </div>
            </div>
          )}

          {field.type === 'repeatable_group' && (
            <div>
              <Label htmlFor={`field-repeat-${index}`}>Repeat Count Field</Label>
              <Input
                id={`field-repeat-${index}`}
                value={field.repeat_count_field || ''}
                onChange={(e) => updateField(index, { ...field, repeat_count_field: e.target.value })}
                placeholder="Field key that controls repeat count"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template ? 'Edit Template' : 'Create New Template'}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {previewMode ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {companyHeader && (
                    <div className="border-b pb-4">
                      <h3 className="font-semibold mb-2">Company Header</h3>
                      <div className="bg-muted p-4 rounded whitespace-pre-wrap">
                        {companyHeader}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-semibold mb-4">{editingTemplate.title}</h3>
                    <div className="space-y-4">
                      {editingTemplate.fields.map((field, index) => (
                        <div key={field.key} className="border rounded p-3">
                          <Label className="font-medium">
                            {field.label} {field.required && <span className="text-destructive">*</span>}
                          </Label>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Type: {field.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {companyFooter && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Company Footer</h3>
                      <div className="bg-muted p-4 rounded whitespace-pre-wrap">
                        {companyFooter}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Template Settings */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Template Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="template-code">Template Code</Label>
                    <Input
                      id="template-code"
                      value={editingTemplate.code}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="TEMPLATE_CODE"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="template-title">Title</Label>
                    <Input
                      id="template-title"
                      value={editingTemplate.title}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Template Title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="template-stage">Stage</Label>
                    <Select
                      value={editingTemplate.stage}
                      onValueChange={(value) => setEditingTemplate(prev => ({ ...prev, stage: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(stage => (
                          <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="template-version">Version</Label>
                    <Input
                      id="template-version"
                      value={editingTemplate.version}
                      onChange={(e) => setEditingTemplate(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="1.0"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Company Branding */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Branding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="company-header">Company Header</Label>
                    <Textarea
                      id="company-header"
                      value={companyHeader}
                      onChange={(e) => setCompanyHeader(e.target.value)}
                      placeholder="Enter company header content..."
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company-footer">Company Footer</Label>
                    <Textarea
                      id="company-footer"
                      value={companyFooter}
                      onChange={(e) => setCompanyFooter(e.target.value)}
                      placeholder="Enter company footer content..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Output Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Output Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="filename-pattern">Filename Pattern</Label>
                    <Input
                      id="filename-pattern"
                      value={editingTemplate.output.filename}
                      onChange={(e) => setEditingTemplate(prev => ({
                        ...prev,
                        output: { ...prev.output, filename: e.target.value }
                      }))}
                      placeholder="${code}_${case.id}_${now:YYYYMMDD}.pdf"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timeline-event">Timeline Event</Label>
                    <Input
                      id="timeline-event"
                      value={editingTemplate.output.timeline_event}
                      onChange={(e) => setEditingTemplate(prev => ({
                        ...prev,
                        output: { ...prev.output, timeline_event: e.target.value }
                      }))}
                      placeholder="Document generated"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fields Editor */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Form Fields</h3>
                <Button onClick={addField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {editingTemplate.fields.map((field, index) => 
                  renderFieldEditor(field, index)
                )}
                
                {editingTemplate.fields.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No fields added yet. Click "Add Field" to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};