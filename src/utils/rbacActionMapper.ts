/**
 * RBAC Action Mapper Utility
 * 
 * Maps UI actions (create, edit, update, delete, view) to RBAC permission actions.
 * This ensures consistent permission checking across all modules.
 */

import { Permission } from '@/hooks/useRBAC';

// Maps UI actions to RBAC permission actions
export const ACTION_MAP: Record<string, Permission['action']> = {
  create: 'write',
  add: 'write',
  new: 'write',
  edit: 'write',
  update: 'write',
  modify: 'write',
  delete: 'delete',
  remove: 'delete',
  view: 'read',
  read: 'read',
  list: 'read',
  export: 'read',
  import: 'write',
  admin: 'admin',
  manage: 'admin',
} as const;

/**
 * Get the RBAC permission action for a given UI action
 */
export const getRBACAction = (uiAction: string): Permission['action'] => {
  const normalizedAction = uiAction.toLowerCase().trim();
  return ACTION_MAP[normalizedAction] || 'read';
};

/**
 * Permission check result with reason
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
}

/**
 * Check if user can perform an action on a module
 * Returns result with explanation
 */
export const checkPermissionWithReason = (
  hasPermission: (module: string, action: Permission['action']) => boolean,
  module: string,
  uiAction: string
): PermissionCheckResult => {
  const rbacAction = getRBACAction(uiAction);
  const allowed = hasPermission(module, rbacAction);
  
  return {
    allowed,
    reason: allowed 
      ? `You have ${rbacAction} permission for ${module}`
      : `You don't have ${rbacAction} permission for ${module}`
  };
};

/**
 * Get permission denial message for toast
 */
export const getPermissionDenialMessage = (module: string, action: string): string => {
  const rbacAction = getRBACAction(action);
  const actionLabel = {
    read: 'view',
    write: action === 'create' || action === 'add' ? 'create' : 'edit',
    delete: 'delete',
    admin: 'administer'
  }[rbacAction] || action;
  
  return `You don't have permission to ${actionLabel} ${module}.`;
};

/**
 * Module display names for user-friendly messages
 */
export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  tasks: 'tasks',
  cases: 'cases',
  hearings: 'hearings',
  documents: 'documents',
  clients: 'clients',
  courts: 'legal authorities',
  judges: 'judges',
  employees: 'employees',
  reports: 'reports',
  settings: 'settings',
  admin: 'admin features',
  ai: 'AI features',
  rbac: 'role management',
} as const;

/**
 * Get user-friendly module name
 */
export const getModuleDisplayName = (module: string): string => {
  return MODULE_DISPLAY_NAMES[module] || module;
};
