import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { setItem, getItem } from '@/data/storageShim';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
    
    // In QA mode, capture error details
    if (import.meta.env.MODE === 'development') {
      // Log error to storage (async, non-blocking)
      this.logErrorToStorage(error, errorInfo);
    }
  }

  async logErrorToStorage(error: Error, errorInfo: React.ErrorInfo) {
    try {
      const errorData = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      };
      
      const existingErrors = await getItem<any[]>('qa-errors') || [];
      existingErrors.push(errorData);
      await setItem('qa-errors', existingErrors.slice(-10)); // Keep last 10
    } catch (e) {
      console.warn('Failed to log error to storage:', e);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                Something went wrong
              </CardTitle>
              <CardDescription>
                An unexpected error occurred. This has been logged for debugging.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {this.state.error?.message}
                </AlertDescription>
              </Alert>

              {import.meta.env.MODE === 'development' && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium mb-2">
                    Error Details (Development Mode)
                  </summary>
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto">
                    {this.state.error?.stack}
                  </pre>
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto mt-2">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleRetry} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} variant="default">
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  return async (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by error handler:', error, errorInfo);
    
    if (import.meta.env.MODE === 'development') {
      try {
        const errorData = {
          timestamp: new Date().toISOString(),
          message: error.message,
          stack: error.stack
        };
        
        const existingErrors = await getItem<any[]>('qa-errors') || [];
        existingErrors.push(errorData);
        await setItem('qa-errors', existingErrors.slice(-10));
      } catch (e) {
        console.warn('Failed to log error:', e);
      }
    }
  };
};
