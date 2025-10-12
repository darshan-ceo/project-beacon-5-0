import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { unifiedTemplateGenerationService } from '@/services/unifiedTemplateGenerationService';
import { UnifiedTemplate } from './UnifiedTemplateBuilder';
import { useAppState } from '@/contexts/AppStateContext';
import { FileDown, Loader2 } from 'lucide-react';

interface UnifiedTemplateGenerateModalProps {
  template: UnifiedTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UnifiedTemplateGenerateModal: React.FC<UnifiedTemplateGenerateModalProps> = ({
  template,
  open,
  onOpenChange,
}) => {
  const { state } = useAppState();
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!template) return;

    if (!selectedCaseId) {
      toast({
        title: 'Case Required',
        description: 'Please select a case to generate the document',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);

    try {
      const caseData = state.cases.find(c => c.id === selectedCaseId);
      if (!caseData) {
        throw new Error('Case not found');
      }

      const clientData = state.clients.find(cl => cl.id === caseData.clientId);
      if (!clientData) {
        throw new Error('Client not found for this case');
      }

      // Generate document
      const blob = await unifiedTemplateGenerationService.generateDocument(
        template,
        caseData,
        clientData
      );

      // Generate filename
      const filename = unifiedTemplateGenerationService.generateFilename(
        template,
        caseData
      );

      // Download document
      unifiedTemplateGenerationService.downloadDocument(blob, filename);

      toast({
        title: 'Document Generated',
        description: `${filename} has been downloaded successfully`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate document',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Document</DialogTitle>
          <DialogDescription>
            Select a case to generate {template?.title || 'the document'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="case-select">Case</Label>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger id="case-select">
                <SelectValue placeholder="Select a case" />
              </SelectTrigger>
              <SelectContent>
                {state.cases.map(caseItem => {
                  const client = state.clients.find(c => c.id === caseItem.clientId);
                  return (
                    <SelectItem key={caseItem.id} value={caseItem.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{caseItem.caseNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {client?.name || 'Unknown Client'} • {caseItem.currentStage}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {template && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Template:</span>
                <span className="font-medium">{template.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Format:</span>
                <span className="font-medium">{template.output.format}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Page Size:</span>
                <span className="font-medium">{template.output.pageSize} • {template.output.orientation}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating || !selectedCaseId}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Generate Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
