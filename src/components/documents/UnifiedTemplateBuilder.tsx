import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import DOMPurify from 'dompurify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  FileText, Image as ImageIcon, Palette, Settings, Upload, Download, Code,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, AlignLeft,
  AlignCenter, AlignRight, Table as TableIcon, Undo, Redo, Eye, Plus,
  Building2, Briefcase, User, Landmark, Calendar, Hash, Mail, Phone,
  FileType, Sparkles, Save, Shield
} from 'lucide-react';
import { FormField } from '@/services/formTemplatesService';
import { CASE_STAGES } from '@/utils/stageUtils';
import { useAdvancedRBAC } from '@/hooks/useAdvancedRBAC';
import { getMockData } from '@/services/seedTemplatesService';
import { ThreeLayerHelp } from '@/components/ui/three-layer-help';

export interface UnifiedTemplate {
  // Metadata
  templateCode: string;
  title: string;
  stage: string;
  version: string;
  visibility: 'admin' | 'team' | 'all';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Content
  richContent: string;
  fields: FormField[];
  variableMappings: Record<string, string>;
  
  // Branding
  branding: {
    logo?: string;
    header?: string;
    footer?: string;
    watermark?: {
      enabled: boolean;
      opacity: number;
    };
    font?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  
  // Output
  output: {
    format: 'PDF' | 'DOCX' | 'HTML';
    orientation: 'Portrait' | 'Landscape';
    pageSize: 'A4' | 'Letter' | 'Legal';
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    includeHeader: boolean;
    includeFooter: boolean;
    includePageNumbers: boolean;
    filenamePattern: string;
  };
  
  // Template type identifier
  templateType: 'unified';
  sourceType?: 'richtext' | 'fields' | 'docx' | 'json';
}

interface UnifiedTemplateBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: UnifiedTemplate) => void;
  initialTemplate?: UnifiedTemplate | null;
}

interface FieldLibraryItem {
  key: string;
  label: string;
  type: string;
  category: 'client' | 'case' | 'employee' | 'court' | 'system';
  prefillPath?: string;
  description?: string;
  icon: any;
}

const FIELD_LIBRARY: FieldLibraryItem[] = [
  // Client Fields
  { key: 'client_name', label: 'Client Name', type: 'string', category: 'client', prefillPath: 'client.name', description: 'Full legal name', icon: Building2 },
  { key: 'client_gstin', label: 'Client GSTIN', type: 'string', category: 'client', prefillPath: 'client.gstin', description: 'GST identification number', icon: Hash },
  { key: 'client_address', label: 'Client Address', type: 'textarea', category: 'client', prefillPath: 'client.address', description: 'Complete address', icon: Building2 },
  { key: 'client_email', label: 'Client Email', type: 'string', category: 'client', prefillPath: 'client.email', description: 'Contact email', icon: Mail },
  { key: 'client_phone', label: 'Client Phone', type: 'string', category: 'client', prefillPath: 'client.phone', description: 'Contact number', icon: Phone },
  
  // Case Fields
  { key: 'case_number', label: 'Case Number', type: 'string', category: 'case', prefillPath: 'case.caseNumber', description: 'Unique case ID', icon: FileType },
  { key: 'case_title', label: 'Case Title', type: 'string', category: 'case', prefillPath: 'case.title', description: 'Case description', icon: Briefcase },
  { key: 'case_stage', label: 'Current Stage', type: 'string', category: 'case', prefillPath: 'case.currentStage', description: 'Litigation stage', icon: Briefcase },
  { key: 'notice_type', label: 'Notice Type', type: 'string', category: 'case', prefillPath: 'case.noticeType', description: 'Type of notice', icon: FileText },
  { key: 'notice_number', label: 'Notice Number', type: 'string', category: 'case', prefillPath: 'case.noticeNumber', description: 'Official reference', icon: Hash },
  { key: 'notice_date', label: 'Notice Date', type: 'date', category: 'case', prefillPath: 'case.noticeDate', description: 'Date of issuance', icon: Calendar },
  { key: 'demand_amount', label: 'Demand Amount', type: 'number', category: 'case', prefillPath: 'case.demandAmount', description: 'Amount in dispute', icon: Hash },
  
  // Employee Fields
  { key: 'employee_name', label: 'Attorney Name', type: 'string', category: 'employee', prefillPath: 'employee.name', description: 'Assigned attorney', icon: User },
  { key: 'employee_email', label: 'Attorney Email', type: 'string', category: 'employee', prefillPath: 'employee.email', description: 'Contact email', icon: Mail },
  { key: 'employee_phone', label: 'Attorney Phone', type: 'string', category: 'employee', prefillPath: 'employee.phone', description: 'Phone number', icon: Phone },
  
  // Court Fields
  { key: 'court_name', label: 'Legal Forum Name', type: 'string', category: 'court', prefillPath: 'court.name', description: 'Name of legal forum', icon: Landmark },
  { key: 'court_location', label: 'Legal Forum Location', type: 'string', category: 'court', prefillPath: 'court.location', description: 'City/State', icon: Landmark },
  
  // System Fields
  { key: 'current_date', label: 'Current Date', type: 'date', category: 'system', prefillPath: 'system.currentDate', description: 'Today\'s date', icon: Calendar },
  { key: 'financial_year', label: 'Financial Year', type: 'string', category: 'system', prefillPath: 'system.financialYear', description: 'Current FY', icon: Calendar },
];

// Using canonical CASE_STAGES from stageUtils
const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins'];

const createDefaultTemplate = (): UnifiedTemplate => ({
  templateCode: '',
  title: '',
  stage: '',
  version: '1.0',
  visibility: 'team',
  createdBy: 'Current User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  richContent: '<p>Start typing your template content here...</p>',
  fields: [],
  variableMappings: {},
  branding: {
    header: 'H-Office Legal Team – GST Practice',
    footer: 'Confidential | Generated via Beacon 5.0',
    watermark: { enabled: false, opacity: 10 },
    font: 'Inter',
    primaryColor: '#0B5FFF',
    accentColor: '#00C2A8',
  },
  output: {
    format: 'PDF',
    orientation: 'Portrait',
    pageSize: 'A4',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
    includeHeader: true,
    includeFooter: true,
    includePageNumbers: true,
    filenamePattern: '${code}_${case.caseNumber}_${now:YYYYMMDD}.pdf',
  },
  templateType: 'unified',
  sourceType: 'richtext',
});

export const UnifiedTemplateBuilder: React.FC<UnifiedTemplateBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTemplate
}) => {
  const { can } = useAdvancedRBAC();
  const isAdmin = can('admin', 'admin');
  const isEditMode = !!initialTemplate;
  
  const [activeTab, setActiveTab] = useState<'design' | 'fields' | 'branding' | 'output' | 'import'>('design');
  
  // Merge initialTemplate with defaults to ensure all nested properties exist
  const mergeWithDefaults = (template: UnifiedTemplate | null | undefined): UnifiedTemplate => {
    const defaults = createDefaultTemplate();
    if (!template) return defaults;
    return {
      ...defaults,
      ...template,
      branding: {
        ...defaults.branding,
        ...(template.branding || {}),
        watermark: {
          ...defaults.branding.watermark,
          ...(template.branding?.watermark || {}),
        },
      },
      output: {
        ...defaults.output,
        ...(template.output || {}),
        margins: {
          ...defaults.output.margins,
          ...(template.output?.margins || {}),
        },
      },
    };
  };
  
  const [templateData, setTemplateData] = useState<UnifiedTemplate>(
    mergeWithDefaults(initialTemplate)
  );
  
  // Update templateData when initialTemplate changes
  useEffect(() => {
    setTemplateData(mergeWithDefaults(initialTemplate));
  }, [initialTemplate]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState(false);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: templateData.richContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[450px] p-6 bg-background',
      },
    },
    onUpdate: ({ editor }) => {
      updateTemplateData({ richContent: editor.getHTML() });
    },
  });

  useEffect(() => {
    if (editor && templateData.richContent !== editor.getHTML()) {
      editor.commands.setContent(templateData.richContent);
    }
  }, [templateData.richContent]);

  const updateTemplateData = (updates: Partial<UnifiedTemplate>) => {
    // Defensive deep-merge with defaults so nested objects (branding/output/margins)
    // can never become undefined due to partial updates.
    setTemplateData((prev) => {
      const merged = mergeWithDefaults({
        ...prev,
        ...updates,
      } as UnifiedTemplate);

      return {
        ...merged,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const generateTemplateCode = () => {
    const stage = templateData.stage.toUpperCase().replace(/\s+/g, '_');
    const timestamp = Date.now().toString().slice(-6);
    const code = `${stage}_TEMPLATE_${timestamp}`;
    updateTemplateData({ templateCode: code });
  };

  const insertVariable = (field: FieldLibraryItem) => {
    if (editor) {
      const variable = `{{${field.key}}}`;
      editor.chain().focus().insertContent(variable + ' ').run();
      
      // Add to variable mappings
      updateTemplateData({
        variableMappings: {
          ...templateData.variableMappings,
          [field.key]: field.prefillPath || field.key,
        },
      });
    }
  };

  const addField = (field: FieldLibraryItem) => {
    const newField: FormField = {
      key: field.key,
      label: field.label,
      type: field.type as any,
      required: false,
    };
    
    const exists = templateData.fields.some(f => f.key === field.key);
    if (!exists) {
      // Add to fields list and mappings
      updateTemplateData({
        fields: [...templateData.fields, newField],
        variableMappings: {
          ...templateData.variableMappings,
          [field.key]: field.prefillPath || field.key,
        },
      });
      
      // Also insert the variable into the editor content
      if (editor) {
        const variable = `{{${field.key}}}`;
        editor.chain().focus().insertContent(variable + ' ').run();
      }
      
      toast({ title: 'Field Added', description: `${field.label} added to template and editor` });
    } else {
      toast({ title: 'Field Already Added', description: `${field.label} is already in your template`, variant: 'destructive' });
    }
  };

  const removeField = (fieldKey: string) => {
    updateTemplateData({
      fields: templateData.fields.filter(f => f.key !== fieldKey),
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'File Too Large', description: 'Logo must be under 2MB', variant: 'destructive' });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setLogoFile(base64);
        updateTemplateData({
          branding: { ...templateData.branding, logo: base64 },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast({ title: 'Invalid File', description: 'Please upload a .docx file', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'DOCX must be under 10MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    setDocxFile(file);

    try {
      const { docxTemplateService } = await import('@/services/docxTemplateService');
      const { detectedVariables } = await docxTemplateService.parseDocxTemplate(file);
      
      setDetectedVariables(detectedVariables.map(v => v.placeholder));
      
      toast({
        title: 'DOCX Uploaded',
        description: `Detected ${detectedVariables.length} variables`,
      });
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      toast({
        title: 'Upload Failed',
        description: 'Could not parse DOCX file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(templateData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${templateData.templateCode}_${templateData.version}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'JSON Exported',
      description: `Template exported successfully`,
    });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Validate JSON structure
        if (!json.templateCode || !json.title || !json.richContent) {
          throw new Error('Invalid template JSON structure');
        }
        
        updateTemplateData({
          ...json,
          updatedAt: new Date().toISOString(),
        });
        
        toast({
          title: 'JSON Imported',
          description: `Template "${json.title}" imported successfully`,
        });
      } catch (error) {
        console.error('Error importing JSON:', error);
        toast({
          title: 'Import Failed',
          description: 'Invalid JSON file format',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const renderPreview = () => {
    const mockData = getMockData();
    
    let previewContent = templateData.richContent;
    
    // Replace variables with mock data
    Object.entries(templateData.variableMappings).forEach(([variable, path]) => {
      const pathParts = path.split('.');
      let value: any = mockData;
      
      for (const part of pathParts) {
        if (value && typeof value === 'object') {
          value = value[part];
        }
      }
      
      if (value) {
        previewContent = previewContent.replace(
          new RegExp(`{{${variable}}}`, 'g'),
          String(value)
        );
      }
    });

    return (
      <div className="bg-background border rounded-lg shadow-lg mx-auto" style={{ 
        width: templateData.output.pageSize === 'A4' ? '210mm' : '216mm',
        minHeight: '297mm',
        padding: `${templateData.output.margins.top}mm ${templateData.output.margins.right}mm ${templateData.output.margins.bottom}mm ${templateData.output.margins.left}mm`
      }}>
        {/* Header */}
        {templateData.output.includeHeader && templateData.branding.header && (
          <div className="pb-4 mb-6 border-b-2" style={{ borderColor: templateData.branding.primaryColor || '#0B5FFF' }}>
            {templateData.branding.logo && (
              <img src={templateData.branding.logo} alt="Logo" className="h-12 mb-2" />
            )}
            <h2 className="text-lg font-semibold" style={{ color: templateData.branding.primaryColor || '#0B5FFF' }}>
              {templateData.branding.header}
            </h2>
          </div>
        )}

        {/* Watermark */}
        {templateData.branding.watermark?.enabled && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
            <div 
              className="text-6xl font-bold transform -rotate-45"
              style={{ 
                opacity: (templateData.branding.watermark.opacity || 10) / 100,
                color: templateData.branding.primaryColor || '#0B5FFF'
              }}
            >
              CONFIDENTIAL
            </div>
          </div>
        )}

        {/* Content */}
        <div 
          className="prose prose-sm max-w-none relative z-10"
          style={{ fontFamily: templateData.branding.font || 'Inter' }}
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(previewContent, {
              ALLOWED_TAGS: ['p', 'div', 'span', 'b', 'i', 'u', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img'],
              ALLOWED_ATTR: ['style', 'class', 'colspan', 'rowspan', 'src', 'alt', 'width', 'height']
            })
          }}
        />

        {/* Footer */}
        {templateData.output.includeFooter && templateData.branding.footer && (
          <div className="pt-4 mt-6 border-t text-sm text-muted-foreground">
            <p>{templateData.branding.footer}</p>
            {templateData.output.includePageNumbers && (
              <p className="text-right text-xs mt-2">Page 1</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleSave = () => {
    // Validation
    if (!templateData.templateCode.trim()) {
      toast({ title: 'Validation Error', description: 'Template code is required', variant: 'destructive' });
      setActiveTab('design');
      return;
    }
    if (!templateData.title.trim()) {
      toast({ title: 'Validation Error', description: 'Template title is required', variant: 'destructive' });
      setActiveTab('design');
      return;
    }
    if (!templateData.stage) {
      toast({ title: 'Validation Error', description: 'Stage is required', variant: 'destructive' });
      setActiveTab('design');
      return;
    }

    onSave(templateData);
  };

  const filteredFields = FIELD_LIBRARY.filter(field => {
    const matchesSearch = field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || field.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(FIELD_LIBRARY.map(f => f.category)))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] h-[98vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-3 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isEditMode ? 'Edit Template' : 'Template Builder 2.0'}
          </DialogTitle>
          
          {/* Header Metadata - Compact Grid */}
          <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
            <div className="space-y-1">
              <ThreeLayerHelp helpId="tb2_template_code" showExplanation={false} />
              <div className="flex gap-2">
                  <Input
                    value={templateData.templateCode}
                    onChange={(e) => updateTemplateData({ templateCode: e.target.value })}
                    placeholder="AUTO_GENERATED"
                    className="h-7 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={generateTemplateCode} className="h-7 px-2">
                  <Sparkles className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-1">
              <ThreeLayerHelp helpId="tb2_template_title" showExplanation={false} />
              <Input
                value={templateData.title}
                onChange={(e) => updateTemplateData({ title: e.target.value })}
                placeholder="e.g., GST Scrutiny Response"
                className="h-7 text-sm"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <ThreeLayerHelp helpId="tb2_stage" showExplanation={false} />
                <Select value={templateData.stage} onValueChange={(stage) => updateTemplateData({ stage })}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <ThreeLayerHelp helpId="tb2_version" showExplanation={false} />
                <Input value={templateData.version} readOnly className="h-7 text-sm bg-muted" />
              </div>
              
              <div className="space-y-1">
                <ThreeLayerHelp helpId="tb2_visibility" showExplanation={false} />
                <Select 
                  value={templateData.visibility} 
                  onValueChange={(visibility: any) => updateTemplateData({ visibility })}
                >
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-6 pt-2">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="design" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Design
              </TabsTrigger>
              <TabsTrigger value="fields" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Fields
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="output" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Output
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2" disabled={!isAdmin}>
                <Upload className="h-4 w-4" />
                Import/Export
                {!isAdmin && <Badge variant="outline" className="text-xs ml-auto">Admin Only</Badge>}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Design */}
          <TabsContent value="design" className="flex-1 flex gap-4 px-6 pb-3 overflow-hidden mt-2 min-h-0">
            {/* Left Sidebar - Variables */}
            <div className="w-72 flex flex-col border rounded-lg overflow-hidden min-h-0">
              <div className="p-2 bg-muted/50 border-b shrink-0">
                <ThreeLayerHelp helpId="tb2_variable_list" showExplanation={false}>
                  <h3 className="font-medium text-sm">Insert Variables</h3>
                </ThreeLayerHelp>
                <p className="text-xs text-muted-foreground">Click to insert into editor</p>
              </div>
              
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mx-2 my-2 h-7 text-sm shrink-0"
                style={{ width: 'calc(100% - 16px)' }}
              />
              
              <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
                {categories.map(cat => {
                  const categoryFields = filteredFields.filter(f => cat === 'all' || f.category === cat);
                  if (categoryFields.length === 0) return null;
                  
                  return (
                    <div key={cat}>
                      <h4 className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                        {cat}
                      </h4>
                      {categoryFields.map(field => {
                        const Icon = field.icon;
                        return (
                          <Button
                            key={field.key}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-auto py-1.5 mb-0.5"
                            onClick={() => insertVariable(field)}
                          >
                            <Icon className="h-3 w-3 mr-2 text-muted-foreground shrink-0" />
                            <span className="truncate">{field.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel - Editor */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Editor Toolbar */}
              <div className="border rounded-t-lg bg-muted/50 p-2 flex gap-1 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={cn(editor?.isActive('bold') && 'bg-primary/10')}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={cn(editor?.isActive('italic') && 'bg-primary/10')}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={cn(editor?.isActive('underline') && 'bg-primary/10')}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={cn(editor?.isActive('bulletList') && 'bg-primary/10')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={cn(editor?.isActive('orderedList') && 'bg-primary/10')}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                  className={cn(editor?.isActive({ textAlign: 'left' }) && 'bg-primary/10')}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                  className={cn(editor?.isActive({ textAlign: 'center' }) && 'bg-primary/10')}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                  className={cn(editor?.isActive({ textAlign: 'right' }) && 'bg-primary/10')}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-6" />
                <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().undo().run()}>
                  <Undo className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().redo().run()}>
                  <Redo className="h-4 w-4" />
                </Button>
              </div>

              {/* Editor Content - flex-1 with proper min-h-0 for scrolling */}
              <ScrollArea className="flex-1 border border-t-0 rounded-b-lg min-h-0">
                {previewMode ? (
                  <div className="bg-background p-6">
                    {renderPreview()}
                  </div>
                ) : (
                  <div className="min-h-0 flex flex-col">
                    <EditorContent editor={editor} className="flex-1" />
                  </div>
                )}
              </ScrollArea>

              {/* Preview Toggle - Compact */}
              <div className="border-t p-1.5 flex justify-between items-center bg-muted/30 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {previewMode ? 'Preview Mode' : 'Editor Mode'}
                </span>
                <Button
                  variant={previewMode ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  {previewMode ? 'Editor' : 'Preview'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Fields */}
          <TabsContent value="fields" className="flex-1 flex gap-4 px-6 pb-3 overflow-hidden mt-2 min-h-0">
            <div className="w-1/3 flex flex-col border rounded-lg overflow-hidden min-h-0">
              <div className="p-2 bg-muted/50 border-b shrink-0">
                <ThreeLayerHelp helpId="tb2_field_library" showExplanation={false}>
                  <h3 className="font-medium text-sm">Field Library</h3>
                </ThreeLayerHelp>
                <p className="text-xs text-muted-foreground">Available data fields</p>
              </div>
              
              <div className="p-2 border-b flex gap-2 shrink-0">
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 h-7 text-sm"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-24 h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
                {filteredFields.map(field => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-xs truncate">{field.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{field.description}</div>
                        </div>
                      </div>
                      <Button size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => addField(field)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-2/3 flex flex-col border rounded-lg overflow-hidden min-h-0">
              <div className="p-3 bg-muted/50 border-b shrink-0">
                <h3 className="font-medium text-sm">Selected Fields ({templateData.fields.length})</h3>
                <p className="text-xs text-muted-foreground">Fields in your template</p>
              </div>
              
              <ScrollArea className="flex-1 min-h-0">
                {templateData.fields.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No fields added yet</p>
                    <p className="text-xs">Add fields from the library</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {templateData.fields.map(field => (
                      <div key={field.key} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium text-sm">{field.label}</div>
                          <div className="text-xs text-muted-foreground">
                            Type: {field.type} • Key: {field.key}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => removeField(field.key)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Tab 3: Branding */}
          <TabsContent value="branding" className="flex-1 px-6 pb-3 overflow-auto mt-2 min-h-0">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="space-y-6 p-6 border rounded-lg">
                <div className="space-y-2">
                  <ThreeLayerHelp helpId="tb2_logo" showExplanation={false} />
                  <div className="mt-2 flex items-center gap-4">
                    {logoFile ? (
                      <img src={logoFile} alt="Logo" className="h-16 w-16 object-contain border rounded" />
                    ) : (
                      <div className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG (Max 2MB)</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="header">Company Header</Label>
                  <Textarea
                    id="header"
                    value={templateData.branding.header}
                    onChange={(e) => updateTemplateData({
                      branding: { ...templateData.branding, header: e.target.value }
                    })}
                    placeholder="Company name, tagline, GST practice"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="footer">Company Footer</Label>
                  <Textarea
                    id="footer"
                    value={templateData.branding.footer}
                    onChange={(e) => updateTemplateData({
                      branding: { ...templateData.branding, footer: e.target.value }
                    })}
                    placeholder="Confidentiality notice, generated by system"
                    className="mt-2"
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Watermark</Label>
                      <p className="text-xs text-muted-foreground">Add background watermark</p>
                    </div>
                    <Switch
                      checked={templateData.branding.watermark?.enabled}
                      onCheckedChange={(enabled) => updateTemplateData({
                        branding: {
                          ...templateData.branding,
                          watermark: { ...templateData.branding.watermark!, enabled }
                        }
                      })}
                    />
                  </div>
                  
                  {templateData.branding.watermark?.enabled && (
                    <div>
                      <Label>Opacity: {templateData.branding.watermark.opacity}%</Label>
                      <Slider
                        value={[templateData.branding.watermark.opacity]}
                        onValueChange={([opacity]) => updateTemplateData({
                          branding: {
                            ...templateData.branding,
                            watermark: { ...templateData.branding.watermark!, opacity }
                          }
                        })}
                        min={0}
                        max={100}
                        step={5}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <ThreeLayerHelp helpId="tb2_font" showExplanation={false} />
                  <p className="text-[12px] text-muted-foreground">Primary font for document text</p>
                  <Select
                    value={templateData.branding.font}
                    onValueChange={(font) => updateTemplateData({
                      branding: { ...templateData.branding, font }
                    })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <ThreeLayerHelp helpId="tb2_colors" showExplanation={false} />
                  <p className="text-[12px] text-muted-foreground">Brand colors for document</p>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="primary-color" className="text-xs">Primary</Label>
                      <Input
                        id="primary-color"
                        type="color"
                        value={templateData.branding.primaryColor}
                        onChange={(e) => updateTemplateData({
                          branding: { ...templateData.branding, primaryColor: e.target.value }
                        })}
                        className="h-10 mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="accent-color" className="text-xs">Accent</Label>
                      <Input
                        id="accent-color"
                        type="color"
                        value={templateData.branding.accentColor}
                        onChange={(e) => updateTemplateData({
                          branding: { ...templateData.branding, accentColor: e.target.value }
                        })}
                        className="h-10 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Output */}
          <TabsContent value="output" className="flex-1 px-6 pb-4 overflow-auto mt-4 min-h-0">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="space-y-6 p-6 border rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <ThreeLayerHelp helpId="tb2_format" showExplanation={false} />
                    <p className="text-[12px] text-muted-foreground">File format for generated documents</p>
                    <Select
                      value={templateData.output.format}
                      onValueChange={(format: any) => updateTemplateData({
                        output: { ...templateData.output, format }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="DOCX">DOCX</SelectItem>
                        <SelectItem value="HTML">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <ThreeLayerHelp helpId="tb2_page_size" showExplanation={false} />
                    <p className="text-[12px] text-muted-foreground">Paper size for document layout</p>
                    <Select
                      value={templateData.output.pageSize}
                      onValueChange={(pageSize: any) => updateTemplateData({
                        output: { ...templateData.output, pageSize }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <ThreeLayerHelp helpId="tb2_orientation" showExplanation={false} />
                    <p className="text-[12px] text-muted-foreground">Portrait or Landscape</p>
                    <RadioGroup
                      value={templateData.output.orientation}
                      onValueChange={(orientation: any) => updateTemplateData({
                        output: { ...templateData.output, orientation }
                      })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Portrait" id="portrait" />
                        <Label htmlFor="portrait">Portrait</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Landscape" id="landscape" />
                        <Label htmlFor="landscape">Landscape</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <ThreeLayerHelp helpId="tb2_margins" showExplanation={false} />
                  <p className="text-[12px] text-muted-foreground">White space around document edges</p>
                  <div className="grid grid-cols-4 gap-4 mt-2">
                    {['top', 'bottom', 'left', 'right'].map(side => (
                      <div key={side}>
                        <Label className="text-xs capitalize">{side}</Label>
                        <Input
                          type="number"
                          value={templateData.output.margins[side as keyof typeof templateData.output.margins]}
                          onChange={(e) => updateTemplateData({
                            output: {
                              ...templateData.output,
                              margins: {
                                ...templateData.output.margins,
                                [side]: parseInt(e.target.value) || 20
                              }
                            }
                          })}
                          min={10}
                          max={50}
                          className="mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <ThreeLayerHelp helpId="tb2_toggles" showExplanation={false}>
                    <div className="font-medium text-sm">Header/Footer Options</div>
                  </ThreeLayerHelp>
                  <p className="text-[12px] text-muted-foreground mb-3">Show/hide headers, footers, page numbers</p>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-header"
                      checked={templateData.output.includeHeader}
                      onCheckedChange={(checked) => updateTemplateData({
                        output: { ...templateData.output, includeHeader: !!checked }
                      })}
                    />
                    <Label htmlFor="include-header">Include Header</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-footer"
                      checked={templateData.output.includeFooter}
                      onCheckedChange={(checked) => updateTemplateData({
                        output: { ...templateData.output, includeFooter: !!checked }
                      })}
                    />
                    <Label htmlFor="include-footer">Include Footer</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-page-numbers"
                      checked={templateData.output.includePageNumbers}
                      onCheckedChange={(checked) => updateTemplateData({
                        output: { ...templateData.output, includePageNumbers: !!checked }
                      })}
                    />
                    <Label htmlFor="include-page-numbers">Page Numbers</Label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <ThreeLayerHelp helpId="tb2_filename" showExplanation={false} />
                  <p className="text-[12px] text-muted-foreground">Template for generated document names</p>
                  <Input
                    id="filename-pattern"
                    value={templateData.output.filenamePattern}
                    onChange={(e) => updateTemplateData({
                      output: { ...templateData.output, filenamePattern: e.target.value }
                    })}
                    placeholder="${code}_${case.caseNumber}_${now:YYYYMMDD}.pdf"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables: ${`{code}`}, ${`{case.caseNumber}`}, ${`{now:YYYYMMDD}`}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Import/Export */}
          <TabsContent value="import" className="flex-1 px-6 pb-4 overflow-auto mt-4">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="p-6 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="h-5 w-5" />
                  <ThreeLayerHelp helpId="tb2_docx_upload" showExplanation={false}>
                    <h3 className="font-medium">Upload DOCX Template</h3>
                  </ThreeLayerHelp>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a Word document with variable placeholders (e.g., {`{{client_name}}`}) for automatic detection and mapping. Max 10MB.
                </p>
                <Input
                  type="file"
                  accept=".docx"
                  onChange={handleDocxUpload}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                {isUploading && (
                  <p className="text-sm text-muted-foreground mt-2">Processing DOCX file...</p>
                )}
                {detectedVariables.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                      Detected {detectedVariables.length} variables:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {detectedVariables.map(variable => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-5 w-5" />
                  <ThreeLayerHelp helpId="tb2_json_import" showExplanation={false}>
                    <h3 className="font-medium">JSON Schema</h3>
                  </ThreeLayerHelp>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Export or import template configuration as JSON for backup, version control, and team sharing.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-lg hover:opacity-90" onClick={handleExportJSON}>
                    <Download className="mr-2 h-4 w-4" />
                    Download JSON
                  </Button>
                  <label className="flex-1">
                    <Button variant="outline" className="w-full rounded-lg hover:opacity-90" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Import JSON
                      </span>
                    </Button>
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">
                      Template Version: {templateData.version}
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Created: {new Date(templateData.createdAt).toLocaleDateString()} • 
                      Last Updated: {new Date(templateData.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-3 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-lg hover:opacity-90">
            Cancel
          </Button>
          <Button onClick={handleSave} className="rounded-lg hover:opacity-90">
            <Save className="mr-2 h-4 w-4" />
            Save & Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
