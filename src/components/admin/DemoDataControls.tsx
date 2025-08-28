import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDataPersistenceContext } from '@/components/providers/DataPersistenceProvider';
import { generateSampleWorkflow } from '@/utils/sampleDataGenerator';
import { addDiagnosticLog } from '@/components/diagnostics/DiagnosticsDrawer';
import { Trash2, RefreshCw, Database, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

export const DemoDataControls: React.FC = () => {
  const { dataService, resetDemoData, generateSampleData, exportData, importData, clearAllData, saveToStorage } = useDataPersistenceContext();

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const success = await importData(file);
      if (success) {
        toast.success('Data imported successfully');
      } else {
        toast.error('Failed to import data - invalid file format');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import data');
    }

    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Sample Data Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sample Data
          </CardTitle>
          <CardDescription>
            Generate realistic sample data for testing workflows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={generateSampleData}
            className="w-full"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Sample Data
          </Button>
          
          <Button 
            onClick={async () => {
              try {
                const sampleData = generateSampleWorkflow();
                
                // Create client first
                const client = await dataService.createClient(sampleData.client);
                addDiagnosticLog({
                  operation: 'CREATE_WORKFLOW',
                  entity: 'client',
                  status: 'success',
                  details: `Sample client "${client.name}" created`,
                });
                
                // Create case linked to client
                const caseData = { ...sampleData.case, clientId: client.id };
                const case_ = await dataService.createCase(caseData);
                addDiagnosticLog({
                  operation: 'CREATE_WORKFLOW',
                  entity: 'case',
                  status: 'success',
                  details: `Sample case "${case_.title}" created`,
                });
                
                // Create hearing linked to case
                const hearingData = { ...sampleData.hearing, caseId: case_.id, clientId: client.id };
                const hearing = await dataService.createHearing(hearingData);
                addDiagnosticLog({
                  operation: 'CREATE_WORKFLOW',
                  entity: 'hearing',
                  status: 'success',
                  details: `Sample hearing scheduled for ${hearing.date}`,
                });
                
                // Create task linked to case
                const taskData = { 
                  ...sampleData.task, 
                  caseId: case_.id, 
                  clientId: client.id,
                  caseNumber: case_.caseNumber 
                };
                const task = await dataService.createTask(taskData);
                addDiagnosticLog({
                  operation: 'CREATE_WORKFLOW',
                  entity: 'task',
                  status: 'success',
                  details: `Sample task "${task.title}" created`,
                });
                
                // Save immediately
                saveToStorage();
                
                toast.success(`Created workflow: ${client.name} → ${case_.title} → Hearing → Task`);
              } catch (error) {
                addDiagnosticLog({
                  operation: 'CREATE_WORKFLOW',
                  entity: 'workflow',
                  status: 'error',
                  details: `Failed to create sample workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
                
                toast.error('Failed to create sample workflow');
              }
            }}
            variant="outline"
            className="w-full"
          >
            <Database className="mr-2 h-4 w-4" />
            Create Sample Workflow (ABC → Case → Hearing → Task)
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Creates sample clients, courts, judges, cases, and other entities for testing
          </p>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export, import, and manage your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={exportData}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('import-file')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleFileImport}
            style={{ display: 'none' }}
          />
        </CardContent>
      </Card>

      {/* Reset Controls */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Reset or clear all data - these actions cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset to Demo Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset to Demo Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all current data and restore the initial demo data. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetDemoData}>
                    Reset Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all data including clients, cases, 
                    tasks, and documents. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={clearAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};