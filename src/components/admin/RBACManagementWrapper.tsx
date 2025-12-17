import React from 'react';
import { RBACManagement } from './RBACManagement';

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
    console.error('Access & Roles Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64 flex-col space-y-4">
          <div className="text-destructive">Access & Roles Error</div>
          <div className="text-sm text-muted-foreground">
            Failed to load Access & Roles interface. Please refresh the page.
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

// Wrapper component - RBACManagement uses supabaseRbacService directly, no unifiedStore needed
export const RBACManagementWrapper: React.FC = () => {
  return (
    <RBACErrorBoundary>
      <RBACManagement />
    </RBACErrorBoundary>
  );
};
