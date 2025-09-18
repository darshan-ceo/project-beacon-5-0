import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Activity
} from 'lucide-react';
import { useEnhancedPersistence } from '@/hooks/useEnhancedPersistence';
import { seedDataService } from '@/services/seedDataService';
import { persistenceService, StorageHealth } from '@/services/persistenceService';
import { StorageHealthMonitor } from './StorageHealthMonitor';
import { toast } from '@/hooks/use-toast';

export const StorageManagerPanel: React.FC = () => {
  const {
    storageHealth,
    lastSaved,
    isAutoSaving,
    exportData,
    importData,
    clearAllData,
    checkHealth,
    manualSave,
    restoreFromBackup
  } = useEnhancedPersistence();

  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [operationHistory, setOperationHistory] = useState<any[]>([]);
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({});
  const [backupInfo, setBackupInfo] = useState<{ timestamp: string; entityCount: number } | null>(null);

  // Refresh entity counts
  const refreshCounts = async () => {
    try {
      const counts = {
        cases: (await persistenceService.getAll('cases')).length,
        clients: (await persistenceService.getAll('clients')).length,
        courts: (await persistenceService.getAll('courts')).length,
        judges: (await persistenceService.getAll('judges')).length,
        employees: (await persistenceService.getAll('employees')).length,
        hearings: (await persistenceService.getAll('hearings')).length,
        tasks: (await persistenceService.getAll('tasks')).length,
        documents: (await persistenceService.getAll('documents')).length,
        folders: (await persistenceService.getAll('folders')).length,
      };
      setEntityCounts(counts);
    } catch (error) {
      console.error('Failed to refresh counts:', error);
    }
  };

  // Load operation history
  const refreshOperationHistory = async () => {
    try {
      const history = await persistenceService.getOperationHistory();
      setOperationHistory(history.slice(-10)); // Show last 10 operations
    } catch (error) {
      console.error('Failed to load operation history:', error);
    }
  };

  // Check for available backup
  const checkBackupInfo = () => {
    try {
      const backupData = localStorage.getItem('lawfirm_app_data_backup');
      if (backupData) {
        const parsed = JSON.parse(backupData);
        if (parsed.metadata) {
          const entityCount = Object.values(parsed.metadata.entityCounts || {}).reduce((a: number, b: number) => a + b, 0);
          setBackupInfo({
            timestamp: parsed.metadata.timestamp,
            entityCount: entityCount as number
          });
        }
      } else {
        setBackupInfo(null);
      }
    } catch (error) {
      console.warn('Failed to check backup info:', error);
      setBackupInfo(null);
    }
  };

  useEffect(() => {
    refreshCounts();
    refreshOperationHistory();
    checkBackupInfo();
  }, []);

  const handleGenerateDemo = async () => {
    setIsGeneratingDemo(true);
    try {
      await seedDataService.generateComprehensiveSeedData();
      await refreshCounts();
      await refreshOperationHistory();
      toast({
        title: 'Demo Data Generated',
        description: 'Comprehensive demo data created successfully',
      });
    } catch (error) {
      console.error('Demo generation failed:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  const handleClearData = async () => {
    setIsClearingData(true);
    try {
      await clearAllData();
      await refreshCounts();
      setOperationHistory([]);
      toast({
        title: 'Data Cleared',
        description: 'All storage data has been cleared',
      });
    } catch (error) {
      console.error('Clear failed:', error);
      toast({
        title: 'Clear Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsClearingData(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const success = await importData(file);
      if (success) {
        await refreshCounts();
        await refreshOperationHistory();
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      // Reset input
      event.target.value = '';
    }
  };

  const handleRestoreFromBackup = async () => {
    setIsRestoring(true);
    try {
      const success = await restoreFromBackup();
      if (success) {
        await refreshCounts();
        await refreshOperationHistory();
        checkBackupInfo();
      }
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthColor = (health: StorageHealth | null) => {
    if (!health) return 'gray';
    if (!health.isHealthy) return 'red';
    if (health.quotaWarning) return 'yellow';
    return 'green';
  };

  const totalRecords = Object.values(entityCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Enhanced Storage Health Monitor */}
      <StorageHealthMonitor />

      {/* Storage Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {storageHealth?.isHealthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <Badge variant={storageHealth?.isHealthy ? 'default' : 'destructive'}>
                {storageHealth?.isHealthy ? 'Healthy' : 'Issues Detected'}
              </Badge>
            </div>
            {storageHealth?.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-500">
                {storageHealth.errors.join(', ')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used:</span>
                <span>{formatBytes(storageHealth?.used || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available:</span>
                <span>{formatBytes(storageHealth?.available || 0)}</span>
              </div>
              {storageHealth && (
                <Progress 
                  value={(storageHealth.used / (storageHealth.used + storageHealth.available)) * 100} 
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Save Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {isAutoSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm">
                  {isAutoSaving ? 'Saving...' : 'Up to date'}
                </span>
              </div>
              {lastSaved && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Management
          </CardTitle>
          <CardDescription>
            Manage your application data and storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Seed Demo Data */}
            <Button
              onClick={handleGenerateDemo}
              disabled={isGeneratingDemo}
              variant="outline"
              className="h-auto flex-col p-4"
            >
              {isGeneratingDemo ? (
                <RefreshCw className="h-6 w-6 animate-spin mb-2" />
              ) : (
                <Plus className="h-6 w-6 mb-2" />
              )}
              <span className="text-sm">Seed Demo Data</span>
            </Button>

            {/* Manual Save */}
            <Button
              onClick={manualSave}
              disabled={isAutoSaving}
              variant="outline"
              className="h-auto flex-col p-4"
            >
              <Database className="h-6 w-6 mb-2" />
              <span className="text-sm">Manual Save</span>
            </Button>

            {/* Export Data */}
            <Button
              onClick={exportData}
              variant="outline"
              className="h-auto flex-col p-4"
            >
              <Download className="h-6 w-6 mb-2" />
              <span className="text-sm">Export JSON</span>
            </Button>

            {/* Import Data */}
            <div className="relative">
              <Button
                variant="outline"
                className="h-auto flex-col p-4 w-full"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-6 w-6 mb-2" />
                <span className="text-sm">Import JSON</span>
              </Button>
              <input
                id="file-input"
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* Restore from Backup */}
            <Button
              onClick={handleRestoreFromBackup}
              disabled={isRestoring || !backupInfo}
              variant="secondary"
              className="h-auto flex-col p-4"
            >
              {isRestoring ? (
                <RefreshCw className="h-6 w-6 animate-spin mb-2" />
              ) : (
                <RefreshCw className="h-6 w-6 mb-2" />
              )}
              <span className="text-sm">Restore Backup</span>
              {backupInfo && (
                <span className="text-xs text-muted-foreground mt-1">
                  {backupInfo.entityCount} records
                </span>
              )}
            </Button>
          </div>
          
          {/* Backup Info */}
          {backupInfo && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Backup Available:</strong> {backupInfo.entityCount} records from {new Date(backupInfo.timestamp).toLocaleString()}
              </AlertDescription>
            </Alert>
          )}

          <Separator className="my-4" />

          {/* Clear Data (Danger Zone) */}
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h4>
            <Button
              onClick={handleClearData}
              disabled={isClearingData}
              variant="destructive"
              size="sm"
            >
              {isClearingData ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Entity Counts */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
          <CardDescription>
            Current record counts by entity type ({totalRecords} total records)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(entityCounts).map(([entity, count]) => (
              <div key={entity} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {entity}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Operations</CardTitle>
          <CardDescription>
            Last 10 storage operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operationHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No operations recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {operationHistory.map((op, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Badge variant={op.type === 'create' ? 'default' : op.type === 'update' ? 'secondary' : 'destructive'}>
                      {op.type}
                    </Badge>
                    <span>{op.entity}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(op.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};