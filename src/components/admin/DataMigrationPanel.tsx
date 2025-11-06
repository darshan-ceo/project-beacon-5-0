import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Trash2,
  Download,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dataMigrationService, type MigrationProgress, type ValidationResult } from '@/services/DataMigrationService';
import { supabase } from '@/integrations/supabase/client';

export const DataMigrationPanel: React.FC = () => {
  const { toast } = useToast();
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [backupKey, setBackupKey] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Get tenant ID
    const getTenantId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setTenantId(profile.tenant_id);
        }
      }
    };

    getTenantId();

    // Subscribe to progress updates
    const unsubscribe = dataMigrationService.onProgress((p) => {
      setProgress(p);
    });

    return unsubscribe;
  }, []);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const result = await dataMigrationService.validateSourceData();
      setValidation(result);
      
      if (result.valid) {
        toast({
          title: 'Validation Successful',
          description: `Found ${result.stats.totalRecords} records across ${result.stats.entitiesFound.length} entities`
        });
      } else {
        toast({
          title: 'Validation Issues Found',
          description: `${result.issues.filter(i => i.severity === 'error').length} errors detected`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Validation Failed',
        description: String(error),
        variant: 'destructive'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleMigrate = async () => {
    if (!tenantId) {
      toast({
        title: 'Error',
        description: 'Tenant ID not found. Please log in again.',
        variant: 'destructive'
      });
      return;
    }

    if (!validation?.valid) {
      toast({
        title: 'Cannot Migrate',
        description: 'Please fix validation errors first',
        variant: 'destructive'
      });
      return;
    }

    setIsMigrating(true);
    try {
      const result = await dataMigrationService.migrateToSupabase(tenantId);
      
      if (result.success) {
        setBackupKey(result.backupKey || null);
        toast({
          title: 'Migration Successful',
          description: `Migrated ${result.entitiesMigrated} entity types in ${(result.duration / 1000).toFixed(2)}s`
        });
      } else {
        toast({
          title: 'Migration Failed',
          description: `${result.errors.length} errors occurred`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Migration Failed',
        description: String(error),
        variant: 'destructive'
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRollback = async () => {
    if (!backupKey) return;

    try {
      const success = await dataMigrationService.rollback(backupKey);
      
      if (success) {
        toast({
          title: 'Rollback Successful',
          description: 'Data restored from backup'
        });
      } else {
        toast({
          title: 'Rollback Failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Rollback Failed',
        description: String(error),
        variant: 'destructive'
      });
    }
  };

  const handleCleanup = async () => {
    try {
      await dataMigrationService.cleanupAfterMigration();
      toast({
        title: 'Cleanup Complete',
        description: 'IndexedDB data cleared. Please refresh the page.'
      });
      
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      toast({
        title: 'Cleanup Failed',
        description: String(error),
        variant: 'destructive'
      });
    }
  };

  const exportValidationReport = () => {
    if (!validation) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      ...validation
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <div className="flex-1">
            <CardTitle>Data Migration Utility</CardTitle>
            <CardDescription>
              Safely migrate data from IndexedDB to Supabase with validation and rollback
            </CardDescription>
          </div>
          {progress?.status && (
            <Badge variant={
              progress.status === 'completed' ? 'default' :
              progress.status === 'failed' ? 'destructive' :
              'secondary'
            }>
              {progress.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="validation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="validation">Validation</TabsTrigger>
            <TabsTrigger value="migration">Migration</TabsTrigger>
            <TabsTrigger value="rollback">Rollback</TabsTrigger>
          </TabsList>

          {/* Validation Tab */}
          <TabsContent value="validation" className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Pre-Migration Validation</AlertTitle>
              <AlertDescription>
                Validates data integrity before migration. This will check for missing IDs, 
                orphaned relationships, and data structure issues.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={handleValidate}
                disabled={isValidating}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Run Validation
              </Button>

              {validation && (
                <Button
                  onClick={exportValidationReport}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              )}
            </div>

            {validation && (
              <div className="space-y-4">
                {/* Validation Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Total Records</div>
                    <div className="text-2xl font-bold">{validation.stats.totalRecords}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Entities Found</div>
                    <div className="text-2xl font-bold">{validation.stats.entitiesFound.length}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Issues</div>
                    <div className="text-2xl font-bold text-amber-600">{validation.issues.length}</div>
                  </div>
                </div>

                {/* Entities Found */}
                {validation.stats.entitiesFound.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Entities Available for Migration:</div>
                    <div className="flex flex-wrap gap-2">
                      {validation.stats.entitiesFound.map(entity => (
                        <Badge key={entity} variant="outline">{entity}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {validation.issues.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Issues Detected:</div>
                    {validation.issues.map((issue, idx) => (
                      <Alert
                        key={idx}
                        variant={issue.severity === 'error' ? 'destructive' : 'default'}
                        className="py-2"
                      >
                        {issue.severity === 'error' ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        <AlertDescription>
                          <span className="font-medium">{issue.entity}:</span> {issue.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Validation Result */}
                <Alert variant={validation.valid ? 'default' : 'destructive'}>
                  {validation.valid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Ready for Migration</AlertTitle>
                      <AlertDescription>
                        All validation checks passed. You can proceed with the migration.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Cannot Migrate</AlertTitle>
                      <AlertDescription>
                        Please fix the validation errors before proceeding with migration.
                      </AlertDescription>
                    </>
                  )}
                </Alert>
              </div>
            )}
          </TabsContent>

          {/* Migration Tab */}
          <TabsContent value="migration" className="space-y-4">
            <Alert>
              <ArrowRight className="h-4 w-4" />
              <AlertTitle>Data Migration</AlertTitle>
              <AlertDescription>
                Migrates your data from IndexedDB to Supabase. A backup will be created automatically.
                This process may take several minutes depending on data size.
              </AlertDescription>
            </Alert>

            {!validation && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Required</AlertTitle>
                <AlertDescription>
                  Please run validation first before migrating data.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleMigrate}
              disabled={!validation?.valid || isMigrating}
              className="gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Start Migration
            </Button>

            {progress && progress.status !== 'idle' && (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{progress.currentEntity || 'Initializing...'}</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <Progress value={progress.percentage} />
                  <div className="text-xs text-muted-foreground mt-1">
                    {progress.entitiesMigrated} / {progress.totalEntities} entities completed
                  </div>
                </div>

                {/* Errors */}
                {progress.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-destructive">Errors:</div>
                    {progress.errors.map((error, idx) => (
                      <Alert key={idx} variant="destructive" className="py-2">
                        <AlertDescription className="text-sm">{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {progress.warnings.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-amber-600">Warnings:</div>
                    {progress.warnings.map((warning, idx) => (
                      <Alert key={idx} className="py-2">
                        <AlertDescription className="text-sm">{warning}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Success Actions */}
                {progress.status === 'completed' && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Migration Complete</AlertTitle>
                    <AlertDescription>
                      Your data has been successfully migrated to Supabase. 
                      You can now clean up the old IndexedDB data.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {progress?.status === 'completed' && (
              <Button
                onClick={handleCleanup}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clean Up IndexedDB
              </Button>
            )}
          </TabsContent>

          {/* Rollback Tab */}
          <TabsContent value="rollback" className="space-y-4">
            <Alert variant="destructive">
              <RotateCcw className="h-4 w-4" />
              <AlertTitle>Rollback Migration</AlertTitle>
              <AlertDescription>
                Restores data from backup to IndexedDB. Use this if the migration failed 
                or you need to revert to the previous state. This will not delete data from Supabase.
              </AlertDescription>
            </Alert>

            {!backupKey ? (
              <Alert>
                <AlertDescription>
                  No backup available. Backups are created automatically during migration.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Backup Available</div>
                  <div className="font-mono text-xs">{backupKey}</div>
                </div>

                <Button
                  onClick={handleRollback}
                  variant="destructive"
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Rollback to Backup
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
