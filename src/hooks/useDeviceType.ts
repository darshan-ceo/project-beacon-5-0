import * as React from 'react';
import { BREAKPOINTS, DeviceType, getDeviceType } from '@/constants/breakpoints';

/**
 * Hook to determine current device type based on viewport width
 * Returns 'mobile', 'tablet', or 'desktop'
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = React.useState<DeviceType>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return getDeviceType(window.innerWidth);
  });

  React.useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType(window.innerWidth));
    };

    // Create media query listeners for precise breakpoint detection
    const desktopMq = window.matchMedia(`(min-width: ${BREAKPOINTS.DESKTOP_MIN}px)`);
    const tabletMq = window.matchMedia(
      `(min-width: ${BREAKPOINTS.TABLET_MIN}px) and (max-width: ${BREAKPOINTS.TABLET_MAX}px)`
    );

    const handleChange = () => handleResize();

    desktopMq.addEventListener('change', handleChange);
    tabletMq.addEventListener('change', handleChange);
    
    // Initial check
    handleResize();

    return () => {
      desktopMq.removeEventListener('change', handleChange);
      tabletMq.removeEventListener('change', handleChange);
    };
  }, []);

  return deviceType;
}

/**
 * Check if current device is mobile
 */
export function useIsMobile(): boolean {
  return useDeviceType() === 'mobile';
}

/**
 * Check if current device is tablet
 */
export function useIsTablet(): boolean {
  return useDeviceType() === 'tablet';
}

/**
 * Check if current device is desktop
 */
export function useIsDesktop(): boolean {
  return useDeviceType() === 'desktop';
}
