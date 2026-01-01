/**
 * Permission Resolver Utility
 * 
 * Resolves effective permissions by combining:
 * - Module Access (visibility control from employee.module_access)
 * - RBAC Policy (action control from role_permissions)
 * 
 * DESIGN PRINCIPLE:
 * - Module Access controls sidebar VISIBILITY (can user SEE the module)
 * - RBAC Policy controls ACTIONS (can user CREATE/READ/UPDATE/DELETE)
 * 
 * Rule: For visibility, user needs Module Access.
 *       For actions, user needs RBAC permission.
 *       For security, both should be checked where applicable.
 */

import { Permission } from '@/hooks/useRBAC';

export interface EffectivePermission {
  canView: boolean;      // Can user see the module in sidebar
  canRead: boolean;      // Can user read data from module
  canWrite: boolean;     // Can user create/update data
  canDelete: boolean;    // Can user delete data
  canAdmin: boolean;     // Has admin-level access
  reason: string;        // Why permission was granted/denied
}

// Module name mappings for consistency
export const MODULE_NAMES = {
  DASHBOARD: 'Dashboard',
  CASE_MANAGEMENT: 'Case Management',
  HEARING: 'Hearing',
  TASK_MANAGEMENT: 'Task Management',
  DMS: 'DMS',
  REPORTS: 'Reports',
  BILLING: 'Billing',
  COURTS: 'courts',
  JUDGES: 'judges',
  CLIENTS: 'clients',
  EMPLOYEES: 'employees',
  DOCUMENTS: 'documents',
  TASKS: 'tasks',
  CASES: 'cases',
  HEARINGS: 'hearings',
} as const;

// Map sidebar module names to RBAC module keys
export const MODULE_TO_RBAC_MAP: Record<string, string> = {
  'Dashboard': 'reports',
  'Case Management': 'cases',
  'Hearing': 'hearings',
  'Task Management': 'tasks',
  'DMS': 'documents',
  'Reports': 'reports',
  'Billing': 'billing',
};

/**
 * Resolves effective permission by combining Module Access and RBAC
 * 
 * @param moduleAccess - Array of module names the user has access to (from employee.module_access)
 * @param hasRbacPermission - Function to check RBAC permission
 * @param moduleName - The module to check
 * @param isUnrestricted - Whether user bypasses module access restrictions (admin/partner)
 * @returns EffectivePermission object
 */
export function resolveEffectivePermission(
  moduleAccess: string[],
  hasRbacPermission: (module: string, action: Permission['action']) => boolean,
  moduleName: string,
  isUnrestricted: boolean = false
): EffectivePermission {
  // Map display module name to RBAC module key
  const rbacModule = MODULE_TO_RBAC_MAP[moduleName] || moduleName.toLowerCase();
  
  // Check Module Access (visibility)
  const hasModuleAccess = isUnrestricted || 
    moduleAccess.length === 0 || 
    moduleAccess.includes(moduleName);
  
  // Check RBAC permissions (actions)
  const canRead = hasRbacPermission(rbacModule, 'read');
  const canWrite = hasRbacPermission(rbacModule, 'write');
  const canDelete = hasRbacPermission(rbacModule, 'delete');
  const canAdmin = hasRbacPermission(rbacModule, 'admin');
  
  // Determine effective view permission (module access takes priority for visibility)
  const canView = hasModuleAccess;
  
  // Build reason
  let reason = '';
  if (!hasModuleAccess) {
    reason = `Module access not granted for ${moduleName}`;
  } else if (!canRead) {
    reason = `RBAC read permission not granted for ${rbacModule}`;
  } else {
    reason = 'Full access granted';
  }
  
  return {
    canView,
    canRead: hasModuleAccess && canRead,
    canWrite: hasModuleAccess && canWrite,
    canDelete: hasModuleAccess && canDelete,
    canAdmin: hasModuleAccess && canAdmin,
    reason,
  };
}

/**
 * Quick check if user can perform an action on a module
 * Combines Module Access + RBAC in a single check
 */
export function canPerformAction(
  moduleAccess: string[],
  hasRbacPermission: (module: string, action: Permission['action']) => boolean,
  moduleName: string,
  action: Permission['action'],
  isUnrestricted: boolean = false
): boolean {
  const effective = resolveEffectivePermission(
    moduleAccess,
    hasRbacPermission,
    moduleName,
    isUnrestricted
  );
  
  switch (action) {
    case 'read':
      return effective.canRead;
    case 'write':
      return effective.canWrite;
    case 'delete':
      return effective.canDelete;
    case 'admin':
      return effective.canAdmin;
    default:
      return false;
  }
}

/**
 * Get a human-readable explanation of why an action is allowed/denied
 */
export function getPermissionExplanation(
  moduleAccess: string[],
  hasRbacPermission: (module: string, action: Permission['action']) => boolean,
  moduleName: string,
  action: Permission['action'],
  isUnrestricted: boolean = false
): string {
  const rbacModule = MODULE_TO_RBAC_MAP[moduleName] || moduleName.toLowerCase();
  const hasModuleAccess = isUnrestricted || 
    moduleAccess.length === 0 || 
    moduleAccess.includes(moduleName);
  const hasRbac = hasRbacPermission(rbacModule, action);
  
  if (!hasModuleAccess && !hasRbac) {
    return `You don't have module access or ${action} permission for ${moduleName}`;
  }
  if (!hasModuleAccess) {
    return `Module access for ${moduleName} is not enabled in your profile`;
  }
  if (!hasRbac) {
    return `Your role doesn't have ${action} permission for ${moduleName}`;
  }
  return `You have full ${action} access to ${moduleName}`;
}
