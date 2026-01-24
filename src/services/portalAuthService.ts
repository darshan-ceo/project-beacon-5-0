/**
 * Portal Authentication Service
 * Handles authentication for client portal users using isolated Supabase Auth client
 * 
 * Security: Session data is fetched from database on each validation, not stored in localStorage
 */

import { portalSupabase } from "@/integrations/supabase/portalClient";
import { supabase } from "@/integrations/supabase/client";

export interface PortalSession {
  clientId: string;
  clientName: string;
  tenantId: string;
  username: string;
  userId: string;
  portalRole: string;
  isAuthenticated: boolean;
}

export const portalAuthService = {
  /**
   * Authenticate portal user with username and password
   * Uses isolated portal Supabase client to prevent overwriting admin auth
   */
  async login(username: string, password: string): Promise<{ success: boolean; session?: PortalSession; error?: string }> {
    try {
      console.log('[PortalAuth] === LOGIN ATTEMPT START ===');
      console.log('[PortalAuth] Username:', username);

      // Step 0: Clean up any stale sessions to avoid auth conflicts
      console.log('[PortalAuth] Step 0: Clearing stale sessions...');
      try {
        await portalSupabase.auth.signOut();
        console.log('[PortalAuth] Step 0 SUCCESS: Stale sessions cleared');
      } catch (cleanupError) {
        // Non-fatal - continue with login attempt
        console.log('[PortalAuth] Step 0: Cleanup had non-fatal error, continuing...', cleanupError);
      }

      // Trim credentials to avoid whitespace issues from copy/paste
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      // Step 1: Call edge function to lookup loginEmail
      console.log('[PortalAuth] Step 1: Looking up loginEmail...');
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke(
        'portal-lookup-login-email',
        { body: { identifier: trimmedUsername } }
      );

      console.log('[PortalAuth] Lookup response - data:', JSON.stringify(lookupData));
      console.log('[PortalAuth] Lookup response - error:', lookupError ? JSON.stringify(lookupError) : 'none');

      if (lookupError) {
        console.error('[PortalAuth] FAILED at Step 1: Lookup edge function error', lookupError);
        const isNetworkError = lookupError.message?.toLowerCase().includes('network') ||
                               lookupError.message?.toLowerCase().includes('fetch') ||
                               lookupError.message?.toLowerCase().includes('timeout');
        if (isNetworkError) {
          return { success: false, error: 'Unable to connect. Please check your connection and try again.' };
        }
        return { success: false, error: 'Login service unavailable. Please try again later.' };
      }

      if (lookupData?.error) {
        console.log('[PortalAuth] FAILED at Step 1: Lookup returned error:', lookupData.error);
        if (lookupData.error.toLowerCase().includes('not found') || 
            lookupData.error.toLowerCase().includes('invalid username')) {
          return { success: false, error: 'Username not found. Please check your username and try again.' };
        }
        if (lookupData.error.toLowerCase().includes('not enabled') || 
            lookupData.error.toLowerCase().includes('portal access')) {
          return { success: false, error: 'Portal access is not enabled for this account.' };
        }
        return { success: false, error: lookupData.error };
      }

      const loginEmail = lookupData?.loginEmail;

      if (!loginEmail) {
        console.log('[PortalAuth] FAILED at Step 1: No loginEmail in response');
        return { success: false, error: 'Username not found. Please check and try again.' };
      }

      console.log('[PortalAuth] Step 1 SUCCESS: Got loginEmail:', loginEmail);

      // Step 2: Sign in using ISOLATED portal Supabase client
      console.log('[PortalAuth] Step 2: Authenticating with portalSupabase...');
      const { data: authData, error: authError } = await portalSupabase.auth.signInWithPassword({
        email: loginEmail,
        password: trimmedPassword
      });

      if (authError) {
        console.error('[PortalAuth] FAILED at Step 2: Auth error');
        console.error('[PortalAuth] Auth error message:', authError.message);
        
        if (authError.message.includes('Invalid login credentials')) {
          return { 
            success: false, 
            error: 'Incorrect password. Please try again or contact your administrator to reset your password.' 
          };
        }
        if (authError.message.includes('Email not confirmed')) {
          return { 
            success: false, 
            error: 'Account not verified. Please contact your administrator.' 
          };
        }
        return { success: false, error: authError.message || 'Authentication failed. Please try again.' };
      }

      if (!authData.user) {
        console.log('[PortalAuth] FAILED at Step 2: No user in auth response');
        return { success: false, error: 'Authentication failed' };
      }

      console.log('[PortalAuth] Step 2 SUCCESS: Authenticated user:', authData.user.id);

      // Step 3: Fetch session data from database (server-side source of truth)
      const session = await this.fetchSessionFromDatabase(authData.user.id, trimmedUsername);
      
      if (!session) {
        // Sign out since they're not a valid portal user
        await portalSupabase.auth.signOut();
        return { 
          success: false, 
          error: 'Portal access not found. Please contact your administrator.' 
        };
      }

      // Step 4: Update last login timestamp
      await portalSupabase
        .from('client_portal_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', authData.user.id);

      console.log('[PortalAuth] === LOGIN SUCCESS ===');
      console.log('[PortalAuth] Session created for:', session.clientName);

      return { success: true, session };
    } catch (error) {
      console.error('[PortalAuth] === LOGIN EXCEPTION ===');
      console.error('[PortalAuth] Caught error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  },

  /**
   * Fetch portal session data from database (server-side source of truth)
   * Called on login and session validation - no localStorage involved
   */
  async fetchSessionFromDatabase(userId: string, username?: string): Promise<PortalSession | null> {
    try {
      console.log('[PortalAuth] Fetching session from database for user:', userId);
      
      const { data: portalUser, error: portalError } = await portalSupabase
        .from('client_portal_users')
        .select('client_id, tenant_id, portal_role, clients(display_name, portal_access)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (portalError || !portalUser) {
        console.error('[PortalAuth] Failed to fetch portal user:', portalError?.message);
        return null;
      }

      // Extract username from portal_access if not provided
      const clientData = portalUser.clients as any;
      const portalAccess = clientData?.portal_access;
      const resolvedUsername = username || portalAccess?.username || 'portal_user';

      const session: PortalSession = {
        clientId: portalUser.client_id,
        clientName: clientData?.display_name || 'Unknown Client',
        tenantId: portalUser.tenant_id,
        username: resolvedUsername,
        userId: userId,
        portalRole: portalUser.portal_role || 'viewer',
        isAuthenticated: true,
      };

      console.log('[PortalAuth] Session fetched successfully:', session.clientName);
      return session;
    } catch (error) {
      console.error('[PortalAuth] Exception fetching session:', error);
      return null;
    }
  },

  /**
   * Get current portal session by validating Supabase auth and fetching from database
   * This is the secure replacement for localStorage-based getSession()
   */
  async getSession(): Promise<PortalSession | null> {
    try {
      // Check if Supabase portal auth is valid
      const { data: { session: authSession } } = await portalSupabase.auth.getSession();
      
      if (!authSession?.user) {
        console.log('[PortalAuth] No active Supabase session');
        return null;
      }

      // Fetch session data from database (source of truth)
      return await this.fetchSessionFromDatabase(authSession.user.id);
    } catch (error) {
      console.error('[PortalAuth] Failed to get session:', error);
      return null;
    }
  },

  /**
   * Synchronous session check - uses cached auth state
   * For quick UI checks only; full validation should use async getSession()
   */
  getSessionSync(): PortalSession | null {
    // This is now a no-op returning null
    // UI should use async getSession() or rely on context state
    console.warn('[PortalAuth] getSessionSync() is deprecated, use async getSession()');
    return null;
  },

  /**
   * Check if portal session is valid (async database check)
   */
  async isSessionValid(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null && session.isAuthenticated;
  },

  /**
   * Validate that portal Supabase auth is active
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
   * Logout portal user - uses isolated portal client
   */
  async logout(): Promise<void> {
    try {
      // Sign out from portal Supabase client (doesn't affect admin auth)
      await portalSupabase.auth.signOut();
      console.log('[PortalAuth] Logged out successfully');
    } catch (error) {
      console.error('[PortalAuth] Supabase signOut error:', error);
    }
  },

  /**
   * Get the portal Supabase client for data queries
   */
  getClient() {
    return portalSupabase;
  }
};
