/**
 * Isolated Supabase Client for Portal Authentication
 * Uses a separate storage key to prevent portal auth from overwriting admin auth tokens
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://myncxddatwvtyiioqekh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15bmN4ZGRhdHd2dHlpaW9xZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNDU2MzIsImV4cCI6MjA3NzYyMTYzMn0.CISgb95GqEGJSW46VgIzrRlVReq01Ssk4Y_q_kwv6kM";

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
