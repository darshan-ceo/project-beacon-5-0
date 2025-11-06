import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Database, 
  Zap, 
  ExternalLink, 
  Copy,
  Info
} from 'lucide-react';
import { envConfig } from '@/utils/envConfig';
import { toast } from '@/hooks/use-toast';
import { removeItem } from '@/data/storageShim';
import { StorageManager } from '@/data/StorageManager';

export const EnvironmentStatus: React.FC = () => {
  const statusBadges = envConfig.getStatusBadges();
  const overrides = envConfig.getActiveOverrides();
  
  const copyEnvironmentInfo = () => {
    const info = {
      environment: import.meta.env.MODE,
      statusBadges,
      overrides,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
    toast({
      title: 'Environment Info Copied',
      description: 'Environment configuration copied to clipboard'
    });
  };

  const getVariantForStatus = (status: string) => {
    switch (status) {
      case 'ON':
      case 'SET':
        return 'default';
      case 'OFF':
      case 'MISSING':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Environment Status
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copyEnvironmentInfo}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(statusBadges).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm font-medium">{key}:</span>
                <Badge variant={getVariantForStatus(value)}>
                  {value}
                </Badge>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            Mode: {import.meta.env.MODE} | Build: {new Date().toLocaleDateString()}
          </div>

          {/* URL Overrides */}
          {Object.keys(overrides).length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>URL Overrides Active:</strong><br />
                {Object.entries(overrides).map(([key, value]) => (
                  <span key={key} className="inline-block mr-3">
                    {key}={value}
                  </span>
                ))}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => window.location.href = '/?qa=on&mock=on&gst=on'}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Enable Full QA Mode
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => window.location.href = '/?mock=off&gst=off&qa=off'}
          >
            <Database className="h-4 w-4 mr-2" />
            Production Mode
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={async () => {
              // Clear storageShim
              await removeItem('lawfirm_app_data');
              await removeItem('user_profile');
              
              // Clear all storage
              const storage = StorageManager.getInstance().getStorage();
              await storage.clearAll();
              
              // Clear session storage
              sessionStorage.clear();
              
              toast({
                title: 'Storage Cleared',
                description: 'All storage data cleared'
              });
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Clear All Storage
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  registrations.forEach(registration => registration.unregister());
                });
              }
              window.location.reload();
            }}
          >
            <Database className="h-4 w-4 mr-2" />
            Hard Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};