import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationGuide } from './OrganizationGuide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { formTemplatesService, FormTemplate } from '@/services/formTemplatesService';
import { customTemplatesService, CustomTemplate } from '@/services/customTemplatesService';
import { FormRenderModal } from './FormRenderModal';
import { TemplateEditor } from './TemplateEditor';
import { TemplateBuilder } from './TemplateBuilder';
import { RichTextTemplateBuilder } from './RichTextTemplateBuilder';
import { TemplateUploadModal } from './TemplateUploadModal';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { HelpButton } from '@/components/ui/help-button';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Edit,
  Plus,
  Code,
  Calendar,
  Tag,
  CheckCircle,
  Clock,
  Wrench,
  Copy,
  Import,
  Trash2,
  History
} from 'lucide-react';

export const TemplatesManagement: React.FC = () => {
  const { state } = useAppState();
  const { hasPermission } = useRBAC();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [richTextBuilderOpen, setRichTextBuilderOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('standard');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const canEdit = hasPermission('admin', 'admin');
  const canGenerate = hasPermission('documents', 'write') || hasPermission('admin', 'admin');

  useEffect(() => {
    loadTemplates();
    loadCustomTemplates();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F focuses template search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // / key opens global search (handled by header component)
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templatesData = await formTemplatesService.getAllTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomTemplates = async () => {
    try {
      const customTemplatesData = await customTemplatesService.getCustomTemplates();
      setCustomTemplates(customTemplatesData);
    } catch (error) {
      console.error('Error loading custom templates:', error);
      toast({
        title: "Error",
        description: "Failed to load custom templates",
        variant: "destructive",
      });
    }
  };

  const handlePreview = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleGenerate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setGenerateModalOpen(true);
  };

  const handleEdit = (template: FormTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDuplicate = async (template: CustomTemplate) => {
    try {
      await customTemplatesService.duplicateTemplate(template.id, `${template.title} (Copy)`);
      await loadCustomTemplates();
      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (template: CustomTemplate) => {
    try {
      await customTemplatesService.deleteTemplate(template.id);
      await loadCustomTemplates();
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleSaveTemplate = async (template: FormTemplate) => {
    try {
      if (editingTemplate && 'isCustom' in editingTemplate) {
        // Update existing custom template
        await customTemplatesService.updateTemplate((editingTemplate as CustomTemplate).id, template);
      } else {
        // Create new custom template from standard template or new template
        await customTemplatesService.saveTemplate({
          ...template,
          createdBy: 'Current User'
        });
      }
      
      await loadCustomTemplates();
      setEditorOpen(false);
      setEditingTemplate(null);
      
      toast({
        title: "Success",
        description: editingTemplate ? "Template updated successfully" : "Template created successfully",
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleCreateFromBuilder = async (template: FormTemplate) => {
    try {
      await customTemplatesService.saveTemplate({
        ...template,
        createdBy: 'Current User',
        templateType: 'builder'
      });
      
      await loadCustomTemplates();
      setBuilderOpen(false);
      
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const handleCreateFromRichTextBuilder = async (templateData: {
    code: string;
    title: string;
    stage: string;
    richContent: string;
    variableMappings: Record<string, string>;
  }) => {
    try {
      await customTemplatesService.saveTemplate({
        code: templateData.code,
        title: templateData.title,
        stage: templateData.stage,
        version: '1.0',
        prefill: {},
        fields: [],
        output: {
          filename: `${templateData.code}_\${now:YYYYMMDD}.pdf`,
          dms_folder_by_stage: true,
          timeline_event: `Generated ${templateData.title}`
        },
        richContent: templateData.richContent,
        variableMappings: templateData.variableMappings,
        createdBy: 'Current User',
        templateType: 'richtext'
      });
      
      await loadCustomTemplates();
      setRichTextBuilderOpen(false);
      
      toast({
        title: "Rich Text Template Created",
        description: "Your custom rich text template has been created successfully."
      });
    } catch (error) {
      console.error('Error creating rich text template:', error);
      toast({
        title: "Error",
        description: "Failed to create rich text template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateFromUpload = async (uploadData: {
    code: string;
    title: string;
    stage: string;
    docxFile: Blob;
    variableMappings: any[];
  }) => {
    try {
      // Convert Blob to base64 using Promise
      const base64File = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(uploadData.docxFile);
      });
      
      // Convert variableMappings array to Record<string, string>
      const mappingsRecord = uploadData.variableMappings.reduce((acc, mapping) => {
        acc[mapping.placeholder] = mapping.systemPath;
        return acc;
      }, {} as Record<string, string>);

      // Save template
      await customTemplatesService.saveTemplate({
        code: uploadData.code,
        title: uploadData.title,
        stage: uploadData.stage,
        version: '1.0',
        prefill: {},
        fields: [],
        output: {
          filename: `${uploadData.code}_\${now:YYYYMMDD}.docx`,
          dms_folder_by_stage: true,
          timeline_event: `Generated ${uploadData.title}`
        },
        docxFile: base64File,
        variableMappings: mappingsRecord,
        createdBy: 'Current User',
        templateType: 'docx'
      });
      
      // Reload templates and close modal
      await loadCustomTemplates();
      setUploadModalOpen(false);
      
      toast({
        title: "DOCX Template Uploaded",
        description: "Your Word template has been uploaded successfully."
      });
    } catch (error) {
      console.error('Error uploading DOCX template:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Scrutiny': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Demand': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'Adjudication': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Appeals': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Tribunal': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'High Court': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Supreme Court': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || template.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const filteredCustomTemplates = customTemplates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === 'all' || template.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const stage = template.stage;
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(template);
    return acc;
  }, {} as Record<string, FormTemplate[]>);

  const groupedCustomTemplates = filteredCustomTemplates.reduce((acc, template) => {
    const stage = template.stage;
    if (!acc[stage]) {
      acc[stage] = [];
    }
    acc[stage].push(template);
    return acc;
  }, {} as Record<string, CustomTemplate[]>);

  const allTemplates = [...templates, ...customTemplates];
  const uniqueStages = Array.from(new Set(allTemplates.map(t => t.stage)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Guide */}
      <OrganizationGuide />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Form Templates</h2>
          <p className="text-muted-foreground">
            Manage and generate compliance forms for different case stages
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <HelpButton helpId="button-rich-text-template" onClick={() => setRichTextBuilderOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Rich Text Template
            </HelpButton>
            <HelpButton helpId="button-docx-upload" variant="outline" onClick={() => setUploadModalOpen(true)}>
              <Import className="mr-2 h-4 w-4" />
              Upload DOCX
            </HelpButton>
            <HelpButton helpId="button-template-builder" variant="outline" onClick={() => setBuilderOpen(true)}>
              <Wrench className="mr-2 h-4 w-4" />
              Field Builder
            </HelpButton>
            <HelpButton helpId="button-create-template" variant="outline" onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
              <Code className="mr-2 h-4 w-4" />
              JSON Editor
            </HelpButton>
          </div>
        )}
      </div>

      {/* Unified Template Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search templates by title, code, content... (Press / for global search)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {uniqueStages.map(stage => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Templates ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="custom">Custom Templates ({filteredCustomTemplates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-6">
          {Object.entries(groupedTemplates).map(([stage, stageTemplates]) => (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4 flex items-center gap-2">
                <h3 className="text-lg font-semibold">{stage}</h3>
                <Badge variant="secondary">{stageTemplates.length}</Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stageTemplates.map((template, index) => (
                  <Card key={template.code} className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={getStageColor(template.stage)}>
                          {template.stage}
                        </Badge>
                        <Badge variant="secondary">v{template.version}</Badge>
                      </div>
                      <CardTitle className="text-lg leading-6">{template.title}</CardTitle>
                      <CardDescription className="text-sm">
                        Code: {template.code}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {template.fields.length} fields
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Standard
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handlePreview(template)}>
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Button>
                          {canGenerate && (
                            <Button size="sm" onClick={() => handleGenerate(template)}>
                              <Download className="mr-1 h-3 w-3" />
                              Generate
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No standard templates found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || stageFilter !== 'all' 
                  ? 'Try adjusting your search criteria.' 
                  : 'Standard templates will appear here.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          {/* Custom Templates Header with Action Button */}
          {canEdit && filteredCustomTemplates.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                New Custom Template
              </Button>
            </div>
          )}

          {/* Custom Templates Display */}
          {Object.entries(groupedCustomTemplates).map(([stage, stageTemplates]) => (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4 flex items-center gap-2">
                <h3 className="text-lg font-semibold">{stage}</h3>
                <Badge variant="secondary">{stageTemplates.length}</Badge>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {stageTemplates.map((template) => (
                  <Card key={template.id} className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={getStageColor(template.stage)}>
                          {template.stage}
                        </Badge>
                        <Badge variant="default">Custom</Badge>
                      </div>
                      <CardTitle className="text-lg leading-6">{template.title}</CardTitle>
                      <CardDescription className="text-sm">
                        Code: {template.code}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {template.fields.length} fields
                          </span>
                          <span className="flex items-center gap-1">
                            <Wrench className="h-4 w-4" />
                            {template.createdBy}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handlePreview(template)}>
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Button>
                          {canGenerate && (
                            <Button size="sm" onClick={() => handleGenerate(template)}>
                              <Download className="mr-1 h-3 w-3" />
                              Generate
                            </Button>
                          )}
                          {canEdit && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                                <Edit className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDuplicate(template)}>
                                <Copy className="mr-1 h-3 w-3" />
                                Duplicate
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(template)}>
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          ))}

          {filteredCustomTemplates.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No custom templates found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || stageFilter !== 'all' 
                  ? 'Try adjusting your search criteria.' 
                  : 'Create your first custom template to get started.'}
              </p>
              {canEdit && (
                <div className="flex gap-2 justify-center mt-4">
                  <Button onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Custom Template
                  </Button>
                  <Button variant="outline" onClick={() => setBuilderOpen(true)}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Template Builder
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {generateModalOpen && selectedTemplate && (
        <FormRenderModal
          isOpen={generateModalOpen}
          onClose={() => {
            setGenerateModalOpen(false);
            setSelectedTemplate(null);
            setSelectedCaseId('');
          }}
          template={selectedTemplate}
          selectedCaseId={selectedCaseId}
          
        />
      )}

      <TemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        isOpen={editorOpen}
      />

      {builderOpen && (
        <Dialog open={builderOpen} onOpenChange={() => setBuilderOpen(false)}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Template Builder</DialogTitle>
              <DialogDescription>
                Create a new template using predefined fields from your system
              </DialogDescription>
            </DialogHeader>
            <TemplateBuilder
              onCreateTemplate={handleCreateFromBuilder}
              onClose={() => setBuilderOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <RichTextTemplateBuilder
        isOpen={richTextBuilderOpen}
        onClose={() => setRichTextBuilderOpen(false)}
        onSave={handleCreateFromRichTextBuilder}
      />

      <TemplateUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSave={handleCreateFromUpload}
      />
    </div>
  );
};