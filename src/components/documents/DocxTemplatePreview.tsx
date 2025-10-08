import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomTemplate } from '@/services/customTemplatesService';
import { FileText, Calendar, User, Variable, MapPin } from 'lucide-react';
import { docxTemplateService } from '@/services/docxTemplateService';

interface DocxTemplatePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  template: CustomTemplate;
  cases: any[];
  clients: any[];
}

export const DocxTemplatePreview: React.FC<DocxTemplatePreviewProps> = ({
  isOpen,
  onClose,
  template,
  cases,
  clients
}) => {
  const [previewCaseId, setPreviewCaseId] = useState<string>('');

  const selectedCase = cases.find(c => c.id === previewCaseId);
  const selectedClient = selectedCase ? clients.find(c => c.id === selectedCase.clientId) : null;

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Scrutiny': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Demand': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'Adjudication': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Appeals': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getSampleValue = (systemPath: string) => {
    if (!selectedCase || !selectedClient) return '(Select a case to preview values)';

    const resolved = docxTemplateService.resolveSystemPath(systemPath, selectedCase, selectedClient);
    return resolved || '(No value)';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            DOCX Template Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Metadata */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{template.title}</h3>
              <Badge variant="outline" className={getStageColor(template.stage)}>
                {template.stage}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Code: <span className="font-mono text-foreground">{template.code}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Version: <span className="text-foreground">{template.version}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Created by: <span className="text-foreground">{template.createdBy}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Variable className="h-4 w-4" />
                <span>Variables: <span className="text-foreground">{Object.keys(template.variableMappings || {}).length}</span></span>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <Badge variant="secondary" className="text-xs">
                Word Document Template
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                This is a DOCX template that can be generated with case and client data.
              </p>
            </div>
          </div>

          {/* Variable Mappings */}
          {template.variableMappings && Object.keys(template.variableMappings).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Variable Mappings
                </h3>
                <Select value={previewCaseId} onValueChange={setPreviewCaseId}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select case for preview..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.caseNumber} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variable</TableHead>
                      <TableHead>Mapped To</TableHead>
                      <TableHead>Sample Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(template.variableMappings).map(([placeholder, systemPath]) => (
                      <TableRow key={placeholder}>
                        <TableCell className="font-mono text-sm">
                          {`{{${placeholder}}}`}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{systemPath}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getSampleValue(systemPath)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* No Variables Warning */}
          {(!template.variableMappings || Object.keys(template.variableMappings).length === 0) && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4 text-sm">
              <p className="text-amber-900 dark:text-amber-100">
                This template has no variable mappings. It will be generated as-is without any data substitution.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
