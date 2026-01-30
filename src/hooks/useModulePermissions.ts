/**
 * useModulePermissions Hook
 * Provides standardized module-level permission checks using RBAC
 * Single source of truth for UI permission gating
 */

import { useMemo } from 'react';
import { useRBAC } from '@/hooks/useAdvancedRBAC';

export interface ModulePermissions {
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAdmin: boolean;
  isLoading: boolean;
  isEnforced: boolean;
}

/**
 * Hook to get all permission states for a module
 * Returns consistent permission booleans for UI gating
 */
export const useModulePermissions = (moduleName: string): ModulePermissions => {
  const { hasPermission, isLoading, enforcementEnabled, isRbacReady } = useRBAC();

  return useMemo(() => {
    // If enforcement is disabled or still loading, be permissive
    if (!enforcementEnabled) {
      return {
        canRead: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canAdmin: true,
        isLoading: false,
        isEnforced: false,
      };
    }

    // While loading, be restrictive (fail-closed)
    if (!isRbacReady) {
      return {
        canRead: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canAdmin: false,
        isLoading: true,
        isEnforced: true,
      };
    }

    return {
      canRead: hasPermission(moduleName, 'read'),
      canCreate: hasPermission(moduleName, 'write'),
      canEdit: hasPermission(moduleName, 'write'),
      canDelete: hasPermission(moduleName, 'delete'),
      canAdmin: hasPermission(moduleName, 'admin'),
      isLoading: false,
      isEnforced: true,
    };
  }, [moduleName, hasPermission, isLoading, enforcementEnabled, isRbacReady]);
};

/**
 * Maps sidebar routes to RBAC module names
 * Used by the Sidebar to check visibility based on RBAC permissions
 */
export const ROUTE_TO_RBAC_MODULE: Record<string, string> = {
  // MONITOR section - always visible
  '/': 'dashboard',
  '/compliance': 'compliance',  // FIX: was 'dashboard', now correctly uses 'compliance' module
  
  // LITIGATION section
  '/cases': 'cases',
  '/hearings/calendar': 'hearings',
  '/hearings': 'hearings',
  '/tasks': 'tasks',
  
  // CLIENTS section
  '/clients': 'clients',
  '/contacts': 'clients',
  '/client-groups': 'client_groups',  // FIX: was 'clients', now correctly uses 'client_groups' module
  
  // DOCUMENTS section
  '/documents': 'documents',
  
  // ANALYTICS section
  '/reports': 'reports',
  
  // CONFIGURATION section
  '/courts': 'courts',
  '/judges': 'judges',
  '/employees': 'employees',
  '/statutory-acts': 'settings',
  
  // SUPPORT section - BYPASSED from RBAC (always accessible to all users)
  // '/help' and '/profile' intentionally NOT mapped - they bypass RBAC checks
  
  // ADMINISTRATION section - admin only
  '/settings': 'settings',
  '/access-roles': 'rbac',
  
  // DEVELOPER section - admin only
  '/dev-dashboard': 'admin',
  '/qa': 'admin',
  '/debug/gst': 'admin',
};

/**
 * Get the RBAC module name for a given route
 */
export const getRbacModuleForRoute = (route: string): string | null => {
  return ROUTE_TO_RBAC_MODULE[route] || null;
};

export default useModulePermissions;
