/**
 * Task Bundle Importer Component
 * Allows importing task bundles from JSON files
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Upload, 
  FileJson, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Download,
  Eye,
  Copy
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { taskBundleImportService } from '@/services/taskBundleImportService';
import type { ImportResult } from '@/services/taskBundleImportService';
import type { CreateTaskBundleData } from '@/data/repositories/TaskBundleRepository';

interface TaskBundleImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: CreateTaskBundleData) => Promise<void>;
}

export const TaskBundleImporter: React.FC<TaskBundleImporterProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [jsonData, setJsonData] = useState<any>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a JSON file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setJsonData(parsed);

      // Validate
      const result = await taskBundleImportService.importFromJSON(parsed);
      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Validation Successful',
          description: 'JSON file is valid and ready to import',
        });
      } else {
        toast({
          title: 'Validation Failed',
          description: `Found ${result.errors.length} error(s)`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Parse Error',
        description: 'Invalid JSON format',
        variant: 'destructive',
      });
      setJsonData(null);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importResult?.transformedData) return;

    setIsImporting(true);
    try {
      await onImport(importResult.transformedData);
      toast({
        title: 'Import Successful',
        description: 'Task bundle has been imported',
      });
      handleClose();
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = taskBundleImportService.generateTemplate();
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'task-bundle-template.json';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Template Downloaded',
      description: 'Use this template as a reference for your imports',
    });
  };

  const handleCopyTemplate = async () => {
    const template = taskBundleImportService.generateTemplate();
    await navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    toast({
      title: 'Template Copied',
      description: 'Template JSON copied to clipboard',
    });
  };

  const handleClose = () => {
    setJsonData(null);
    setImportResult(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Task Bundle from JSON
          </DialogTitle>
          <DialogDescription>
            Upload a JSON file containing task bundle configuration
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Template Download Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Need a template?</CardTitle>
              <CardDescription className="text-xs">
                Download or copy a sample JSON template to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyTemplate}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select JSON File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="json-file-input"
                />
                <label htmlFor="json-file-input" className="flex-1">
                  <Button variant="outline" className="w-full" asChild>
                    <span>
                      <FileJson className="h-4 w-4 mr-2" />
                      Choose JSON File
                    </span>
                  </Button>
                </label>
                {jsonData && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          {importResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {importResult.success ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Validation Passed
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      Validation Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Errors Found:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warnings */}
                {importResult.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Warnings:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importResult.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success Summary */}
                {importResult.success && importResult.transformedData && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Bundle: {importResult.transformedData.name}
                    </Badge>
                    <Badge variant="secondary">
                      Tasks: {importResult.transformedData.items?.length || 0}
                    </Badge>
                    <Badge variant="secondary">
                      Trigger: {importResult.transformedData.trigger}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* JSON Preview */}
          {showPreview && jsonData && (
            <Card className="flex-1 min-h-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">JSON Preview</CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)]">
                <ScrollArea className="h-full">
                  <pre className="text-xs bg-muted p-3 rounded">
                    {JSON.stringify(jsonData, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!importResult?.success || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Bundle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
