import React from 'react';
import { RBACManagement } from './RBACManagement';

// Simple wrapper with manual error boundary
export const RBACManagementWrapper: React.FC = () => {
  try {
    return <RBACManagement />;
  } catch (error) {
    console.error('RBAC Management error:', error);
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
};