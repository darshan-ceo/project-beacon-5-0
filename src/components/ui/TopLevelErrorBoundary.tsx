import React from 'react';
import { ErrorBoundary } from '@/components/qa/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Trash2, RotateCcw } from 'lucide-react';
import { removeItem } from '@/data/storageShim';
import { db } from '@/data/db';
import { toast } from '@/hooks/use-toast';

interface TopLevelErrorFallbackProps {
  error: Error;
  retry: () => void;
}

const TopLevelErrorFallback: React.FC<TopLevelErrorFallbackProps> = ({ error, retry }) => {
  const handleClearProfile = async () => {
    try {
      await removeItem('user_profile');
      toast({
        title: "Profile Cleared",
        description: "User profile data has been cleared. The page will reload.",
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast({
        title: "Clear Failed",
        description: "Could not clear profile data. Try Emergency Reset instead.",
        variant: "destructive",
      });
    }
  };

  const handleEmergencyReset = async () => {
    try {
      await removeItem('lawfirm_app_data');
      await removeItem('user_profile');
      await db.delete();
      
      toast({
        title: "Emergency Reset Complete",
        description: "All local data has been cleared. The page will reload.",
      });

      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      toast({
        title: "Reset Failed",
        description: "Could not clear data. Please clear browser cache manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            Application Error
          </CardTitle>
          <CardDescription>
            The application encountered an unexpected error and cannot continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error.message}
            </AlertDescription>
          </Alert>

          {import.meta.env.MODE === 'development' && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium mb-2">
                Error Details (Development Mode)
              </summary>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try these recovery options:</p>
            
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
              
              <Button onClick={retry} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button onClick={handleClearProfile} variant="outline" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear Profile Data
              </Button>
              
              <Button onClick={handleEmergencyReset} variant="destructive" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Emergency Reset (Clear All Data)
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              If the problem persists, navigate to <code className="bg-muted px-1 py-0.5 rounded">/emergency-reset</code> for a guaranteed recovery option.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

interface TopLevelErrorBoundaryProps {
  children: React.ReactNode;
}

export const TopLevelErrorBoundary: React.FC<TopLevelErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary fallback={TopLevelErrorFallback}>
      {children}
    </ErrorBoundary>
  );
};
