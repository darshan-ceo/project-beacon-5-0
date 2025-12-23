/**
 * Client Portal Context
 * Manages client access information for portal users using isolated portal client
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { portalSupabase } from '@/integrations/supabase/portalClient';
import { usePortalAuth } from './PortalAuthContext';

export interface ClientPortalAccess {
  clientId: string;
  clientName: string;
  portalRole: string;
  tenantId: string;
}

interface ClientPortalContextType {
  clientAccess: ClientPortalAccess | null;
  loading: boolean;
  error: string | null;
  isClientPortalUser: boolean;
  refetch: () => void;
}

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export const useClientPortal = (): ClientPortalContextType => {
  const context = useContext(ClientPortalContext);
  if (!context) {
    throw new Error('useClientPortal must be used within a ClientPortalProvider');
  }
  return context;
};

interface ClientPortalProviderProps {
  children: ReactNode;
}

export const ClientPortalProvider: React.FC<ClientPortalProviderProps> = ({ children }) => {
  const { portalSession, isAuthenticated } = usePortalAuth();
  const [clientAccess, setClientAccess] = useState<ClientPortalAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkClientAccess = useCallback(async () => {
    // Use portal session data directly - it already has all the info we need
    if (!isAuthenticated || !portalSession) {
      console.log('[ClientPortal] Not authenticated or no portal session');
      setClientAccess(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[ClientPortal] Using portal session data:', {
        userId: portalSession.userId,
        clientId: portalSession.clientId,
        clientName: portalSession.clientName
      });

      // Verify the portal user record still exists and is active using portal client
      const { data: portalUser, error: portalError } = await portalSupabase
        .from('client_portal_users')
        .select('client_id, tenant_id, portal_role, is_active, clients(display_name)')
        .eq('user_id', portalSession.userId)
        .eq('is_active', true)
        .single();

      if (portalError) {
        console.error('[ClientPortal] Error fetching portal user:', portalError);
        // Fall back to session data if query fails
        setClientAccess({
          clientId: portalSession.clientId,
          clientName: portalSession.clientName,
          portalRole: 'viewer',
          tenantId: portalSession.tenantId
        });
        setLoading(false);
        return;
      }

      if (!portalUser) {
        console.log('[ClientPortal] Portal user not found or inactive');
        setError('Portal access has been revoked. Please contact your administrator.');
        setClientAccess(null);
        setLoading(false);
        return;
      }

      console.log('[ClientPortal] Portal user verified:', portalUser);

      setClientAccess({
        clientId: portalUser.client_id,
        clientName: (portalUser.clients as any)?.display_name || portalSession.clientName,
        portalRole: portalUser.portal_role || 'viewer',
        tenantId: portalUser.tenant_id
      });

    } catch (err) {
      console.error('[ClientPortal] Error checking client access:', err);
      // Fall back to session data
      setClientAccess({
        clientId: portalSession.clientId,
        clientName: portalSession.clientName,
        portalRole: 'viewer',
        tenantId: portalSession.tenantId
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, portalSession]);

  useEffect(() => {
    checkClientAccess();
  }, [checkClientAccess]);

  const value: ClientPortalContextType = {
    clientAccess,
    loading,
    error,
    isClientPortalUser: clientAccess !== null,
    refetch: checkClientAccess
  };

  return (
    <ClientPortalContext.Provider value={value}>
      {children}
    </ClientPortalContext.Provider>
  );
};
