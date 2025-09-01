import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formTemplatesService, FormTemplate } from '@/services/formTemplatesService';
import { FormRenderModal } from './FormRenderModal';
import { useAppState } from '@/contexts/AppStateContext';
import { useRBAC } from '@/hooks/useRBAC';
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
  Clock
} from 'lucide-react';

export const TemplatesManagement: React.FC = () => {
  const { state } = useAppState();
  const { hasPermission } = useRBAC();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  const canEdit = hasPermission('admin', 'admin');
  const canGenerate = hasPermission('documents', 'write') || hasPermission('admin', 'admin');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await formTemplatesService.getAllTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.stage]) {
      acc[template.stage] = [];
    }
    acc[template.stage].push(template);
    return acc;
  }, {} as Record<string, FormTemplate[]>);

  const uniqueStages = [...new Set(templates.map(t => t.stage))];

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
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Form Templates</h2>
          <p className="text-muted-foreground mt-1">
            Statutory forms and templates for GST cases
          </p>
        </div>
        {canEdit && (
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Template
          </Button>
        )}
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
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
      </motion.div>

      {/* Templates Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-8"
      >
        {Object.entries(groupedTemplates).map(([stage, stageTemplates]) => (
          <div key={stage} className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">{stage}</h3>
              <Badge variant="outline" className={getStageColor(stage)}>
                {stageTemplates.length} template{stageTemplates.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stageTemplates.map((template) => (
                <Card key={template.code} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{template.title}</CardTitle>
                        <CardDescription className="text-xs">
                          <Code className="inline h-3 w-3 mr-1" />
                          {template.code}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={getStageColor(template.stage)}>
                        v{template.version}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Tag className="h-3 w-3" />
                          Auto-prefill: {Object.keys(template.prefill).length} field{Object.keys(template.prefill).length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(template)}
                          className="flex-1"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          Preview
                        </Button>
                        {canGenerate && (
                          <Button
                            size="sm"
                            onClick={() => handleGenerate(template)}
                            className="flex-1"
                          >
                            <Download className="mr-1 h-3 w-3" />
                            Generate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </motion.div>

      {/* No Results */}
      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
          <p className="text-muted-foreground">
            {searchTerm || stageFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No templates are available yet'
            }
          </p>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {selectedTemplate?.title}</DialogTitle>
            <DialogDescription>
              Template structure and field definitions
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Code:</span> {selectedTemplate.code}
                </div>
                <div>
                  <span className="font-medium">Stage:</span> {selectedTemplate.stage}
                </div>
                <div>
                  <span className="font-medium">Version:</span> {selectedTemplate.version}
                </div>
                <div>
                  <span className="font-medium">Fields:</span> {selectedTemplate.fields.length}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Form Fields:</h4>
                <div className="space-y-2">
                  {selectedTemplate.fields.map((field, index) => (
                    <div key={index} className="border rounded p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{field.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Key: {field.key}
                        {field.required && <span className="text-red-500 ml-2">Required</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Modal */}
      {selectedTemplate && (
        <FormRenderModal
          isOpen={generateModalOpen}
          onClose={() => setGenerateModalOpen(false)}
          template={selectedTemplate}
          selectedCaseId={selectedCaseId || undefined}
          onFormGenerated={() => {
            setGenerateModalOpen(false);
            toast({
              title: "Form Generated",
              description: `${selectedTemplate.title} has been generated successfully.`,
            });
          }}
        />
      )}

      {/* Case Selector for Generate */}
      {generateModalOpen && !selectedCaseId && (
        <Dialog open={true} onOpenChange={() => setGenerateModalOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Case</DialogTitle>
              <DialogDescription>
                Choose a case to generate the template for
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Select onValueChange={setSelectedCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case..." />
                </SelectTrigger>
                <SelectContent>
                  {state.cases.map(case_ => {
                    const client = state.clients.find(c => c.id === case_.clientId);
                    return (
                      <SelectItem key={case_.id} value={case_.id}>
                        {case_.title} - {client?.name || 'Unknown Client'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedCaseId) {
                      // This will trigger the FormRenderModal to open
                    }
                  }}
                  disabled={!selectedCaseId}
                >
                  Continue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};