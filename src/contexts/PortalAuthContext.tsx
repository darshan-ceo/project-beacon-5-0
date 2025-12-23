/**
 * Portal Authentication Context
 * Manages authentication state for client portal users (separate from main app auth)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { portalAuthService, PortalSession } from '@/services/portalAuthService';
import { getAuthErrorMessage } from '@/utils/errorUtils';

interface PortalAuthContextType {
  portalSession: PortalSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => void;
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

  const checkSession = useCallback(() => {
    const session = portalAuthService.getSession();
    setPortalSession(session);
    setIsLoading(false);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Set up session check interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (portalSession && !portalAuthService.isSessionValid()) {
        setPortalSession(null);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [portalSession]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await portalAuthService.login(username, password);
      
      if (result.success && result.session) {
        setPortalSession(result.session);
        return { success: true };
      } else {
        // Use the error utility to get a meaningful message
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
    checkSession,
  };

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
};
