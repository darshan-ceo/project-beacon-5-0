/**
 * useModuleAccess Hook
 * Enforces module access based on employee's module_access field
 * Admins and Partners bypass module access restrictions
 */

import { useCallback, useMemo, useContext } from 'react';
import { useAppState } from '@/contexts/AppStateContext';

// Module name to sidebar route mapping
// Module name to sidebar route mapping - aligned with new section-based structure
const MODULE_ROUTE_MAPPING: Record<string, string[]> = {
  // MONITOR section
  'Dashboard': ['/'],
  'Compliance Dashboard': ['/compliance'],
  
  // LITIGATION section
  'Case Management': ['/cases'],
  'Hearings': ['/hearings', '/hearings/calendar'],
  'Task Management': ['/tasks'],
  
  // CLIENTS section
  'Clients': ['/clients'],
  'Contacts': ['/contacts'],
  'Client Groups': ['/client-groups'],
  
  // DOCUMENTS section
  'Document Management': ['/documents'],
  
  // ANALYTICS section
  'Reports': ['/reports'],
  
  // SUPPORT section
  'Help & Knowledge Base': ['/help'],
  'User Profile': ['/profile'],
  
  // CONFIGURATION section (Admin/Partner only)
  'Legal Authorities': ['/courts'],
  'Judge Masters': ['/judges'],
  'Employee Masters': ['/employees'],
  'Statutory Deadlines': ['/statutory-acts'],
  
  // ADMINISTRATION section
  'System Settings': ['/settings'],
  'Access & Roles': ['/access-roles'],
  
  // DEVELOPER section
  'Dev Mode Dashboard': ['/dev-dashboard'],
  'QA Dashboard': ['/qa'],
  'GST Debug': ['/debug/gst'],
};

// Reverse mapping: route to module
const ROUTE_TO_MODULE: Record<string, string> = {};
Object.entries(MODULE_ROUTE_MAPPING).forEach(([module, routes]) => {
  routes.forEach(route => {
    ROUTE_TO_MODULE[route] = module;
  });
});

export interface ModuleAccessResult {
  hasModuleAccess: (moduleOrRoute: string) => boolean;
  filterMenuItems: <T extends { href?: string; label?: string }>(items: T[]) => T[];
  allowedModules: string[];
  isUnrestricted: boolean;
}

export const useModuleAccess = (): ModuleAccessResult => {
  const { state } = useAppState();

  // Get current employee from state using userProfile
  const currentEmployee = useMemo(() => {
    const userId = state.userProfile?.id;
    if (!userId) return null;
    return state.employees.find(e => e.id === userId);
  }, [state.userProfile?.id, state.employees]);

  // Check if user role bypasses module access
  // This checks the employee's operational role for Admin/Partner bypass
  // Note: RBAC admin bypass is handled separately in useAdvancedRBAC
  const isUnrestricted = useMemo(() => {
    if (!currentEmployee) return true; // Allow all if no employee found (fallback)
    
    // Normalize role for comparison
    const normalizedRole = (currentEmployee.role || '').toLowerCase();
    
    // Bypass roles - including 'rm' which maps to Manager (but doesn't bypass)
    // Only admin/partner bypass module access restrictions
    const bypassRoles = ['admin', 'partner', 'partner/ca'];
    return bypassRoles.includes(normalizedRole);
  }, [currentEmployee]);

  // Get allowed modules
  const allowedModules = useMemo((): string[] => {
    if (isUnrestricted) {
      return Object.keys(MODULE_ROUTE_MAPPING);
    }
    
    if (!currentEmployee?.moduleAccess || currentEmployee.moduleAccess.length === 0) {
      // If no module access defined, allow all (fallback)
      return Object.keys(MODULE_ROUTE_MAPPING);
    }
    
    return currentEmployee.moduleAccess;
  }, [isUnrestricted, currentEmployee?.moduleAccess]);

  // Check if user has access to a module or route
  const hasModuleAccess = useCallback((moduleOrRoute: string): boolean => {
    if (isUnrestricted) return true;
    
    // Check if it's a route
    if (moduleOrRoute.startsWith('/')) {
      const module = ROUTE_TO_MODULE[moduleOrRoute];
      if (!module) {
        // Route not in mapping, allow by default
        return true;
      }
      return allowedModules.includes(module);
    }
    
    // It's a module name
    return allowedModules.includes(moduleOrRoute);
  }, [isUnrestricted, allowedModules]);

  // Filter menu items based on module access
  const filterMenuItems = useCallback(<T extends { href?: string; label?: string }>(items: T[]): T[] => {
    if (isUnrestricted) return items;
    
    return items.filter(item => {
      // Check by href first
      if (item.href) {
        return hasModuleAccess(item.href);
      }
      // Check by label if no href
      if (item.label) {
        return hasModuleAccess(item.label);
      }
      // Allow by default if neither
      return true;
    });
  }, [isUnrestricted, hasModuleAccess]);

  return {
    hasModuleAccess,
    filterMenuItems,
    allowedModules,
    isUnrestricted,
  };
};

export default useModuleAccess;
