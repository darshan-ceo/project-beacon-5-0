import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomTemplate } from '@/services/customTemplatesService';
import { FileText, Download, Variable } from 'lucide-react';
import { docxTemplateService } from '@/services/docxTemplateService';

interface DocxGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: CustomTemplate;
  cases: any[];
  clients: any[];
  onGenerate: (template: CustomTemplate, caseId: string, overrides?: Record<string, any>) => Promise<void>;
}

export const DocxGenerationModal: React.FC<DocxGenerationModalProps> = ({
  isOpen,
  onClose,
  template,
  cases,
  clients,
  onGenerate
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [resolvedValues, setResolvedValues] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedCase = cases.find(c => c.id === selectedCaseId);
  const selectedClient = selectedCase ? clients.find(c => c.id === selectedCase.clientId) : null;

  // Auto-populate values when case is selected
  useEffect(() => {
    if (selectedCase && selectedClient && template.variableMappings) {
      const resolved: Record<string, any> = {};
      
      Object.entries(template.variableMappings).forEach(([placeholder, systemPath]) => {
        const value = docxTemplateService.resolveSystemPath(systemPath, selectedCase, selectedClient);
        resolved[placeholder] = value || '';
      });

      setResolvedValues(resolved);
    } else {
      setResolvedValues({});
    }
  }, [selectedCaseId, selectedCase, selectedClient, template.variableMappings]);

  const handleOverrideChange = (placeholder: string, value: string) => {
    setOverrides(prev => ({
      ...prev,
      [placeholder]: value
    }));
  };

  const getFinalValue = (placeholder: string): string => {
    return overrides[placeholder] !== undefined 
      ? overrides[placeholder] 
      : resolvedValues[placeholder] || '';
  };

  const handleGenerate = async () => {
    if (!selectedCaseId) {
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate(template, selectedCaseId, overrides);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate DOCX Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">{template.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{template.code}</Badge>
              <span>•</span>
              <span>{template.stage}</span>
            </div>
          </div>

          {/* Case Selection */}
          <div className="space-y-2">
            <Label htmlFor="case-select">Select Case *</Label>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger id="case-select">
                <SelectValue placeholder="Choose a case for this document..." />
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

          {/* Variable Values Table */}
          {selectedCaseId && template.variableMappings && Object.keys(template.variableMappings).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Variable className="h-4 w-4" />
                <h3 className="text-sm font-semibold">Document Variables</h3>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variable</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(template.variableMappings).map(([placeholder, systemPath]) => (
                      <TableRow key={placeholder}>
                        <TableCell className="font-mono text-sm w-[200px]">
                          {`{{${placeholder}}}`}
                        </TableCell>
                        <TableCell className="w-[200px]">
                          <Badge variant="outline" className="text-xs">{systemPath}</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={getFinalValue(placeholder)}
                            onChange={(e) => handleOverrideChange(placeholder, e.target.value)}
                            placeholder="Enter value or leave auto-filled"
                            className="text-sm"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">
                Values are auto-populated from the selected case. You can override any value by typing in the input field.
              </p>
            </div>
          )}

          {/* No Variables Info */}
          {selectedCaseId && (!template.variableMappings || Object.keys(template.variableMappings).length === 0) && (
            <div className="bg-muted/50 rounded-md p-4 text-sm">
              <p className="text-muted-foreground">
                This template has no variables. The document will be generated as-is.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={!selectedCaseId || isGenerating}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate DOCX'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
