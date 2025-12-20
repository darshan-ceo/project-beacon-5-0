import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientRouteGuardProps {
  children: React.ReactNode;
}

export const ClientRouteGuard: React.FC<ClientRouteGuardProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { clientAccess, loading: portalLoading, error } = useClientPortal();

  const isLoading = authLoading || portalLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying portal access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Authenticated but no client portal access
  if (!clientAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Client Portal Access Required</CardTitle>
            <CardDescription>
              {error || "Your account is not linked to any client for portal access."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Please contact your legal team to request client portal access.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has client portal access - render children
  return <>{children}</>;
};
