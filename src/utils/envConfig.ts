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

// DEMO Mode Configuration
let APP_MODE = (import.meta.env.VITE_APP_MODE || 'demo').trim().toLowerCase();
let STORAGE_BACKEND = (import.meta.env.VITE_STORAGE_BACKEND || 'indexeddb').trim().toLowerCase();

// URL parameter overrides
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search);
  
  if (q.get('gst')) GST_ON = ['on', 'true', '1'].includes(q.get('gst')?.toLowerCase() || '');
  if (q.get('mock')) MOCK_ON = ['on', 'true', '1'].includes(q.get('mock')?.toLowerCase() || '');
  if (q.get('qa')) QA_ON = ['on', 'true', '1'].includes(q.get('qa')?.toLowerCase() || '');
  if (q.get('api')) API = q.get('api') || '';
  
  // DEMO mode overrides
  if (q.get('mode')) APP_MODE = q.get('mode')?.toLowerCase() || 'demo';
  if (q.get('storage')) STORAGE_BACKEND = q.get('storage')?.toLowerCase() || 'indexeddb';
}

// If no API → force mock
if (!API) MOCK_ON = true;

// DEMO mode enforcements
const isDemoMode = APP_MODE === 'demo';
if (isDemoMode) {
  MOCK_ON = true; // Force mock mode in demo
  API = ''; // No API calls in demo mode
}

export const envConfig = {
  GST_ON,
  MOCK_ON,
  QA_ON,
  API,
  API_SET: Boolean(API),
  GST_ENABLED: GST_ON || MOCK_ON,
  
  // DEMO Mode Configuration
  APP_MODE,
  STORAGE_BACKEND,
  IS_DEMO_MODE: isDemoMode,
  
  // Validation functions
  isDemoMode: () => APP_MODE === 'demo',
  isIndexedDBMode: () => STORAGE_BACKEND === 'indexeddb',
  enforceDemo: () => isDemoMode && STORAGE_BACKEND === 'indexeddb',
  
  // Status badges for QA dashboard
  getStatusBadges: () => ({
    MODE: APP_MODE.toUpperCase(),
    STORAGE: STORAGE_BACKEND.toUpperCase(),
    GST: GST_ON ? 'ON' : 'OFF',
    API: API ? 'SET' : 'MISSING', 
    MOCK: MOCK_ON ? 'ON' : 'OFF',
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
  
  // DEMO mode guards
  assertDemoMode: () => {
    if (!isDemoMode) {
      throw new Error('Operation only allowed in DEMO mode');
    }
  },
  
  assertIndexedDB: () => {
    if (STORAGE_BACKEND !== 'indexeddb') {
      throw new Error('Operation requires IndexedDB storage backend');
    }
  }
};