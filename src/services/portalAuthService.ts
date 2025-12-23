/**
 * Portal Authentication Service
 * Handles authentication for client portal users using isolated Supabase Auth client
 */

import { portalSupabase } from "@/integrations/supabase/portalClient";
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
   * Uses isolated portal Supabase client to prevent overwriting admin auth
   */
  async login(username: string, password: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    try {
      console.log('[PortalAuth] === LOGIN ATTEMPT START ===');
      console.log('[PortalAuth] Username:', username);

      // Step 1: Call edge function to lookup loginEmail
      console.log('[PortalAuth] Step 1: Looking up loginEmail...');
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke(
        'portal-lookup-login-email',
        { body: { identifier: username } }
      );

      console.log('[PortalAuth] Lookup response - data:', JSON.stringify(lookupData));
      console.log('[PortalAuth] Lookup response - error:', lookupError ? JSON.stringify(lookupError) : 'none');

      if (lookupError) {
        console.error('[PortalAuth] FAILED at Step 1: Lookup edge function error');
        return { success: false, error: 'Login failed. Please try again.' };
      }

      if (lookupData?.error) {
        console.log('[PortalAuth] FAILED at Step 1: Lookup returned error:', lookupData.error);
        return { success: false, error: 'Invalid username or password' };
      }

      const loginEmail = lookupData?.loginEmail;

      if (!loginEmail) {
        console.log('[PortalAuth] FAILED at Step 1: No loginEmail in response');
        return { success: false, error: 'Portal access not configured. Please contact your administrator.' };
      }

      console.log('[PortalAuth] Step 1 SUCCESS: Got loginEmail:', loginEmail);

      // Step 2: Sign in using ISOLATED portal Supabase client
      console.log('[PortalAuth] Step 2: Authenticating with portalSupabase...');
      const { data: authData, error: authError } = await portalSupabase.auth.signInWithPassword({
        email: loginEmail,
        password
      });

      if (authError) {
        console.error('[PortalAuth] FAILED at Step 2: Auth error');
        console.error('[PortalAuth] Auth error message:', authError.message);
        console.error('[PortalAuth] Auth error status:', authError.status);
        console.error('[PortalAuth] Auth error full:', JSON.stringify(authError));
        
        if (authError.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid username or password' };
        }
        return { success: false, error: authError.message || 'Authentication failed' };
      }

      if (!authData.user) {
        console.log('[PortalAuth] FAILED at Step 2: No user in auth response');
        return { success: false, error: 'Authentication failed' };
      }

      console.log('[PortalAuth] Step 2 SUCCESS: Authenticated user:', authData.user.id);

      // Step 3: Get client portal user record
      console.log('[PortalAuth] Step 3: Fetching portal user record...');
      const { data: portalUser, error: portalError } = await portalSupabase
        .from('client_portal_users')
        .select('client_id, tenant_id, portal_role, clients(display_name)')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .single();

      if (portalError || !portalUser) {
        console.error('[PortalAuth] FAILED at Step 3: Portal user fetch error');
        console.error('[PortalAuth] Portal error message:', portalError?.message);
        console.error('[PortalAuth] Portal error code:', portalError?.code);
        console.error('[PortalAuth] Portal error full:', JSON.stringify(portalError));
        
        // Sign out since they're not a valid portal user
        await portalSupabase.auth.signOut();
        return { 
          success: false, 
          error: 'Portal access not found. Please contact your administrator.' 
        };
      }

      console.log('[PortalAuth] Step 3 SUCCESS: Portal user found:', JSON.stringify(portalUser));

      // Step 4: Create and save session
      console.log('[PortalAuth] Step 4: Creating session...');
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
      await portalSupabase
        .from('client_portal_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', authData.user.id);

      this.saveSession(session);

      console.log('[PortalAuth] === LOGIN SUCCESS ===');
      console.log('[PortalAuth] Session created for:', session.clientName);

      return { success: true, session };
    } catch (error) {
      console.error('[PortalAuth] === LOGIN EXCEPTION ===');
      console.error('[PortalAuth] Caught error:', error);
      console.error('[PortalAuth] Error type:', typeof error);
      console.error('[PortalAuth] Error stringify:', JSON.stringify(error));
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
   * Check if portal session is valid (both local session and Supabase auth)
   */
  isSessionValid(): boolean {
    const session = this.getSession();
    return session !== null && session.isAuthenticated && session.expiresAt > Date.now();
  },

  /**
   * Validate that portal Supabase auth matches local session
   */
  async validateSupabaseSession(): Promise<{ valid: boolean; userId?: string }> {
    try {
      const { data: { session } } = await portalSupabase.auth.getSession();
      if (session?.user) {
        return { valid: true, userId: session.user.id };
      }
      return { valid: false };
    } catch (error) {
      console.error('[PortalAuth] Failed to validate Supabase session:', error);
      return { valid: false };
    }
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
   * Logout portal user - uses isolated portal client
   */
  async logout(): Promise<void> {
    try {
      // Sign out from portal Supabase client (doesn't affect admin auth)
      await portalSupabase.auth.signOut();
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

  /**
   * Get the portal Supabase client for data queries
   */
  getClient() {
    return portalSupabase;
  }
};
