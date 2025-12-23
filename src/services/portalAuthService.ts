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
  portalRole: string;
  expiresAt: number;
  isAuthenticated: boolean;
}

const PORTAL_SESSION_KEY = 'portal_session';
const SESSION_DURATION_HOURS = 24;

export const portalAuthService = {
  /**
   * Authenticate portal user with username and password
   */
  async login(username: string, password: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    try {
      // Query client_portal_users to find matching credentials
      const { data: portalUsers, error: portalError } = await supabase
        .from('client_portal_users')
        .select(`
          id,
          user_id,
          client_id,
          email,
          portal_role,
          tenant_id,
          is_active,
          clients!client_portal_users_client_id_fkey (
            id,
            display_name,
            tenant_id
          )
        `)
        .eq('email', username.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (portalError) {
        console.error('Portal login query error:', portalError);
        return { success: false, error: 'Login failed. Please try again.' };
      }

      if (!portalUsers) {
        // Try alternative: check if username matches in a case-insensitive way
        const { data: altPortalUsers, error: altError } = await supabase
          .from('client_portal_users')
          .select(`
            id,
            user_id,
            client_id,
            email,
            portal_role,
            tenant_id,
            is_active,
            clients!client_portal_users_client_id_fkey (
              id,
              display_name,
              tenant_id
            )
          `)
          .ilike('email', username)
          .eq('is_active', true)
          .maybeSingle();

        if (altError || !altPortalUsers) {
          return { success: false, error: 'Invalid username or password' };
        }

        // Found user with case-insensitive match
        return this.validateAndCreateSession(altPortalUsers, password);
      }

      return this.validateAndCreateSession(portalUsers, password);
    } catch (error) {
      console.error('Portal login error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  },

  /**
   * Validate password and create session
   */
  async validateAndCreateSession(portalUser: any, password: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    // For now, we'll use Supabase Auth to validate the password
    // The portal user should have been created in auth.users when they were added
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: portalUser.email,
      password: password,
    });

    if (authError || !authData.user) {
      console.error('Portal auth validation error:', authError);
      return { success: false, error: 'Invalid username or password' };
    }

    // Get client info
    const clientInfo = portalUser.clients;
    if (!clientInfo) {
      return { success: false, error: 'Client account not found' };
    }

    // Create session
    const expiresAt = Date.now() + (SESSION_DURATION_HOURS * 60 * 60 * 1000);
    const session: PortalSession = {
      clientId: portalUser.client_id,
      clientName: clientInfo.display_name,
      tenantId: portalUser.tenant_id,
      username: portalUser.email,
      portalRole: portalUser.portal_role || 'viewer',
      expiresAt,
      isAuthenticated: true,
    };

    // Store session
    this.saveSession(session);

    // Update last login timestamp
    await supabase
      .from('client_portal_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', portalUser.id);

    return { success: true, session };
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
    // Also sign out from Supabase auth
    await supabase.auth.signOut();
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
