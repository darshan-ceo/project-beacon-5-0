/**
 * Portal Authentication Context
 * Manages authentication state for client portal users (separate from main app auth)
 * 
 * Security: Session data is fetched from database, not stored in localStorage
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { portalAuthService, PortalSession } from '@/services/portalAuthService';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { getAuthErrorMessage } from '@/utils/errorUtils';

interface PortalAuthContextType {
  portalSession: PortalSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

export const usePortalAuth = (): PortalAuthContextType => {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  }
  return context;
};

interface PortalAuthProviderProps {
  children: ReactNode;
}

export const PortalAuthProvider: React.FC<PortalAuthProviderProps> = ({ children }) => {
  const [portalSession, setPortalSession] = useState<PortalSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh session from database (server-side source of truth)
   */
  const refreshSession = useCallback(async () => {
    try {
      const session = await portalAuthService.getSession();
      setPortalSession(session);
    } catch (err) {
      console.error('[PortalAuthContext] Failed to refresh session:', err);
      setPortalSession(null);
    }
  }, []);

  /**
   * Initialize: Check for existing Supabase auth and fetch session from database
   */
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // Check if there's an active Supabase portal session
        const session = await portalAuthService.getSession();
        setPortalSession(session);
      } catch (err) {
        console.error('[PortalAuthContext] Init error:', err);
        setPortalSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen to portal Supabase auth state changes
    const { data: { subscription } } = portalSupabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[PortalAuthContext] Auth state changed:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          setPortalSession(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Defer the session fetch to avoid Supabase auth deadlock
          setTimeout(async () => {
            await refreshSession();
          }, 0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await portalAuthService.login(username, password);
      
      if (result.success && result.session) {
        setPortalSession(result.session);
        return { success: true };
      } else {
        const errorMessage = getAuthErrorMessage(result.error) || 'Invalid username or password';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      console.error('[PortalAuthContext] Login exception:', err);
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await portalAuthService.logout();
      setPortalSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: PortalAuthContextType = {
    portalSession,
    isAuthenticated: portalSession !== null && portalSession.isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshSession,
  };

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
};
