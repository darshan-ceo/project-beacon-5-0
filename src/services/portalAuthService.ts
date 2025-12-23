/**
 * Portal Authentication Service
 * Handles authentication for client portal users using credentials stored in clients table
 */

import { supabase } from "@/integrations/supabase/client";

export interface PortalSession {
  clientId: string;
  clientName: string;
  tenantId: string;
  username: string;
  expiresAt: number;
  isAuthenticated: boolean;
}

interface PortalAccessData {
  allowLogin: boolean;
  username: string;
  passwordHash: string;
  email?: string;
}

const PORTAL_SESSION_KEY = 'portal_session';
const SESSION_DURATION_HOURS = 24;

export const portalAuthService = {
  /**
   * Authenticate portal user with username and password
   * Validates against clients.portal_access JSONB column
   */
  async login(username: string, password: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    try {
      // Query clients table for all clients with portal_access enabled
      const { data: clients, error: queryError } = await supabase
        .from('clients')
        .select('id, display_name, tenant_id, portal_access')
        .not('portal_access', 'is', null);

      if (queryError) {
        console.error('Portal login query error:', queryError);
        return { success: false, error: 'Login failed. Please try again.' };
      }

      if (!clients || clients.length === 0) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Find client with matching username (case-insensitive)
      const matchingClient = clients.find(client => {
        const portalAccess = client.portal_access as unknown as PortalAccessData | null;
        if (!portalAccess || !portalAccess.allowLogin) return false;
        return portalAccess.username?.toLowerCase() === username.toLowerCase();
      });

      if (!matchingClient) {
        return { success: false, error: 'Invalid username or password' };
      }

      const portalAccess = matchingClient.portal_access as unknown as PortalAccessData;

      // Validate password (plain text comparison for now)
      // In production, use bcrypt hash comparison via Edge Function
      if (portalAccess.passwordHash !== password) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Create session
      const expiresAt = Date.now() + (SESSION_DURATION_HOURS * 60 * 60 * 1000);
      const session: PortalSession = {
        clientId: matchingClient.id,
        clientName: matchingClient.display_name,
        tenantId: matchingClient.tenant_id,
        username: portalAccess.username,
        expiresAt,
        isAuthenticated: true,
      };

      // Store session
      this.saveSession(session);

      return { success: true, session };
    } catch (error) {
      console.error('Portal login error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  },

  /**
   * Save session to localStorage
   */
  saveSession(session: PortalSession): void {
    try {
      localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save portal session:', error);
    }
  },

  /**
   * Get current portal session
   */
  getSession(): PortalSession | null {
    try {
      const sessionData = localStorage.getItem(PORTAL_SESSION_KEY);
      if (!sessionData) return null;

      const session: PortalSession = JSON.parse(sessionData);
      
      // Check if session has expired
      if (session.expiresAt < Date.now()) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get portal session:', error);
      return null;
    }
  },

  /**
   * Check if portal session is valid
   */
  isSessionValid(): boolean {
    const session = this.getSession();
    return session !== null && session.isAuthenticated && session.expiresAt > Date.now();
  },

  /**
   * Clear portal session (logout)
   */
  clearSession(): void {
    try {
      localStorage.removeItem(PORTAL_SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear portal session:', error);
    }
  },

  /**
   * Logout portal user
   */
  async logout(): Promise<void> {
    this.clearSession();
  },

  /**
   * Extend session expiry
   */
  extendSession(): void {
    const session = this.getSession();
    if (session) {
      session.expiresAt = Date.now() + (SESSION_DURATION_HOURS * 60 * 60 * 1000);
      this.saveSession(session);
    }
  },
};
