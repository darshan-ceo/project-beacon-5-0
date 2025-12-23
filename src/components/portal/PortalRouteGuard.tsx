/**
 * Portal Route Guard
 * Protects portal routes and redirects unauthenticated users to portal login
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';

interface PortalRouteGuardProps {
  children: React.ReactNode;
}

export const PortalRouteGuard: React.FC<PortalRouteGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = usePortalAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Redirect to portal login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default PortalRouteGuard;
