import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Edit, Eye, Calendar, User, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormTemplate, formTemplatesService } from '@/services/formTemplatesService';
import { FormRenderModal } from './FormRenderModal';

interface FormTemplatesViewProps {
  selectedCaseId?: string;
  selectedCase?: any;
}

export const FormTemplatesView: React.FC<FormTemplatesViewProps> = ({ selectedCaseId, selectedCase }) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [selectedCase]);

  const loadTemplates = async () => {
    try {
      let templatesData: FormTemplate[];
      
      if (selectedCase?.currentStage) {
        // Load templates for the selected case's current stage
        templatesData = await formTemplatesService.getTemplatesByLifecycleStage(selectedCase.currentStage);
      } else {
        // Fallback: load all templates if no case is selected
        templatesData = await formTemplatesService.getAllTemplates();
      }
      
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load form templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'Scrutiny': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Demand': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Adjudication': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Appeals': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'GSTAT': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'HC': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'SC': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      // Legacy template categories for backward compatibility
      'Tribunal': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'High Court': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Supreme Court': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return stageColors[stage] || 'bg-muted text-muted-foreground';
  };

  const handleTemplateSelect = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setFormModalOpen(true);
  };

  const groupedTemplates = templates.reduce((groups, template) => {
    // Convert template category to lifecycle stage for consistent grouping
    const lifecycleStage = formTemplatesService.getLifecycleStageFromTemplateCategory(template.stage);
    const displayStage = lifecycleStage;
    
    if (!groups[displayStage]) {
      groups[displayStage] = [];
    }
    groups[displayStage].push(template);
    return groups;
  }, {} as Record<string, FormTemplate[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Form Templates</h2>
          <p className="text-muted-foreground">
            Generate legal documents from standardized templates
            {selectedCase && (
              <span className="block mt-1">
                Showing templates for: <span className="font-medium text-foreground">{selectedCase.title}</span> 
                <span className="ml-2 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {selectedCase.currentStage} Stage
                </span>
              </span>
            )}
          </p>
        </div>
      </div>

      {Object.entries(groupedTemplates).map(([stage, stageTemplates]) => (
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {stage} Stage
              <Badge variant="secondary" className={getStageColor(stage)}>
                {stageTemplates.length} template{stageTemplates.length !== 1 ? 's' : ''}
              </Badge>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stageTemplates.map((template) => (
              <Card key={template.code} className="hover-lift cursor-pointer transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {template.title}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Code: {template.code} • Version {template.version}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={getStageColor(stage)}>
                      {stage}
                      {template.stage !== stage && (
                        <span className="ml-1 text-xs opacity-70">({template.stage})</span>
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1 mb-1">
                        <Building className="h-3 w-3" />
                        <span>Output: {template.output.filename.replace('${case.id}', 'CASE-ID').replace('${now:YYYYMMDD}', 'DATE')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Creates: {template.output.timeline_event}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Could add template preview functionality here
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTemplateSelect(template);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      ))}

      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Templates Available</h3>
          <p className="text-muted-foreground">Form templates will appear here when they are configured.</p>
        </div>
      )}

      {selectedTemplate && (
        <FormRenderModal
          isOpen={formModalOpen}
          onClose={() => {
            setFormModalOpen(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          selectedCaseId={selectedCaseId}
        />
      )}
    </div>
  );
};