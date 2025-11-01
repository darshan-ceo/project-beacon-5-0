import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FormTemplate } from '@/services/formTemplatesService';
import { 
  FileText, Tag, Calendar, Hash, CheckCircle, Code,
  Eye, Shield
} from 'lucide-react';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: FormTemplate;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  template
}) => {
  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Scrutiny': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      'Demand': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
      'Adjudication': 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      'Appeals': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
      'GSTAT': 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
      'HC': 'bg-red-500/10 text-red-700 dark:text-red-400',
      'SC': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    };
    return colors[stage] || 'bg-muted text-muted-foreground';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Template Preview
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-8rem)]">
          <div className="space-y-6 pr-4">
            {/* Metadata Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-semibold">{template.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Template Code: <code className="bg-muted px-2 py-0.5 rounded">{template.code}</code>
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {template.stage && (
                  <Badge variant="outline" className={getStageColor(template.stage)}>
                    <Tag className="mr-1 h-3 w-3" />
                    {template.stage}
                  </Badge>
                )}
                {template.version && (
                  <Badge variant="outline">
                    <Hash className="mr-1 h-3 w-3" />
                    v{template.version}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Fields Section */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Template Fields ({template.fields?.length || 0})
              </h4>
              
              {template.fields && template.fields.length > 0 ? (
                <div className="space-y-3">
                  {template.fields.map((field, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.label}</span>
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Key: <code className="bg-muted px-1 py-0.5 rounded text-xs">{field.key}</code>
                          </div>
                        </div>
                        <Badge variant="outline">{field.type}</Badge>
                      </div>
                      
                      {(field as any).validation && (
                        <div className="text-xs border-t pt-2 mt-2">
                          <span className="font-medium">Validation:</span>
                          <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                            {(field as any).validation.minLength && (
                              <li>Min length: {(field as any).validation.minLength}</li>
                            )}
                            {(field as any).validation.maxLength && (
                              <li>Max length: {(field as any).validation.maxLength}</li>
                            )}
                            {(field as any).validation.pattern && (
                              <li>Pattern: <code className="bg-muted px-1 rounded">{(field as any).validation.pattern}</code></li>
                            )}
                            {(field as any).validation.min && (
                              <li>Min value: {(field as any).validation.min}</li>
                            )}
                            {(field as any).validation.max && (
                              <li>Max value: {(field as any).validation.max}</li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      {(field as any).options && (field as any).options.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(field as any).options.map((option: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {option}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {(field as any).group && (
                        <div className="text-xs text-muted-foreground">
                          Group: <span className="font-medium">{(field as any).group}</span>
                          {(field as any).repeatable && <span className="ml-2">(Repeatable)</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No fields configured</p>
              )}
            </div>

            <Separator />

            {/* Variable Mappings Section */}
            {template.prefill && Object.keys(template.prefill).length > 0 && (
              <>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Pre-fill Mappings ({Object.keys(template.prefill).length})
                  </h4>
                  
                  <div className="space-y-2">
                    {Object.entries(template.prefill).map(([key, value], index) => (
                      <div key={index} className="flex items-center gap-2 text-sm border rounded p-2 bg-muted/30">
                        <code className="bg-card px-2 py-1 rounded font-mono text-xs flex-1">
                          {key}
                        </code>
                        <span className="text-muted-foreground">→</span>
                        <code className="bg-card px-2 py-1 rounded font-mono text-xs flex-1">
                          {String(value)}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Output Configuration */}
            {template.output && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Output Configuration
                </h4>
                
                <div className="border rounded-lg p-4 space-y-2 bg-card">
                  {template.output.filename && (
                    <div className="text-sm">
                      <span className="font-medium">Filename Pattern:</span>
                      <code className="ml-2 bg-muted px-2 py-0.5 rounded text-xs">
                        {template.output.filename}
                      </code>
                    </div>
                  )}
                  
                  {template.output.dms_folder_by_stage !== undefined && (
                    <div className="text-sm">
                      <span className="font-medium">DMS Organization:</span>
                      <span className="ml-2">
                        {template.output.dms_folder_by_stage ? 'Folder by Stage' : 'Custom Folder'}
                      </span>
                    </div>
                  )}
                  
                  {template.output.timeline_event && (
                    <div className="text-sm">
                      <span className="font-medium">Timeline Event:</span>
                      <span className="ml-2">{template.output.timeline_event}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Branding/Customization */}
            {('customization' in template || 'branding' in template) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Branding & Customization
                  </h4>
                  
                  <div className="border rounded-lg p-4 space-y-2 bg-card text-sm">
                    {'customization' in template && template.customization && (
                      <>
                        {template.customization.companyHeader && (
                          <div>
                            <span className="font-medium">Header:</span>
                            <span className="ml-2">{template.customization.companyHeader}</span>
                          </div>
                        )}
                        {template.customization.companyFooter && (
                          <div>
                            <span className="font-medium">Footer:</span>
                            <span className="ml-2">{template.customization.companyFooter}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {'branding' in template && template.branding && (
                      <div className="flex items-center gap-4 pt-2 border-t">
                        {(template.branding as any).primaryColor && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Primary Color:</span>
                            <div 
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: (template.branding as any).primaryColor }}
                            />
                            <code className="text-xs">{(template.branding as any).primaryColor}</code>
                          </div>
                        )}
                        {(template.branding as any).font && (
                          <div>
                            <span className="font-medium">Font:</span>
                            <span className="ml-2">{(template.branding as any).font}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
