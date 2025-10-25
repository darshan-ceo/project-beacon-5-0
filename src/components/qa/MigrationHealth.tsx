import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Play,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { storageMigrator } from '@/utils/storageConsolidation';
import { runMigrationSmokeTest, quickCanary } from '@/utils/migrationSmokeTest';
import { FollowUpMigrationReport } from '@/components/admin/FollowUpMigrationReport';
import { useToast } from '@/hooks/use-toast';
import type { MigrationStatus } from '@/utils/storageConsolidation';
import type { SmokeTestResult } from '@/utils/migrationSmokeTest';

export const MigrationHealth: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [testResults, setTestResults] = useState<SmokeTestResult | null>(null);
  const [canaryResult, setCanaryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStatus();
    loadAssessment();
  }, []);

  const loadStatus = async () => {
    const currentStatus = storageMigrator.getStatus();
    setStatus(currentStatus);
  };

  const loadAssessment = async () => {
    const data = await storageMigrator.assessStorageState();
    setAssessment(data);
  };

  const handleMigrate = async () => {
    setLoading(true);
    try {
      // Create backup first
      const backupKey = await storageMigrator.createBackup();
      toast({
        title: 'Backup Created',
        description: `Backup stored as: ${backupKey}`,
      });

      // Run migration
      const result = await storageMigrator.migrateFromLocalStorage();
      
      if (result.success) {
        toast({
          title: 'Migration Complete',
          description: `Migrated ${result.entitiesMigrated} entities in ${result.duration}ms`,
        });

        // Validate integrity
        const integrity = await storageMigrator.validateIntegrity();
        if (!integrity.valid) {
          toast({
            title: 'Integrity Issues Detected',
            description: `${integrity.issues.length} issues found`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Migration Failed',
          description: result.errors.join(', '),
          variant: 'destructive',
        });
      }

      await loadStatus();
      await loadAssessment();
    } catch (error) {
      toast({
        title: 'Migration Error',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunTests = async () => {
    setLoading(true);
    try {
      const results = await runMigrationSmokeTest();
      setTestResults(results);
      
      if (results.passed) {
        toast({
          title: 'All Tests Passed',
          description: `${results.tests.length} tests completed in ${results.totalDuration}ms`,
        });
      } else {
        const failedCount = results.tests.filter(t => !t.passed).length;
        toast({
          title: 'Tests Failed',
          description: `${failedCount} of ${results.tests.length} tests failed`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Test Error',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCanary = async () => {
    setLoading(true);
    try {
      const result = await quickCanary();
      setCanaryResult(result);
      
      if (result.success) {
        toast({
          title: 'Canary Test Passed',
          description: `Created client ${result.clientId?.slice(0, 8)} and case ${result.caseId?.slice(0, 8)}`,
        });
      } else {
        toast({
          title: 'Canary Test Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Canary Error',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'modern': return 'default';
      case 'transitioning': return 'secondary';
      case 'legacy': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Migration Status
          </CardTitle>
          <CardDescription>
            Monitor and manage the migration from localStorage to HofficeDB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          {status && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Migration Mode:</span>
                <Badge variant={getModeColor(status.mode)}>
                  {status.mode.toUpperCase()}
                </Badge>
              </div>

              {status.mode === 'transitioning' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{status.entitiesMigrated} / {status.totalEntities}</span>
                  </div>
                  <Progress 
                    value={(status.entitiesMigrated / status.totalEntities) * 100} 
                  />
                </div>
              )}

              {status.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {status.errors.length} error(s) occurred during migration
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Storage Assessment */}
          {assessment && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Storage Assessment</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">localStorage Items:</span>
                  <span className="ml-2 font-medium">{assessment.localStorageItems.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">IndexedDB Databases:</span>
                  <span className="ml-2 font-medium">{assessment.indexedDBDatabases.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">HofficeDB Records:</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {Object.entries(assessment.hofficeDBRecords).map(([table, count]) => (
                    <div key={table} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span>{table}</span>
                      <Badge variant="secondary" className="h-5">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Test Results */}
          {testResults && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium">Smoke Test Results</h3>
              <div className="space-y-2">
                {testResults.tests.map((test, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>{test.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                      {test.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canary Result */}
          {canaryResult && (
            <div className="border-t pt-4">
              <Alert variant={canaryResult.success ? "default" : "destructive"}>
                <AlertDescription>
                  <pre className="text-xs">
                    {JSON.stringify(canaryResult, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              onClick={handleMigrate}
              disabled={loading || status?.mode === 'modern'}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Start Migration
            </Button>

            <Button
              onClick={handleRunTests}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Run Smoke Tests
            </Button>

            <Button
              onClick={handleCanary}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Run Canary
            </Button>

            <Button
              onClick={() => {
                loadStatus();
                loadAssessment();
              }}
              disabled={loading}
              variant="ghost"
              size="icon"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Follow-Up Migration Report */}
      <FollowUpMigrationReport />
    </div>
  );
};
