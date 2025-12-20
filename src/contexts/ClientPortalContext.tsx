import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ClientPortalAccess {
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
  refetch: () => Promise<void>;
}

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export const useClientPortal = () => {
  const context = useContext(ClientPortalContext);
  if (context === undefined) {
    throw new Error('useClientPortal must be used within a ClientPortalProvider');
  }
  return context;
};

interface ClientPortalProviderProps {
  children: React.ReactNode;
}

export const ClientPortalProvider: React.FC<ClientPortalProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [clientAccess, setClientAccess] = useState<ClientPortalAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkClientAccess = async () => {
    if (!user) {
      setClientAccess(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('client_portal_users')
        .select(`
          client_id,
          portal_role,
          is_active,
          tenant_id,
          clients!inner(display_name)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (queryError) {
        console.error('Error checking client portal access:', queryError);
        setError('Failed to verify client portal access.');
        setClientAccess(null);
      } else if (!data) {
        setClientAccess(null);
      } else {
        const clientData = data.clients as { display_name: string };
        setClientAccess({
          clientId: data.client_id,
          clientName: clientData.display_name,
          portalRole: data.portal_role || 'viewer',
          tenantId: data.tenant_id
        });

        // Update last_login_at
        await supabase
          .from('client_portal_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('client_id', data.client_id);
      }
    } catch (err) {
      console.error('Error in checkClientAccess:', err);
      setError('An unexpected error occurred.');
      setClientAccess(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      checkClientAccess();
    }
  }, [user, authLoading]);

  const value: ClientPortalContextType = {
    clientAccess,
    loading: authLoading || loading,
    error,
    isClientPortalUser: !!clientAccess,
    refetch: checkClientAccess
  };

  return (
    <ClientPortalContext.Provider value={value}>
      {children}
    </ClientPortalContext.Provider>
  );
};
