/**
 * RouteGuard Component
 * Protects routes based on module access and RBSA permissions
 * Shows access denied page if user doesn't have permission
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUnifiedPermissions, ActionType } from '@/hooks/useUnifiedPermissions';
import { MODULE_DISPLAY_NAMES } from '@/services/permissionEngine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface RouteGuardProps {
  children: React.ReactNode;
  module: string;
  action?: ActionType;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

const AccessDeniedPage: React.FC<{ module: string; action?: ActionType }> = ({ module, action }) => {
  const moduleName = MODULE_DISPLAY_NAMES[module] || module;
  const actionText = action ? ` to ${action}` : '';

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission{actionText} {moduleName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            If you believe you should have access to this area, please contact your administrator.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => window.location.href = '/'}
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh] p-4">
    <Card className="max-w-md w-full">
      <CardHeader>
        <Skeleton className="h-6 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  </div>
);

export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  module, 
  action = 'read',
  fallback,
  redirectTo,
}) => {
  const { isLoading, canSeeModule, canPerform } = useUnifiedPermissions();

  // Show loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Check module visibility first
  if (!canSeeModule(module)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return fallback ? <>{fallback}</> : <AccessDeniedPage module={module} />;
  }

  // Check action permission
  if (!canPerform(module, action)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return fallback ? <>{fallback}</> : <AccessDeniedPage module={module} action={action} />;
  }

  return <>{children}</>;
};

/**
 * Higher-order component version for class components or simpler usage
 */
export const withRouteGuard = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  module: string,
  action: ActionType = 'read'
) => {
  const WithRouteGuard: React.FC<P> = (props) => (
    <RouteGuard module={module} action={action}>
      <WrappedComponent {...props} />
    </RouteGuard>
  );

  WithRouteGuard.displayName = `WithRouteGuard(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithRouteGuard;
};

export default RouteGuard;
