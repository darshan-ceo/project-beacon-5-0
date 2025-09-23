/**
 * Updated Storage Manager Panel using unified storage
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Activity,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useUnifiedPersistence } from '@/hooks/useUnifiedPersistence';
import { storageManager } from '@/data/StorageManager';
import { taskBundleServiceNew } from '@/services/taskBundleServiceNew';
import { toast } from 'sonner';

export const UnifiedStoragePanel: React.FC = () => {
  const {
    initialized,
    storageHealth,
    lastSaved,
    isAutoSaving,
    entityCounts,
    manualSave,
    exportData,
    importData,
    clearAllData,
    rebuildLocalCache,
    checkHealth
  } = useUnifiedPersistence();

  const [taskBundles, setTaskBundles] = useState<any[]>([]);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);

  useEffect(() => {
    if (initialized) {
      loadTaskBundles();
    }
  }, [initialized]);

  const loadTaskBundles = async () => {
    try {
      setIsLoadingBundles(true);
      await taskBundleServiceNew.initialize();
      const bundles = await taskBundleServiceNew.getAllBundles();
      setTaskBundles(bundles);
      console.log('✅ Loaded task bundles from unified storage:', bundles.length);
    } catch (error) {
      console.error('❌ Failed to load task bundles:', error);
    } finally {
      setIsLoadingBundles(false);
    }
  };

  const handleCreateTestBundle = async () => {
    try {
      const testBundle = await taskBundleServiceNew.createBundle({
        name: `Test Bundle ${Date.now()}`,
        trigger: 'OnStageEnter',
        stage_code: 'Any Stage',
        active: true,
        description: 'Test bundle created from unified storage panel',
        items: [
          {
            title: 'Sample Task 1',
            description: 'This is a test task',
            priority: 'Medium',
            estimated_hours: 2
          },
          {
            title: 'Sample Task 2',
            description: 'Another test task',
            priority: 'High',
            estimated_hours: 1
          }
        ]
      });
      
      await loadTaskBundles();
      toast.success(`Created test bundle: ${testBundle.name}`);
    } catch (error) {
      console.error('Failed to create test bundle:', error);
      toast.error('Failed to create test bundle');
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importData(file);
        await loadTaskBundles();
      } catch (error) {
        console.error('Import failed:', error);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-500" />
    );
  };

  if (!initialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Unified Storage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Initializing storage...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Storage Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Storage Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {storageHealth ? getHealthIcon(storageHealth.healthy) : <Clock className="h-4 w-4" />}
              <span className="font-medium">
                {storageHealth?.healthy ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={checkHealth}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Health
            </Button>
          </div>
          
          {storageHealth?.errors && storageHealth.errors.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {storageHealth.errors.join(', ')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Storage Used</div>
              <div className="text-muted-foreground">
                {formatBytes(storageHealth?.info?.used || 0)}
              </div>
            </div>
            <div>
              <div className="font-medium">Last Saved</div>
              <div className="text-muted-foreground">
                {lastSaved ? lastSaved.toLocaleTimeString() : 'Never'}
              </div>
            </div>
          </div>

          {isAutoSaving && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Auto-saving...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entity Counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Data Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(entityCounts).map(([entity, count]) => (
              <div key={entity} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {entity.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Bundles Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Task Bundles ({taskBundles.length})
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadTaskBundles}
                disabled={isLoadingBundles}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingBundles ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCreateTestBundle}
              >
                <Database className="h-4 w-4 mr-2" />
                Create Test Bundle
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {taskBundles.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No task bundles found
              </div>
            ) : (
              taskBundles.map((bundle, index) => (
                <div key={bundle.id || index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{bundle.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {bundle.items?.length || 0} tasks • {bundle.trigger} • {bundle.stage_code}
                    </div>
                  </div>
                  <Badge variant={bundle.active ? 'default' : 'secondary'}>
                    {bundle.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={manualSave}>
              <Database className="h-4 w-4 mr-2" />
              Manual Save
            </Button>
            
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Backup
            </Button>
            
            <div>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileImport}
                className="hidden"
                id="import-file"
              />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Backup
              </Button>
            </div>
            
            <Button variant="outline" onClick={rebuildLocalCache}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rebuild Cache
            </Button>
          </div>

          <Separator />

          <div className="bg-red-50 p-4 rounded border border-red-200">
            <h4 className="font-medium text-red-800 mb-2">Danger Zone</h4>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure? This will delete ALL data!')) {
                  clearAllData();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};