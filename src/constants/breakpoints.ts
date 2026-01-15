/**
 * Centralized breakpoint definitions for responsive design
 * Based on Adaptive Form Presentation Architecture (AFPA)
 */
export const BREAKPOINTS = {
  /** Mobile: 0-767px */
  MOBILE_MAX: 767,
  /** Tablet: 768-1023px */
  TABLET_MIN: 768,
  TABLET_MAX: 1023,
  /** Desktop: 1024px+ */
  DESKTOP_MIN: 1024,
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Determine device type based on window width
 */
export function getDeviceType(width: number): DeviceType {
  if (width >= BREAKPOINTS.DESKTOP_MIN) return 'desktop';
  if (width >= BREAKPOINTS.TABLET_MIN) return 'tablet';
  return 'mobile';
}
