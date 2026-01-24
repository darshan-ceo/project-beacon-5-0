import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { EntityType, ImportJob, ColumnMapping, ImportError } from '@/types/importExport';
import { importExportService } from '@/services/importExportService';
import { clientSideImportExportService } from '@/services/clientSideImportExportService';
import { mappingService } from '@/services/mappingService';
import { MappingInterface } from './MappingInterface';
import { toast } from '@/hooks/use-toast';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  onImportComplete?: (job: ImportJob) => void;
}

type Step = 'template' | 'upload' | 'mapping' | 'preview' | 'results';

export const ImportWizard: React.FC<ImportWizardProps> = ({
  isOpen,
  onClose,
  entityType,
  onImportComplete
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('template');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepTitles: Record<Step, string> = {
    template: 'Download Template',
    upload: 'Upload File',
    mapping: 'Map Columns',
    preview: 'Preview & Validate',
    results: 'Import Results'
  };

  const getCurrentStepIndex = () => {
    const steps: Step[] = ['template', 'upload', 'mapping', 'preview', 'results'];
    return steps.indexOf(currentStep);
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsProcessing(true);
      const response = await importExportService.downloadTemplate(entityType);
      
      if (response.success && response.data) {
        const url = URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entityType}_import_template.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Template Downloaded",
          description: "Import template downloaded successfully. Fill it with your data and upload."
        });
      } else {
        throw new Error(response.error || 'Failed to download template');
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download template",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await importExportService.uploadForImport(entityType, file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (response.success && response.data) {
        setImportJob(response.data);
        setSelectedFile(file);
        setCurrentStep('mapping');
        
        toast({
          title: "File Uploaded",
          description: `${response.data.counts.total} rows found. Proceeding to column mapping.`
        });
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleMappingComplete = async (completedMapping: ColumnMapping) => {
    if (!importJob) return;

    setMapping(completedMapping);
    setIsProcessing(true);

    try {
      // Save mapping to Supabase data_jobs table
      await clientSideImportExportService.saveJobMapping(importJob.id, completedMapping);

      // Run validation to get accurate counts for preview
      toast({
        title: "Validating Data",
        description: `Validating ${importJob.counts.total} rows...`
      });

      const validationResult = await importExportService.validateImportData(
        importJob.id,
        completedMapping
      );

      if (validationResult.success) {
        // Update job with validation results
        const updatedJob = {
          ...importJob,
          counts: {
            ...importJob.counts,
            valid: validationResult.validRecords.length,
            invalid: validationResult.invalidRecords.length
          },
          errors: validationResult.errors
        };

        setImportJob(updatedJob);
        setCurrentStep('preview');

        toast({
          title: "Validation Complete",
          description: `${validationResult.validRecords.length} valid, ${validationResult.invalidRecords.length} errors found`
        });
      } else {
        throw new Error(validationResult.error || 'Validation failed');
      }
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Failed to validate data",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importJob) return;

    try {
      setIsProcessing(true);
      const response = await importExportService.commitImport(importJob.id, mapping);
      
      if (response.success && response.data) {
        setImportJob(response.data);
        setCurrentStep('results');
        onImportComplete?.(response.data);
        
        toast({
          title: "Import Completed",
          description: `${response.data.counts.processed} records imported successfully`
        });
      } else {
        throw new Error(response.error || 'Import failed');
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to complete import",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTemplateStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileSpreadsheet className="mx-auto h-16 w-16 text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Download Import Template</h3>
        <p className="text-muted-foreground mb-6">
          Start by downloading the standardized template for {entityType} imports. 
          The template includes validation rules and helpful examples.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            What's included in the template?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Pre-formatted columns with validation rules</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Sample data row with examples</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Help sheet with field descriptions</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Built-in data validation (where possible)</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button 
          onClick={handleDownloadTemplate}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </>
          )}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('upload')}
        >
          Skip to Upload
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="mx-auto h-16 w-16 text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Upload Your Data</h3>
        <p className="text-muted-foreground mb-6">
          Upload your completed Excel file. We'll analyze the structure and guide you through column mapping.
        </p>
      </div>

      {uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="space-y-2">
            <FileSpreadsheet className="mx-auto h-8 w-8 text-green-600" />
            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              Choose Different File
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p>Drop your Excel file here or click to browse</p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              Select File
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('template')}
          disabled={isProcessing}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {selectedFile && importJob && (
          <Button 
            onClick={() => setCurrentStep('mapping')}
            disabled={isProcessing}
            className="flex-1"
          >
            Continue to Mapping
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const renderMappingStep = () => {
    if (!importJob) return null;

    // Note: savedMapping will be loaded asynchronously via MappingInterface
    // which now fetches from Supabase via clientSideImportExportService.getJobMapping()

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Map Your Columns</h3>
          <p className="text-muted-foreground mb-6">
            We've automatically mapped your columns. Review and adjust as needed.
          </p>
        </div>

        <MappingInterface
          importJob={importJob}
          entityType={entityType}
          onMappingComplete={handleMappingComplete}
        />
      </div>
    );
  };

  const renderPreviewStep = () => {
    if (!importJob) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Review & Validate</h3>
          <p className="text-muted-foreground mb-6">
            Review the import summary before proceeding.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{importJob.counts.total}</div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{importJob.counts.valid}</div>
              <div className="text-sm text-muted-foreground">Valid</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{importJob.counts.invalid}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-muted-foreground">Duplicates</div>
            </CardContent>
          </Card>
        </div>

        {importJob.errors && importJob.errors.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {importJob.counts.invalid} validation errors found. Valid rows will be imported, 
              errors will be sent to Pending Records for correction.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('mapping')}
            disabled={isProcessing}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Mapping
          </Button>
          <Button 
            onClick={handleCommitImport}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Import {importJob.counts.valid} Valid Records
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderResultsStep = () => {
    if (!importJob) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Import Complete</h3>
          <p className="text-muted-foreground mb-6">
            Your import has been processed successfully.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{importJob.counts.processed}</div>
              <div className="text-sm text-muted-foreground">Records Imported</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{importJob.counts.invalid}</div>
              <div className="text-sm text-muted-foreground">Pending Correction</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-muted-foreground">Duplicates Skipped</div>
            </CardContent>
          </Card>
        </div>

        {importJob.counts.invalid > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {importJob.counts.invalid} records need correction and are available in Pending Records. 
              You can fix them and retry the import.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {importJob.counts.invalid > 0 && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={async () => {
                try {
                  const result = await importExportService.getPendingRecords(importJob.id);
                  if (result.success && result.data.length > 0) {
                    // Create Excel file with pending records
                    const XLSX = await import('xlsx');
                    const ws = XLSX.utils.json_to_sheet(result.data.map(r => ({
                      'Row Number': r.row,
                      ...r.originalData,
                      'Errors': r.errors.map(e => e.error).join('; ')
                    })));
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Pending Records');
                    XLSX.writeFile(wb, `pending_records_${importJob.id}.xlsx`);
                    toast({
                      title: "Pending records downloaded",
                      description: "Fix errors and re-import the file"
                    });
                  } else {
                    toast({
                      title: "No pending records",
                      description: "All records were imported successfully"
                    });
                  }
                } catch (error) {
                  console.error('Error downloading pending records:', error);
                  toast({
                    title: "Download Failed",
                    description: "Failed to download pending records",
                    variant: "destructive"
                  });
                }
              }}
            >
              Download Pending Records
            </Button>
          )}
        </div>
      </div>
    );
  };

  const handleClose = () => {
    // Mapping now persisted in Supabase, no cleanup needed
    setCurrentStep('template');
    setSelectedFile(null);
    setImportJob(null);
    setMapping({});
    setUploadProgress(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Data
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {['template', 'upload', 'mapping', 'preview', 'results'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${index <= getCurrentStepIndex() 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
                }
              `}>
                {index + 1}
              </div>
              {index < 4 && (
                <div className={`
                  w-16 h-1 mx-2
                  ${index < getCurrentStepIndex() ? 'bg-primary' : 'bg-muted'}
                `} />
              )}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h4 className="font-medium text-lg">{stepTitles[currentStep]}</h4>
        </div>

        {/* Step Content */}
        {currentStep === 'template' && renderTemplateStep()}
        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'mapping' && renderMappingStep()}
        {currentStep === 'preview' && renderPreviewStep()}
        {currentStep === 'results' && renderResultsStep()}
      </DialogContent>
    </Dialog>
  );
};