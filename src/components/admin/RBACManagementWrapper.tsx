import React, { useState, useEffect } from 'react';
import { RBACManagement } from './RBACManagement';
import { unifiedStore } from '@/persistence/unifiedStore';
import { Skeleton } from '@/components/ui/skeleton';

// Proper React Error Boundary for RBAC component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class RBACErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RBAC Management Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64 flex-col space-y-4">
          <div className="text-destructive">RBAC Management Error</div>
          <div className="text-sm text-muted-foreground">
            Failed to load RBAC management interface. Please refresh the page.
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Store initialization wrapper
const StoreInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeReady, setStoreReady] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const initializeStore = async () => {
    try {
      setStoreError(null);
      setIsRetrying(true);
      await unifiedStore.waitUntilReady();
      setStoreReady(true);
    } catch (error) {
      console.error('Failed to initialize unifiedStore:', error);
      setStoreError(error instanceof Error ? error.message : 'Failed to initialize storage');
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    initializeStore();
  }, []);

  if (storeError) {
    return (
      <div className="flex items-center justify-center h-64 flex-col space-y-4">
        <div className="text-destructive">Storage Initialization Error</div>
        <div className="text-sm text-muted-foreground max-w-md text-center">
          {storeError}
        </div>
        <button 
          onClick={initializeStore}
          disabled={isRetrying}
          className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  if (!storeReady) {
    return (
      <div className="flex items-center justify-center h-64 flex-col space-y-4">
        <div className="text-muted-foreground">Initializing RBAC Management...</div>
        <div className="space-y-2 w-full max-w-md">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Wrapper component that ensures store is ready before rendering RBAC Management
export const RBACManagementWrapper: React.FC = () => {
  return (
    <RBACErrorBoundary>
      <StoreInitializer>
        <RBACManagement />
      </StoreInitializer>
    </RBACErrorBoundary>
  );
};