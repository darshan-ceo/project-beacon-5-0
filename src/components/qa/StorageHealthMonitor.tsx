import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Wrench,
  Info
} from 'lucide-react';
import { useEnhancedPersistence } from '@/hooks/useEnhancedPersistence';
import { StorageHealth } from '@/services/persistenceService';

export const StorageHealthMonitor: React.FC = () => {
  const { storageHealth, checkHealth, isAutoSaving } = useEnhancedPersistence();
  const [isChecking, setIsChecking] = useState(false);
  const [healthHistory, setHealthHistory] = useState<Array<{ timestamp: Date; health: StorageHealth }>>([]);

  // Track health history
  useEffect(() => {
    if (storageHealth) {
      setHealthHistory(prev => [
        ...prev.slice(-9), // Keep last 9 entries
        { timestamp: new Date(), health: storageHealth }
      ]);
    }
  }, [storageHealth]);

  const handleManualHealthCheck = async () => {
    setIsChecking(true);
    try {
      await checkHealth();
    } finally {
      setIsChecking(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthStatus = () => {
    if (!storageHealth) return { color: 'gray', text: 'Unknown' };
    if (!storageHealth.isHealthy) return { color: 'red', text: 'Critical Issues' };
    if (storageHealth.quotaWarning) return { color: 'yellow', text: 'Warning' };
    return { color: 'green', text: 'Healthy' };
  };

  const status = getHealthStatus();

  return (
    <div className="space-y-4">
      {/* Real-time Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Health Monitor
            {isAutoSaving && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
          </CardTitle>
          <CardDescription>
            Real-time monitoring of IndexedDB storage health and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Health Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <div className="flex items-center gap-2">
                  {status.color === 'green' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {status.color === 'yellow' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  {status.color === 'red' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  <Badge variant={
                    status.color === 'green' ? 'default' : 
                    status.color === 'yellow' ? 'secondary' : 'destructive'
                  }>
                    {status.text}
                  </Badge>
                </div>
              </div>

              {storageHealth && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Used Storage:</span>
                    <span className="text-sm">{formatBytes(storageHealth.used)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Available:</span>
                    <span className="text-sm">{formatBytes(storageHealth.available)}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Usage</span>
                      <span>
                        {((storageHealth.used / (storageHealth.used + storageHealth.available)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(storageHealth.used / (storageHealth.used + storageHealth.available)) * 100} 
                      className="h-2"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleManualHealthCheck}
                disabled={isChecking}
                variant="outline"
                className="w-full"
              >
                {isChecking ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Activity className="h-4 w-4 mr-2" />
                )}
                Run Health Check
              </Button>

              {storageHealth && !storageHealth.isHealthy && (
                <Alert>
                  <Wrench className="h-4 w-4" />
                  <AlertDescription>
                    Storage issues detected. Try refreshing the page or clearing browser cache.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Error Details */}
          {storageHealth?.errors && storageHealth.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-2">Detected Issues:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {storageHealth.errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Health History */}
          {healthHistory.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Recent Health Checks
              </h4>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
                {healthHistory.map((entry, index) => (
                  <div
                    key={index}
                    className={`h-3 w-full rounded-sm ${
                      entry.health.isHealthy 
                        ? 'bg-green-500' 
                        : entry.health.quotaWarning 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}
                    title={`${entry.timestamp.toLocaleTimeString()}: ${
                      entry.health.isHealthy ? 'Healthy' : 'Issues'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last {healthHistory.length} health checks (green = healthy, yellow = warning, red = error)
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};