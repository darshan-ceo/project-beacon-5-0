/**
 * Portal Route Guard
 * Protects portal routes using database-backed session validation
 * 
 * Security: Validates Supabase auth and fetches session from database (no localStorage)
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
  const { isAuthenticated, isLoading, portalSession, logout, refreshSession } = usePortalAuth();
  const location = useLocation();
  const [validatingAuth, setValidatingAuth] = useState(true);
  const [authValid, setAuthValid] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      if (isLoading) {
        return;
      }

      // Validate that Supabase portal auth session is active
      console.log('[PortalRouteGuard] Validating Supabase portal auth...');
      const { valid, userId } = await portalAuthService.validateSupabaseSession();

      if (!valid) {
        console.log('[PortalRouteGuard] No valid Supabase portal session');
        setAuthValid(false);
        setValidatingAuth(false);
        return;
      }

      // Check if context has session, if not refresh from database
      if (!portalSession) {
        console.log('[PortalRouteGuard] No context session, refreshing from database...');
        await refreshSession();
      }

      // Verify userId matches (extra security check)
      if (portalSession && userId !== portalSession.userId) {
        console.log('[PortalRouteGuard] User ID mismatch, logging out');
        console.log('[PortalRouteGuard] Expected:', portalSession.userId, 'Got:', userId);
        await logout();
        setAuthValid(false);
        setValidatingAuth(false);
        return;
      }

      // If we have valid Supabase auth and matching session, we're good
      if (valid && (portalSession || !isLoading)) {
        console.log('[PortalRouteGuard] Portal auth validated successfully');
        setAuthValid(isAuthenticated);
      } else {
        setAuthValid(false);
      }
      
      setValidatingAuth(false);
    };

    validateAuth();
  }, [isAuthenticated, isLoading, portalSession, logout, refreshSession]);

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
