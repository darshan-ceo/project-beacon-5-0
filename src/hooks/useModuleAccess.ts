/**
 * useModuleAccess Hook
 * Enforces module access based on employee's module_access field
 * Admins and Partners bypass module access restrictions
 */

import { useCallback, useMemo } from 'react';
import { useRBAC } from './useRBAC';
import { useAppState } from '@/contexts/AppStateContext';

// Module name to sidebar route mapping
const MODULE_ROUTE_MAPPING: Record<string, string[]> = {
  'Dashboard': ['/', '/compliance'],
  'Case Management': ['/cases'],
  'Hearings': ['/hearings', '/hearings/calendar'],
  'Task Management': ['/tasks'],
  'Document Management': ['/documents'],
  'Reports': ['/reports'],
  'Help & Knowledge Base': ['/help'],
  'User Profile': ['/profile'],
  'Client Masters': ['/clients'],
  'Contacts': ['/contacts'],
  'Client Groups': ['/client-groups'],
  'Legal Authorities': ['/courts'],
  'Judge Masters': ['/judges'],
  'Employee Masters': ['/employees'],
  'Statutory Deadlines': ['/statutory-acts'],
  'System Settings': ['/settings'],
  'Access & Roles': ['/access-roles'],
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
  const { currentUser } = useRBAC();
  const { state } = useAppState();

  // Check if user role bypasses module access
  const isUnrestricted = useMemo(() => {
    if (!currentUser) return false;
    const bypassRoles = ['admin', 'partner'];
    return bypassRoles.includes(currentUser.role.toLowerCase());
  }, [currentUser]);

  // Get current employee's module access from state
  const currentEmployee = useMemo(() => {
    if (!currentUser?.id) return null;
    return state.employees.find(e => e.id === currentUser.id);
  }, [currentUser?.id, state.employees]);

  // Get allowed modules
  const allowedModules = useMemo((): string[] => {
    if (isUnrestricted) {
      return Object.keys(MODULE_ROUTE_MAPPING);
    }
    
    if (!currentEmployee?.moduleAccess) {
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
