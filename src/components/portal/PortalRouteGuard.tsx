/**
 * Portal Route Guard
 * Protects portal routes and validates both local session AND Supabase auth
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { portalAuthService } from '@/services/portalAuthService';

interface PortalRouteGuardProps {
  children: React.ReactNode;
}

export const PortalRouteGuard: React.FC<PortalRouteGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, portalSession, logout } = usePortalAuth();
  const location = useLocation();
  const [validatingAuth, setValidatingAuth] = useState(true);
  const [authValid, setAuthValid] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      if (isLoading) {
        return;
      }

      if (!isAuthenticated || !portalSession) {
        console.log('[PortalRouteGuard] No local portal session');
        setAuthValid(false);
        setValidatingAuth(false);
        return;
      }

      // Validate that Supabase portal auth session matches local session
      console.log('[PortalRouteGuard] Validating Supabase portal auth...');
      const { valid, userId } = await portalAuthService.validateSupabaseSession();

      if (!valid) {
        console.log('[PortalRouteGuard] No valid Supabase portal session, clearing local session');
        await logout();
        setAuthValid(false);
        setValidatingAuth(false);
        return;
      }

      if (userId !== portalSession.userId) {
        console.log('[PortalRouteGuard] Supabase userId mismatch, clearing session');
        console.log('[PortalRouteGuard] Expected:', portalSession.userId, 'Got:', userId);
        await logout();
        setAuthValid(false);
        setValidatingAuth(false);
        return;
      }

      console.log('[PortalRouteGuard] Portal auth validated successfully');
      setAuthValid(true);
      setValidatingAuth(false);
    };

    validateAuth();
  }, [isAuthenticated, isLoading, portalSession, logout]);

  // Show loading state while checking authentication
  if (isLoading || validatingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Redirect to portal login if not authenticated
  if (!authValid) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default PortalRouteGuard;
