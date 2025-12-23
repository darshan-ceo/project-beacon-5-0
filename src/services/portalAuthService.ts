/**
 * Portal Authentication Service
 * Handles authentication for client portal users using Supabase Auth
 */

import { supabase } from "@/integrations/supabase/client";

export interface PortalSession {
  clientId: string;
  clientName: string;
  tenantId: string;
  username: string;
  userId: string;
  expiresAt: number;
  isAuthenticated: boolean;
}

const PORTAL_SESSION_KEY = 'portal_session';
const SESSION_DURATION_HOURS = 24;

export const portalAuthService = {
  /**
   * Authenticate portal user with username and password
   * Uses Supabase Auth with generated login email
   */
  async login(username: string, password: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    try {
      console.log('[PortalAuth] Attempting login for username:', username);

      // Call edge function to lookup loginEmail (bypasses RLS)
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke(
        'portal-lookup-login-email',
        { body: { identifier: username } }
      );

      if (lookupError) {
        console.error('[PortalAuth] Lookup error:', lookupError);
        return { success: false, error: 'Login failed. Please try again.' };
      }

      if (lookupData?.error) {
        console.log('[PortalAuth] Lookup returned error:', lookupData.error);
        return { success: false, error: 'Invalid username or password' };
      }

      const loginEmail = lookupData?.loginEmail;

      if (!loginEmail) {
        console.log('[PortalAuth] No loginEmail returned from lookup');
        return { success: false, error: 'Portal access not configured. Please contact your administrator.' };
      }

      console.log('[PortalAuth] Got loginEmail from lookup:', loginEmail);

      // Now sign in with Supabase Auth
      console.log('[PortalAuth] Signing in with email:', loginEmail);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      });

      if (authError) {
        console.error('[PortalAuth] Auth error:', authError);
        if (authError.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid username or password' };
        }
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Authentication failed' };
      }

      console.log('[PortalAuth] Auth successful, user:', authData.user.id);

      // Get client portal user record
      const { data: portalUser, error: portalError } = await supabase
        .from('client_portal_users')
        .select('client_id, tenant_id, portal_role, clients(display_name)')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .single();

      if (portalError || !portalUser) {
        console.error('[PortalAuth] Portal user not found:', portalError);
        // Sign out since they're not a valid portal user
        await supabase.auth.signOut();
        return { success: false, error: 'Portal access not found. Please contact your administrator.' };
      }

      console.log('[PortalAuth] Portal user found:', portalUser);

      // Create session
      const expiresAt = Date.now() + (SESSION_DURATION_HOURS * 60 * 60 * 1000);
      const session: PortalSession = {
        clientId: portalUser.client_id,
        clientName: (portalUser.clients as any)?.display_name || 'Unknown Client',
        tenantId: portalUser.tenant_id,
        username,
        userId: authData.user.id,
        expiresAt,
        isAuthenticated: true,
      };

      // Update last login
      await supabase
        .from('client_portal_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', authData.user.id);

      // Store session
      this.saveSession(session);

      return { success: true, session };
    } catch (error) {
      console.error('[PortalAuth] Login error:', error);
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
      console.error('[PortalAuth] Failed to save session:', error);
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
      console.error('[PortalAuth] Failed to get session:', error);
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
      console.error('[PortalAuth] Failed to clear session:', error);
    }
  },

  /**
   * Logout portal user
   */
  async logout(): Promise<void> {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[PortalAuth] Supabase signOut error:', error);
    }
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
