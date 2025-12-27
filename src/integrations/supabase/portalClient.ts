/**
 * Isolated Supabase Client for Portal Authentication
 * Uses a separate storage key to prevent portal auth from overwriting admin auth tokens
 * Uses the same environment variables as the main client for consistency
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use same env vars as main client - these are auto-generated
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('[PortalClient] Missing Supabase environment variables');
}

// Portal-specific storage key to isolate from main app auth
const PORTAL_AUTH_STORAGE_KEY = 'sb-portal-auth-token';

/**
 * Isolated Supabase client for portal users
 * This client uses a separate storage key so portal logins don't interfere with admin logins
 */
export const portalSupabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: PORTAL_AUTH_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Portal doesn't use URL-based auth
    }
  }
);

/**
 * Clear all portal-related auth data from localStorage
 * Useful for recovery when portal auth gets into a bad state
 */
export const clearPortalAuthData = (): void => {
  try {
    localStorage.removeItem(PORTAL_AUTH_STORAGE_KEY);
    localStorage.removeItem('portal_session');
    console.log('[PortalClient] Cleared portal auth data');
  } catch (error) {
    console.error('[PortalClient] Failed to clear portal auth data:', error);
  }
};
