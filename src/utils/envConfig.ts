/**
 * Centralized Environment Configuration with URL Override Support
 * Supports URL parameters: ?gst=on&mock=on&api=https://api.example.com
 */

const norm = (k: string) => String(import.meta.env[k] || '').trim().toLowerCase();

// Parse environment variables
let GST_ON = ['on', 'true', '1'].includes(norm('VITE_FEATURE_GST_CLIENT_AUTOFILL'));
let MOCK_ON = ['on', 'true', '1'].includes(norm('VITE_GST_MOCK'));
let API = (import.meta.env.VITE_API_BASE_URL || '').trim();

// URL parameter overrides
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search);
  
  if (q.get('gst')) GST_ON = ['on', 'true', '1'].includes(q.get('gst')?.toLowerCase() || '');
  if (q.get('mock')) MOCK_ON = ['on', 'true', '1'].includes(q.get('mock')?.toLowerCase() || '');
  if (q.get('api')) API = q.get('api') || '';
}

// If no API → force mock
if (!API) MOCK_ON = true;

export const envConfig = {
  GST_ON,
  MOCK_ON,
  API,
  API_SET: Boolean(API),
  GST_ENABLED: GST_ON || MOCK_ON,
  
  // Helper to check if URL overrides are active
  hasUrlOverrides: typeof window !== 'undefined' ? 
    new URLSearchParams(window.location.search).has('gst') ||
    new URLSearchParams(window.location.search).has('mock') ||
    new URLSearchParams(window.location.search).has('api') : false,
    
  // Get active overrides for debugging
  getActiveOverrides: () => {
    if (typeof window === 'undefined') return {};
    
    const q = new URLSearchParams(window.location.search);
    const overrides: Record<string, string> = {};
    
    if (q.get('gst')) overrides.gst = q.get('gst')!;
    if (q.get('mock')) overrides.mock = q.get('mock')!;
    if (q.get('api')) overrides.api = q.get('api')!;
    
    return overrides;
  }
};