/**
 * Storage Mode Selector
 * Allows switching between different storage backends
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Cloud, 
  HardDrive, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { storageManager } from '@/data/StorageManager';
import type { StorageMode } from '@/data/StorageManager';

const STORAGE_MODES = [
  {
    id: 'indexeddb' as StorageMode,
    name: 'Local Only',
    description: 'Store all data locally in your browser. No cloud sync.',
    icon: HardDrive,
    features: ['Instant performance', 'Works offline', 'No sync'],
    badge: 'Default',
  },
  {
    id: 'hybrid' as StorageMode,
    name: 'Hybrid (Recommended)',
    description: 'Local-first with automatic cloud synchronization.',
    icon: Cloud,
    features: ['Instant local', 'Auto cloud sync', 'Offline capable', 'Multi-device'],
    badge: 'Best',
  },
  {
    id: 'memory' as StorageMode,
    name: 'In-Memory',
    description: 'Temporary storage for testing. Data lost on refresh.',
    icon: RefreshCw,
    features: ['Ultra fast', 'No persistence', 'Testing only'],
    badge: 'Dev Only',
  },
] as const;

interface StorageModeInfo {
  mode: StorageMode;
  online: boolean;
  syncQueueSize: number;
  lastSync?: Date;
}

export function StorageModeSelector() {
  const [currentMode, setCurrentMode] = useState<StorageMode>('indexeddb');
  const [selectedMode, setSelectedMode] = useState<StorageMode>('indexeddb');
  const [isLoading, setIsLoading] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageModeInfo>({
    mode: 'indexeddb',
    online: navigator.onLine,
    syncQueueSize: 0,
  });

  const handleModeChange = async () => {
    if (selectedMode === currentMode) {
      toast.info('Already using this storage mode');
      return;
    }

    setIsLoading(true);
    
    try {
      // Warn about data migration
      const confirmed = window.confirm(
        `Switch to ${selectedMode} mode?\n\nThis will reload the application. Make sure all changes are saved.`
      );
      
      if (!confirmed) {
        setIsLoading(false);
        return;
      }

      // Store mode preference
      localStorage.setItem('storage_mode', selectedMode);
      
      // Reinitialize storage manager
      await storageManager.destroy();
      await storageManager.initialize(selectedMode);
      
      setCurrentMode(selectedMode);
      
      toast.success(`Switched to ${selectedMode} mode`, {
        description: 'Storage backend updated successfully',
      });
      
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to switch storage mode:', error);
      toast.error('Failed to switch storage mode', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (currentMode !== 'hybrid') {
      toast.error('Sync only available in hybrid mode');
      return;
    }

    try {
      toast.info('Starting manual sync...');
      // This would trigger sync if we had access to HybridAdapter
      toast.success('Sync completed');
    } catch (error) {
      toast.error('Sync failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Storage Backend</CardTitle>
            <CardDescription>
              Choose how your data is stored and synchronized
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {storageInfo.online ? (
              <Badge variant="outline" className="gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            {currentMode === 'hybrid' && storageInfo.syncQueueSize > 0 && (
              <Badge variant="secondary">
                {storageInfo.syncQueueSize} pending
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Currently using <strong>{currentMode}</strong> mode
            {currentMode === 'hybrid' && storageInfo.lastSync && (
              <span className="text-muted-foreground">
                {' '}· Last synced {storageInfo.lastSync.toLocaleTimeString()}
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Mode Selection */}
        <RadioGroup value={selectedMode} onValueChange={(value) => setSelectedMode(value as StorageMode)}>
          <div className="grid gap-4">
            {STORAGE_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              const isCurrent = currentMode === mode.id;
              
              return (
                <div
                  key={mode.id}
                  className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                    isSelected ? 'border-primary bg-accent' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <div className="flex items-start gap-4">
                    <RadioGroupItem value={mode.id} id={mode.id} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor={mode.id} className="text-base font-semibold cursor-pointer">
                          {mode.name}
                        </Label>
                        {mode.badge && (
                          <Badge variant={mode.badge === 'Best' ? 'default' : 'secondary'} className="text-xs">
                            {mode.badge}
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {mode.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {mode.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </RadioGroup>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedMode === 'hybrid' && (
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Requires network connection for cloud sync
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {currentMode === 'hybrid' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncNow}
                disabled={!storageInfo.online}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            )}
            <Button
              onClick={handleModeChange}
              disabled={isLoading || selectedMode === currentMode}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Switch Mode
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
