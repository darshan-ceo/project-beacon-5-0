/**
 * Storage Tools Panel
 * Administrative panel for storage diagnostics, migration, and maintenance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  HardDrive,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { storageManager } from '@/data/StorageManager';
import { changeTracker } from '@/services/changeTracker';
import { migrateIdsToUUID, needsIdNormalization } from '@/utils/migrations/v4_id_normalization';
import { STORAGE_KEYS, ENTITY_TYPES } from '@/constants/StorageKeys';

export const StorageTools: React.FC = () => {
  const [storageHealth, setStorageHealth] = useState<any>(null);
  const [trackerStats, setTrackerStats] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setLoading(true);
      
      // Health check
      const health = await storageManager.healthCheck();
      setStorageHealth(health);
      
      // Storage info
      const storage = storageManager.getStorage();
      const info = await storage.getStorageInfo();
      setStorageInfo(info);
      
      // Change tracker stats
      const stats = changeTracker.getStats();
      setTrackerStats(stats);
      
      // Check migration needs
      const needs = await needsIdNormalization();
      setMigrationNeeded(needs);
      
    } catch (error) {
      console.error('Failed to load storage info:', error);
      toast.error('Failed to load storage information');
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    toast.info('Running health check...');
    await loadStorageInfo();
    toast.success('Health check complete');
  };

  const handleRunMigration = async () => {
    try {
      setMigrationInProgress(true);
      toast.info('Running ID normalization migration...');
      
      const result = await migrateIdsToUUID();
      
      if (result.success) {
        toast.success(`Migration complete! Migrated ${Object.keys(result.migratedIds).length} IDs in ${result.duration}ms`);
        setMigrationNeeded(false);
      } else {
        toast.error(`Migration completed with ${result.errors.length} errors`);
        console.error('Migration errors:', result.errors);
      }
      
      await loadStorageInfo();
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Migration failed');
    } finally {
      setMigrationInProgress(false);
    }
  };

  const handleClearDirtyEntities = () => {
    changeTracker.clearAll();
    toast.success('Cleared all change tracking data');
    loadStorageInfo();
  };

  const handleExportStorage = async () => {
    try {
      const storage = storageManager.getStorage();
      const allData = await storage.exportAll();
      
      const dataStr = JSON.stringify({
        version: 4,
        exported_at: new Date().toISOString(),
        entities: allData,
        tracker: {
          dirty: changeTracker.getDirtyEntities(),
          changes: changeTracker.getChangeLog(),
        }
      }, null, 2);
      
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beacon-storage-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Storage exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export storage');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const usagePercent = storageInfo 
    ? Math.round((storageInfo.used / storageInfo.quota) * 100)
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Storage Tools</h2>
          <p className="text-muted-foreground">Diagnostics, migration, and maintenance</p>
        </div>
        <Button onClick={handleHealthCheck} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="tracking">Change Tracking</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Health Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Storage Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storageHealth?.healthy ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All systems operational
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {storageHealth?.errors?.join(', ') || 'Health check failed'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Storage Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Used: {formatBytes(storageInfo?.used || 0)}</span>
                  <span>Total: {formatBytes(storageInfo?.quota || 0)}</span>
                </div>
                <Progress value={usagePercent} />
                <p className="text-sm text-muted-foreground mt-1">
                  {usagePercent}% used
                </p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Available</p>
                  <p className="font-medium">{formatBytes(storageInfo?.available || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quota</p>
                  <p className="font-medium">{formatBytes(storageInfo?.quota || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                ID Normalization Migration
              </CardTitle>
              <CardDescription>
                Convert legacy timestamp-based IDs to UUIDs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {migrationNeeded ? (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Your database contains legacy IDs that need normalization to UUIDs.
                      This migration will update all entity IDs and their foreign key references.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={handleRunMigration}
                    disabled={migrationInProgress}
                  >
                    {migrationInProgress ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Running Migration...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Run Migration
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    All IDs are normalized. No migration needed.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Change Tracking
              </CardTitle>
              <CardDescription>
                Monitor entity changes for future API sync
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dirty Entities</p>
                  <p className="text-2xl font-bold">{trackerStats?.dirtyCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unsynced Changes</p>
                  <p className="text-2xl font-bold">{trackerStats?.unsyncedCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Versions</p>
                  <p className="text-2xl font-bold">{trackerStats?.totalVersions || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Change Log Size</p>
                  <p className="text-2xl font-bold">{trackerStats?.changeLogSize || 0}</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <Button 
                onClick={handleClearDirtyEntities}
                variant="outline"
                size="sm"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Tracking Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Actions</CardTitle>
              <CardDescription>
                Backup, restore, and maintenance operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={handleExportStorage} className="w-full" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Storage (JSON)
              </Button>
              
              <Button className="w-full" variant="outline" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Import Storage (Coming Soon)
              </Button>
              
              <Separator className="my-4" />
              
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Danger zone - use with caution
                </AlertDescription>
              </Alert>
              
              <Button variant="destructive" className="w-full" disabled>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
