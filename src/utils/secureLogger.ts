/**
 * Secure Logger Utility
 * Sanitizes sensitive data from logs and provides environment-aware logging
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'auth',
  'bearer',
  'credential',
  'private_key',
  'access_token',
  'refresh_token',
  'session_token',
];

/**
 * Recursively sanitize sensitive data from objects
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data !== 'object') return data;
  
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive terms
    if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Secure logger that sanitizes sensitive data
 * In production, only errors are logged
 */
export const secureLog = {
  /**
   * Log informational messages (development only)
   */
  info: (message: string, data?: any) => {
    if (import.meta.env.MODE === 'production') return;
    console.log(`[INFO] ${message}`, data ? sanitizeData(data) : '');
  },

  /**
   * Log errors (always logged, even in production)
   */
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? sanitizeData(error) : '');
  },

  /**
   * Log warnings
   */
  warn: (message: string, data?: any) => {
    if (import.meta.env.MODE === 'production') return;
    console.warn(`[WARN] ${message}`, data ? sanitizeData(data) : '');
  },

  /**
   * Log debug messages (development only)
   */
  debug: (message: string, data?: any) => {
    if (import.meta.env.MODE === 'development') {
      console.debug(`[DEBUG] ${message}`, data ? sanitizeData(data) : '');
    }
  },
};
