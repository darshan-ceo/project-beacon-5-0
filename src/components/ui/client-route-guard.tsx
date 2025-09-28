import React from 'react';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { Navigate } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ClientRouteGuardProps {
  children: React.ReactNode;
}

export const ClientRouteGuard: React.FC<ClientRouteGuardProps> = ({ children }) => {
  const { currentUser, switchRole } = useRBAC();

  // For demo purposes, allow any role to access client portal
  // In production, this would check actual client authentication
  const hasClientAccess = true;

  if (!hasClientAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the client portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Main Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};