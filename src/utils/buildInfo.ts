/**
 * Build information for verifying deployed versions
 */
export const BUILD_INFO = {
  timestamp: '2026-01-16T12:00:00Z',
  version: '1.0.1',
  buildId: 'fix-create-client-submit'
};

// Log build info on import (helps verify which version is running)
if (typeof window !== 'undefined') {
  console.log('[BUILD INFO]', BUILD_INFO);
}
