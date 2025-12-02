/**
 * Centralized Environment Configuration with URL Override Support
 * Supports URL parameters: ?gst=on&mock=on&api=https://api.example.com&qa=on
 */

const s = (k: string) => String(import.meta.env[k] || '').trim().toLowerCase();

// Parse environment variables using compact format
let GST_ON = ['on', 'true', '1'].includes(s('VITE_FEATURE_GST_CLIENT_AUTOFILL'));
let MOCK_ON = ['on', 'true', '1'].includes(s('VITE_GST_MOCK'));
let QA_ON = ['on', 'true', '1'].includes(s('VITE_QA_MODE'));
let API = (import.meta.env.VITE_API_BASE_URL || '').trim();

// FORCE PRODUCTION MODE - No demo/dev overrides
const APP_MODE = 'production';
const STORAGE_BACKEND = 'supabase'; // LOCKED - Cannot be overridden

// Check if Supabase is configured (for edge function availability)
const SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// GST uses Supabase edge function (gst-public-lookup), not VITE_API_BASE_URL
const GST_EDGE_FUNCTION_ENABLED = SUPABASE_CONFIGURED;

// URL parameter overrides (LIMITED - No storage mode override)
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search);
  
  if (q.get('gst')) GST_ON = ['on', 'true', '1'].includes(q.get('gst')?.toLowerCase() || '');
  if (q.get('mock')) MOCK_ON = ['on', 'true', '1'].includes(q.get('mock')?.toLowerCase() || '');
  if (q.get('qa')) QA_ON = ['on', 'true', '1'].includes(q.get('qa')?.toLowerCase() || '');
  if (q.get('api')) API = q.get('api') || '';
  
  // CRITICAL: Reject any attempt to override storage mode
  if (q.get('storage') && q.get('storage') !== 'supabase') {
    console.error('❌ REJECTED: Storage mode override detected. Only Supabase is supported.');
  }
  if (q.get('mode') && q.get('mode') !== 'production') {
    console.warn('⚠️ App mode override ignored. Running in production mode.');
  }
}

// Only force mock if Supabase edge function is NOT available
if (!API && !GST_EDGE_FUNCTION_ENABLED) MOCK_ON = true;

export const envConfig = {
  GST_ON,
  MOCK_ON,
  QA_ON,
  API,
  API_SET: Boolean(API) || GST_EDGE_FUNCTION_ENABLED,
  GST_ENABLED: GST_ON || MOCK_ON || GST_EDGE_FUNCTION_ENABLED,
  GST_EDGE_FUNCTION_ENABLED,
  SUPABASE_CONFIGURED,
  
  // Production Mode Configuration (LOCKED)
  APP_MODE: 'production' as const,
  STORAGE_BACKEND: 'supabase' as const,
  IS_DEMO_MODE: false,
  
  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  
  // Validation functions (PRODUCTION LOCKED)
  isDemoMode: () => false,
  isSupabaseMode: () => true,
  enforceDemo: () => false,
  
  // Supabase validation
  assertSupabaseConfigured: () => {
    if (!import.meta.env.VITE_SUPABASE_URL) {
      throw new Error('VITE_SUPABASE_URL not configured');
    }
    if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY not configured');
    }
  },
  
  // Get active storage mode (ALWAYS SUPABASE - No overrides)
  getStorageMode: (): 'supabase' => {
    return 'supabase';
  },
  
  // Status badges for QA dashboard
  getStatusBadges: () => ({
    MODE: APP_MODE.toUpperCase(),
    STORAGE: STORAGE_BACKEND.toUpperCase(),
    GST: GST_ON || GST_EDGE_FUNCTION_ENABLED ? 'ON' : 'OFF',
    API: GST_EDGE_FUNCTION_ENABLED ? 'LIVE' : (API ? 'SET' : 'MISSING'), 
    MOCK: (!GST_EDGE_FUNCTION_ENABLED && MOCK_ON) ? 'ON' : 'OFF',
    QA: QA_ON ? 'ON' : 'OFF'
  }),
  
  // Helper to check if URL overrides are active
  hasUrlOverrides: typeof window !== 'undefined' ? 
    new URLSearchParams(window.location.search).has('gst') ||
    new URLSearchParams(window.location.search).has('mock') ||
    new URLSearchParams(window.location.search).has('qa') ||
    new URLSearchParams(window.location.search).has('api') ||
    new URLSearchParams(window.location.search).has('mode') ||
    new URLSearchParams(window.location.search).has('storage') : false,
    
  // Get active overrides for debugging
  getActiveOverrides: () => {
    if (typeof window === 'undefined') return {};
    
    const q = new URLSearchParams(window.location.search);
    const overrides: Record<string, string> = {};
    
    if (q.get('gst')) overrides.gst = q.get('gst')!;
    if (q.get('mock')) overrides.mock = q.get('mock')!;
    if (q.get('qa')) overrides.qa = q.get('qa')!;
    if (q.get('api')) overrides.api = q.get('api')!;
    if (q.get('mode')) overrides.mode = q.get('mode')!;
    if (q.get('storage')) overrides.storage = q.get('storage')!;
    
    return overrides;
  },
  
  // DEMO mode guards (DEPRECATED)
  assertDemoMode: () => {
    throw new Error('Demo mode is deprecated - application uses production Supabase');
  }
};