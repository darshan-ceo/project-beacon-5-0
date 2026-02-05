import { useState } from 'react';
import { EnterpriseDemoManager } from './EnterpriseDemoManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sprout, CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import { GSTLitigationDataSeeder } from '@/services/gstLitigationDataSeeder';
import { comprehensiveGSTDataSeeder } from '@/services/comprehensiveGSTDataSeeder';
import { workflowDataSeeder } from '@/services/workflowDataSeeder';
import { documentDataSeeder } from '@/services/documentDataSeeder';
import mockDataset from '@/data/seedData/gstLitigationMockData.json';

export const DataSeedingPanel = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingComprehensive, setIsSeedingComprehensive] = useState(false);
  const [isDocumentSeeding, setIsDocumentSeeding] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [comprehensiveResult, setComprehensiveResult] = useState<any>(null);
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [documentResult, setDocumentResult] = useState<any>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showWorkflowDuplicateWarning, setShowWorkflowDuplicateWarning] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);
  const [existingWorkflowData, setExistingWorkflowData] = useState<any>(null);
  const { toast } = useToast();

  const handleSeedComprehensiveData = async (skipDuplicateCheck = false) => {
    setIsSeedingComprehensive(true);
    setComprehensiveResult(null);

    try {
      toast({
        title: "🌱 Starting Comprehensive Data Seeding",
        description: "This will populate all master modules with production-ready data.",
      });

      const seedResult = await comprehensiveGSTDataSeeder.seedAll(skipDuplicateCheck);

      // Check if duplicates were found
      if (seedResult.duplicatesFound && !skipDuplicateCheck) {
        setExistingData(seedResult.existingData);
        setShowDuplicateWarning(true);
        setIsSeedingComprehensive(false);
        return;
      }

      setComprehensiveResult(seedResult);

      if (seedResult.success) {
        toast({
          title: "✅ Comprehensive Data Seeding Completed",
          description: `Successfully seeded ${seedResult.totalRecords} records across all master modules.`,
        });
      } else {
        toast({
          title: "⚠️ Comprehensive Data Seeding Failed",
          description: seedResult.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Comprehensive Seeding Error",
        description: error.message,
        variant: "destructive",
      });
      setComprehensiveResult({
        success: false,
        totalRecords: 0,
        breakdown: {},
        errors: [error.message]
      });
    } finally {
      setIsSeedingComprehensive(false);
    }
  };

  const handleProceedWithSeeding = () => {
    setShowDuplicateWarning(false);
    handleSeedComprehensiveData(true);
  };

  const handleSeedWorkflowData = async () => {
    setIsSeeding(true);
    setWorkflowResult(null);

    try {
      toast({
        title: "🔄 Starting Workflow Data Seeding",
        description: "This will populate cases, hearings, tasks, and lifecycle tracking data.",
      });

      const seedResult = await workflowDataSeeder.seedAll(false);

      // Check if duplicates were found
      if (seedResult.duplicatesFound && seedResult.existingData) {
        setExistingWorkflowData(seedResult.existingData);
        setShowWorkflowDuplicateWarning(true);
        setIsSeeding(false);
        return;
      }

      setWorkflowResult(seedResult);

      if (seedResult.success) {
        toast({
          title: "✅ Workflow Data Seeding Completed",
          description: `Successfully seeded ${seedResult.breakdown.cases} cases, ${seedResult.breakdown.hearings} hearings, and ${seedResult.breakdown.tasks} tasks.`,
        });
      } else {
        toast({
          title: "⚠️ Workflow Data Seeding Failed",
          description: seedResult.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Workflow Seeding Error",
        description: error.message,
        variant: "destructive",
      });
      setWorkflowResult({
        success: false,
        breakdown: { cases: 0, hearings: 0, tasks: 0, documents: 0 },
        errors: [error.message]
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleProceedWithWorkflowSeeding = () => {
    setShowWorkflowDuplicateWarning(false);
    handleSeedWorkflowData();
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    setResult(null);

    try {
      const seeder = new GSTLitigationDataSeeder();
      const seedResult = await seeder.seedAll(mockDataset);
      
      setResult(seedResult);

      if (seedResult.success) {
        toast({
          title: "✅ Seeding Completed",
          description: `Successfully seeded ${seedResult.totalRecords} records across all modules.`,
        });
      } else {
        toast({
          title: "⚠️ Seeding Completed with Errors",
          description: `Seeded ${seedResult.totalRecords} records, but encountered ${seedResult.errors.length} errors.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Seeding error:', error);
      toast({
        title: "❌ Seeding Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setResult({
        success: false,
        totalRecords: 0,
        details: {},
        errors: [String(error)]
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSeedDocuments = async () => {
    setIsDocumentSeeding(true);
    setDocumentResult(null);

    try {
      toast({
        title: "📄 Starting Document Seeding",
        description: "Generating and uploading sample documents to storage...",
      });

      const seedResult = await documentDataSeeder.seedSampleDocuments();
      
      setDocumentResult(seedResult);
      
      if (seedResult.success) {
        toast({
          title: "✅ Documents Seeded Successfully",
          description: `${seedResult.documentsCreated} sample documents uploaded to storage.`,
        });
      } else {
        toast({
          title: "⚠️ Document Seeding Completed with Errors",
          description: seedResult.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Document Seeding Failed",
        description: error.message,
        variant: "destructive",
      });
      setDocumentResult({
        success: false,
        documentsCreated: 0,
        errors: [error.message]
      });
    } finally {
      setIsDocumentSeeding(false);
    }
  };

  return (
    <>
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Master Data Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              The following master data already exists in your database:
              {existingData && (
                <div className="mt-4 space-y-2 text-sm">
                  {existingData.courts > 0 && (
                    <div className="flex justify-between">
                      <span>Courts:</span>
                      <span className="font-semibold">{existingData.courts} records</span>
                    </div>
                  )}
                  {existingData.judges > 0 && (
                    <div className="flex justify-between">
                      <span>Judges:</span>
                      <span className="font-semibold">{existingData.judges} records</span>
                    </div>
                  )}
                  {existingData.clients > 0 && (
                    <div className="flex justify-between">
                      <span>Clients:</span>
                      <span className="font-semibold">{existingData.clients} records</span>
                    </div>
                  )}
                  {existingData.employees > 0 && (
                    <div className="flex justify-between">
                      <span>Employees:</span>
                      <span className="font-semibold">{existingData.employees} records</span>
                    </div>
                  )}
                </div>
              )}
              <p className="mt-4 text-amber-600 dark:text-amber-500 font-medium">
                ⚠️ Proceeding will add duplicate records to your database. This may cause confusion and data inconsistencies.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedWithSeeding} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" />
            GST Litigation Demo Data Seeder
          </CardTitle>
          <CardDescription>
            Populate your database with sample GST litigation data for testing and demonstration purposes.
            This includes users, clients, courts, cases, hearings, tasks, and documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will add sample data to your current tenant. Make sure you're in a test environment.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            <Button 
              onClick={() => handleSeedComprehensiveData(false)} 
              disabled={isSeedingComprehensive || isSeeding}
              className="w-full"
            >
              {isSeedingComprehensive ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding Comprehensive Data...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Seed Comprehensive Master Data
                </>
              )}
            </Button>

            <Button 
              onClick={handleSeedData} 
              disabled={isSeeding || isSeedingComprehensive}
              className="w-full"
              variant="outline"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding Legacy Data...
                </>
              ) : (
                <>
                  <Sprout className="mr-2 h-4 w-4" />
                  Seed Legacy Sample Data
                </>
              )}
            </Button>
          </div>

          {comprehensiveResult && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                {comprehensiveResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium">
                  Comprehensive Seeding {comprehensiveResult.success ? 'Successful' : 'Failed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Courts:</span>
                  <span className="font-mono">{comprehensiveResult.breakdown.courts || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Judges:</span>
                  <span className="font-mono">{comprehensiveResult.breakdown.judges || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Clients:</span>
                  <span className="font-mono">{comprehensiveResult.breakdown.clients || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Employees:</span>
                  <span className="font-mono">{comprehensiveResult.breakdown.employees || 0}</span>
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded border border-primary/20">
                <div className="font-medium">Total Records: {comprehensiveResult.totalRecords}</div>
              </div>

              {comprehensiveResult.errors && comprehensiveResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="font-medium mb-1">Errors ({comprehensiveResult.errors.length}):</div>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      {comprehensiveResult.errors.slice(0, 5).map((error: string, idx: number) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {comprehensiveResult.errors.length > 5 && (
                        <li className="text-muted-foreground">...and {comprehensiveResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium">
                  Legacy Seeding {result.success ? 'Successful' : 'Failed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Users:</span>
                  <span className="font-mono">{result.details.users || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Clients:</span>
                  <span className="font-mono">{result.details.clients || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Forums:</span>
                  <span className="font-mono">{result.details.forums || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Cases:</span>
                  <span className="font-mono">{result.details.cases || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Hearings:</span>
                  <span className="font-mono">{result.details.hearings || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Tasks:</span>
                  <span className="font-mono">{result.details.tasks || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded col-span-2">
                  <span>Documents:</span>
                  <span className="font-mono">{result.details.documents || 0}</span>
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded border border-primary/20">
                <div className="font-medium">Total Records: {result.totalRecords}</div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="font-medium mb-1">Errors ({result.errors.length}):</div>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      {result.errors.slice(0, 5).map((error: string, idx: number) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li className="text-muted-foreground">...and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            GST Litigation Workflow Data
          </CardTitle>
          <CardDescription>
            Seed comprehensive workflow data including 30 cases across all lifecycle stages (Assessment → Supreme Court),
            45 hearings, 120 tasks with automation tracking, and complete stage transitions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Prerequisites:</strong> Master data (courts, judges, clients, employees) must be seeded first.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleSeedWorkflowData} 
            disabled={isSeeding || isSeedingComprehensive}
            className="w-full"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Workflow Data...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Seed Workflow Data (30 Cases + Dependencies)
              </>
            )}
          </Button>

          {workflowResult && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                {workflowResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium">
                  Workflow Seeding {workflowResult.success ? 'Successful' : 'Failed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Cases:</span>
                  <span className="font-mono">{workflowResult.breakdown.cases || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Hearings:</span>
                  <span className="font-mono">{workflowResult.breakdown.hearings || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Tasks:</span>
                  <span className="font-mono">{workflowResult.breakdown.tasks || 0}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded">
                  <span>Documents:</span>
                  <span className="font-mono">{workflowResult.breakdown.documents || 0}</span>
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded border border-primary/20">
                <div className="font-medium">
                  Total Workflow Records: {
                    (workflowResult.breakdown.cases || 0) + 
                    (workflowResult.breakdown.hearings || 0) + 
                    (workflowResult.breakdown.tasks || 0) + 
                    (workflowResult.breakdown.documents || 0)
                  }
                </div>
              </div>

              {workflowResult.errors && workflowResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="font-medium mb-1">Errors ({workflowResult.errors.length}):</div>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      {workflowResult.errors.slice(0, 5).map((error: string, idx: number) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {workflowResult.errors.length > 5 && (
                        <li className="text-muted-foreground">...and {workflowResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sample Documents Seeder
          </CardTitle>
          <CardDescription>
            Generate and upload 5 sample PDF/DOCX documents to the documents storage bucket with metadata linked to existing cases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Prerequisites:</strong> At least 1 case must exist in the database for document linking.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleSeedDocuments} 
            disabled={isDocumentSeeding || isSeeding || isSeedingComprehensive}
            className="w-full"
          >
            {isDocumentSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Documents...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Seed Sample Documents (5 Files)
              </>
            )}
          </Button>

          {documentResult && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                {documentResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className="font-medium">
                  Document Seeding {documentResult.success ? 'Successful' : 'Failed'}
                </span>
              </div>

              <div className="p-3 bg-primary/5 rounded border border-primary/20">
                <div className="font-medium">Documents Created: {documentResult.documentsCreated}/5</div>
              </div>

              {documentResult.errors && documentResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="font-medium mb-1">Errors ({documentResult.errors.length}):</div>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      {documentResult.errors.slice(0, 5).map((error: string, idx: number) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showWorkflowDuplicateWarning} onOpenChange={setShowWorkflowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing Workflow Data Found</AlertDialogTitle>
            <AlertDialogDescription>
              The following workflow data already exists in your database:
              {existingWorkflowData && (
                <div className="mt-4 space-y-2 text-sm">
                  {existingWorkflowData.cases > 0 && (
                    <div className="flex justify-between">
                      <span>Cases:</span>
                      <span className="font-semibold">{existingWorkflowData.cases} records</span>
                    </div>
                  )}
                  {existingWorkflowData.hearings > 0 && (
                    <div className="flex justify-between">
                      <span>Hearings:</span>
                      <span className="font-semibold">{existingWorkflowData.hearings} records</span>
                    </div>
                  )}
                  {existingWorkflowData.tasks > 0 && (
                    <div className="flex justify-between">
                      <span>Tasks:</span>
                      <span className="font-semibold">{existingWorkflowData.tasks} records</span>
                    </div>
                  )}
                </div>
              )}
              <p className="mt-4 text-amber-600 dark:text-amber-500 font-medium">
                ⚠️ Proceeding will add additional workflow data. This may create duplicate entries if the same data is seeded again.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProceedWithWorkflowSeeding} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Export as a combined panel with Enterprise Demo at top
export const DataSeedingPanelWithDemo = () => {
  return (
    <div className="space-y-6">
      <EnterpriseDemoManager />
      <DataSeedingPanel />
    </div>
  );
};
