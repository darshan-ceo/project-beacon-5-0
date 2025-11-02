import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Download,
  RefreshCw,
  Play,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  runAudit, 
  runFullMigration, 
  exportAuditReport, 
  generateTextReport,
  type TaskAuditResult,
  type MigrationResult 
} from '@/scripts/taskDataAudit';

export const TaskDataMigration: React.FC = () => {
  const { toast } = useToast();
  const [auditResult, setAuditResult] = useState<TaskAuditResult | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const handleRunAudit = async () => {
    setIsRunning(true);
    setProgress(10);
    setCurrentStep('Scanning tasks...');
    setMigrationResult(null);
    
    try {
      const result = await runAudit();
      setAuditResult(result);
      setProgress(100);
      setCurrentStep('Audit complete');
      
      const totalIssues = result.orphanTasks.length + 
                          result.invalidClientRefs.length + 
                          result.invalidDateFormats.length +
                          result.missingHearingRefs.length +
                          result.missingSLAData.length +
                          result.missingAuditTrail.length;
      
      toast({
        title: 'Audit Complete',
        description: `Found ${totalIssues} issues across ${result.totalTasks} tasks. ${result.migrationPlan.fixable} can be auto-fixed.`,
        variant: totalIssues > 0 ? 'default' : 'default'
      });
    } catch (error) {
      toast({
        title: 'Audit Failed',
        description: String(error),
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  const handleRunMigration = async () => {
    if (!auditResult) {
      toast({
        title: 'Run Audit First',
        description: 'Please run an audit before attempting migration.',
        variant: 'destructive'
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    
    try {
      setProgress(20);
      setCurrentStep('Migrating orphan tasks...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress(40);
      setCurrentStep('Fixing client references...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setProgress(60);
      setCurrentStep('Normalizing dates...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setProgress(80);
      setCurrentStep('Cleaning up references...');
      const result = await runFullMigration(auditResult);
      
      setProgress(100);
      setCurrentStep('Migration complete');
      setMigrationResult(result);
      
      // Refresh audit after migration
      setTimeout(async () => {
        const newAudit = await runAudit();
        setAuditResult(newAudit);
      }, 1000);
      
      toast({
        title: result.success ? 'Migration Complete' : 'Migration Had Errors',
        description: result.success 
          ? `Successfully migrated ${result.migratedCount} tasks with ${result.placeholderCasesCreated} placeholder cases created.`
          : `Migration completed with ${result.errors.length} errors.`,
        variant: result.success ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({
        title: 'Migration Failed',
        description: String(error),
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  const handleExportJSON = () => {
    if (!auditResult) return;
    exportAuditReport(auditResult);
    toast({
      title: 'Report Exported',
      description: 'Audit report downloaded as JSON',
    });
  };

  const handleExportText = () => {
    if (!auditResult) return;
    const textReport = generateTextReport(auditResult);
    const blob = new Blob([textReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-audit-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Report Exported',
      description: 'Audit report downloaded as text file',
    });
  };

  const totalIssues = auditResult 
    ? auditResult.orphanTasks.length + 
      auditResult.invalidClientRefs.length + 
      auditResult.invalidDateFormats.length +
      auditResult.missingHearingRefs.length +
      auditResult.missingSLAData.length +
      auditResult.missingAuditTrail.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Task Data Integrity Audit & Migration
            </CardTitle>
            <CardDescription>
              Audit and fix task data issues (orphans, invalid refs, date formats)
            </CardDescription>
          </div>
          {auditResult && totalIssues === 0 && (
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              All Clean
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleRunAudit}
            disabled={isRunning}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            Run Audit
          </Button>

          <Button
            onClick={handleRunMigration}
            disabled={isRunning || !auditResult || totalIssues === 0}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            Run Migration
          </Button>

          {auditResult && (
            <>
              <Button
                onClick={handleExportJSON}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </Button>

              <Button
                onClick={handleExportText}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Export Text
              </Button>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{currentStep}</p>
          </div>
        )}

        {/* Metrics Grid */}
        {auditResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <AlertCircle className="h-4 w-4" />
                Orphans
              </div>
              <div className="text-2xl font-bold text-destructive">{auditResult.orphanTasks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Invalid case refs</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <AlertTriangle className="h-4 w-4" />
                Invalid Refs
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {auditResult.invalidClientRefs.length + auditResult.missingHearingRefs.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Client/hearing</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Info className="h-4 w-4" />
                Bad Dates
              </div>
              <div className="text-2xl font-bold text-amber-600">{auditResult.invalidDateFormats.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Non DD-MM-YYYY</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Database className="h-4 w-4" />
                SLA/Audit
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {auditResult.missingSLAData.length + auditResult.missingAuditTrail.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Missing metadata</p>
            </div>
          </div>
        )}

        {/* Status Alert */}
        {auditResult && totalIssues > 0 && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">
              Issues Detected ({totalIssues} total)
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200 space-y-1">
              {auditResult.orphanTasks.length > 0 && (
                <div>• {auditResult.orphanTasks.length} orphan tasks (invalid case references)</div>
              )}
              {auditResult.invalidClientRefs.length > 0 && (
                <div>• {auditResult.invalidClientRefs.length} invalid client references</div>
              )}
              {auditResult.invalidDateFormats.length > 0 && (
                <div>• {auditResult.invalidDateFormats.length} tasks with invalid date formats</div>
              )}
              {auditResult.missingHearingRefs.length > 0 && (
                <div>• {auditResult.missingHearingRefs.length} invalid hearing references</div>
              )}
              {auditResult.missingSLAData.length > 0 && (
                <div>• {auditResult.missingSLAData.length} tasks missing SLA data</div>
              )}
              {auditResult.missingAuditTrail.length > 0 && (
                <div>• {auditResult.missingAuditTrail.length} tasks missing audit trail</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {auditResult && totalIssues === 0 && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900 dark:text-green-100">All Clean</AlertTitle>
            <AlertDescription className="text-green-800 dark:text-green-200">
              No data integrity issues detected. All {auditResult.totalTasks} tasks are properly configured.
            </AlertDescription>
          </Alert>
        )}

        {/* Migration Plan */}
        {auditResult && totalIssues > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Migration Plan:</h3>
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>✓ Auto-fixable:</span>
                <Badge variant="secondary">{auditResult.migrationPlan.fixable} issues</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>⚠ Manual review:</span>
                <Badge variant="secondary">{auditResult.migrationPlan.requiresManualReview} issues</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Actions */}
        {auditResult && auditResult.migrationPlan.actions.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="actions">
              <AccordionTrigger>
                Detailed Actions ({auditResult.migrationPlan.actions.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditResult.migrationPlan.actions.map((action, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 border rounded-lg text-sm space-y-1"
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-medium">
                          {idx + 1}. [{action.fix.toUpperCase()}] {action.taskTitle}
                        </div>
                        <Badge 
                          variant={
                            action.severity === 'critical' ? 'destructive' : 
                            action.severity === 'warning' ? 'default' : 
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {action.severity}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">
                        <strong>Issue:</strong> {action.issue}
                      </div>
                      <div className="text-muted-foreground">
                        <strong>Fix:</strong> {action.details}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Task ID: {action.taskId}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Migration Results */}
        {migrationResult && (
          <Alert className={migrationResult.success ? "border-green-200 bg-green-50 dark:bg-green-950" : "border-red-200 bg-red-50 dark:bg-red-950"}>
            {migrationResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle className={migrationResult.success ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}>
              {migrationResult.success ? 'Migration Complete' : 'Migration Had Errors'}
            </AlertTitle>
            <AlertDescription className={migrationResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>
              <div className="space-y-1">
                <div>• Migrated {migrationResult.migratedCount} orphan tasks</div>
                <div>• Fixed {migrationResult.fixedClientRefs} client references</div>
                <div>• Normalized {migrationResult.normalizedDates} date formats</div>
                <div>• Created {migrationResult.placeholderCasesCreated} placeholder cases</div>
                <div>• Cleaned {migrationResult.cleanedHearingRefs} hearing references</div>
                <div>• Initialized {migrationResult.initializedAuditTrails} audit trails</div>
                <div>• Added SLA data to {migrationResult.addedSLAData} tasks</div>
                {migrationResult.errors.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <strong>Errors ({migrationResult.errors.length}):</strong>
                    {migrationResult.errors.slice(0, 3).map((err, idx) => (
                      <div key={idx} className="text-xs">• {err}</div>
                    ))}
                    {migrationResult.errors.length > 3 && (
                      <div className="text-xs">... and {migrationResult.errors.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
