/**
 * Unified Permission Engine
 * Single source of truth combining Module Access + RBSA (Role-Based System Actions)
 * 
 * Module Access = Visibility (can user see the module?)
 * RBSA = Actions (what can user do inside the module?)
 * 
 * Rule: Module Access denial overrides all RBSA permissions
 */

import { supabase } from '@/integrations/supabase/client';
import { databaseRbacService } from './databaseRbacService';

export interface PermissionStatus {
  allowed: boolean;
  reason: string;
  tooltip: string;
}

export interface ModulePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UserPermissionMatrix {
  role: string;
  modules: Record<string, ModulePermissions>;
  moduleAccess: string[]; // Modules the user can access (visibility)
  isUnrestricted: boolean;
}

// Module key to display name mapping
export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  tasks: 'Task Management',
  cases: 'Case Management',
  hearings: 'Hearings',
  documents: 'Document Management',
  clients: 'Clients',
  client_groups: 'Client Groups',
  contacts: 'Contacts',
  courts: 'Legal Authorities',
  judges: 'Judge Masters',
  employees: 'Employee Masters',
  reports: 'Reports',
  settings: 'System Settings',
  rbac: 'Access & Roles',
  compliance: 'Compliance Dashboard',
  dashboard: 'Dashboard',
  gst: 'GST Management',
};

// Roles that bypass all restrictions
const UNRESTRICTED_ROLES = ['admin', 'partner'];

class PermissionEngine {
  private userCache = new Map<string, { data: UserPermissionMatrix; expiry: number }>();
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  /**
   * Check if user can access a module (visibility)
   * Uses employee.module_access field
   */
  async canAccessModule(userId: string, moduleKey: string): Promise<boolean> {
    const matrix = await this.getUserPermissionMatrix(userId);
    
    if (matrix.isUnrestricted) return true;
    
    // If module_access is empty, allow all (legacy behavior)
    if (matrix.moduleAccess.length === 0) return true;
    
    // Check if module is in allowed list
    const moduleName = MODULE_DISPLAY_NAMES[moduleKey] || moduleKey;
    return matrix.moduleAccess.includes(moduleName) || matrix.moduleAccess.includes(moduleKey);
  }

  /**
   * Check if user can perform an action (RBSA)
   * Combines module access check + role permission check
   */
  async canPerformAction(
    userId: string, 
    moduleKey: string, 
    action: 'read' | 'create' | 'edit' | 'delete'
  ): Promise<boolean> {
    // First check module access (visibility)
    const canAccess = await this.canAccessModule(userId, moduleKey);
    if (!canAccess) return false;

    // Then check RBSA permission
    const matrix = await this.getUserPermissionMatrix(userId);
    
    if (matrix.isUnrestricted) return true;

    const modulePerms = matrix.modules[moduleKey];
    if (!modulePerms) return false;

    switch (action) {
      case 'read': return modulePerms.canView;
      case 'create': return modulePerms.canCreate;
      case 'edit': return modulePerms.canEdit;
      case 'delete': return modulePerms.canDelete;
      default: return false;
    }
  }

  /**
   * Get permission status with reason (for UI tooltips)
   */
  async getPermissionStatus(
    userId: string,
    moduleKey: string,
    action: 'read' | 'create' | 'edit' | 'delete'
  ): Promise<PermissionStatus> {
    const canAccess = await this.canAccessModule(userId, moduleKey);
    
    if (!canAccess) {
      return {
        allowed: false,
        reason: 'Module access denied',
        tooltip: 'You do not have access to this module. Contact Admin to enable.',
      };
    }

    const allowed = await this.canPerformAction(userId, moduleKey, action);
    const actionLabel = action === 'create' ? 'create' : action === 'edit' ? 'edit' : action === 'delete' ? 'delete' : 'view';
    
    if (allowed) {
      return {
        allowed: true,
        reason: 'Allowed',
        tooltip: `You can ${actionLabel} items in this module.`,
      };
    }

    return {
      allowed: false,
      reason: `No ${action} permission`,
      tooltip: `You don't have permission to ${actionLabel}. Contact Admin to enable.`,
    };
  }

  /**
   * Get the complete permission matrix for a user
   */
  async getUserPermissionMatrix(userId: string): Promise<UserPermissionMatrix> {
    // Check cache
    const cached = this.userCache.get(userId);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    try {
      // Fetch employee data
      const { data: employee, error } = await supabase
        .from('employees')
        .select('id, role, module_access')
        .eq('id', userId)
        .single();

      if (error || !employee) {
        // Return restricted matrix if employee not found
        return this.createEmptyMatrix();
      }

      const role = (employee.role || 'staff').toLowerCase();
      const isUnrestricted = UNRESTRICTED_ROLES.includes(role);
      const moduleAccess = (employee.module_access as string[]) || [];

      // Fetch RBSA permissions from database
      const permissionMatrix = await databaseRbacService.getPermissionMatrix(role);

      // Build module permissions
      const modules: Record<string, ModulePermissions> = {};
      
      for (const [moduleKey, perms] of Object.entries(permissionMatrix)) {
        modules[moduleKey] = {
          canView: perms.read,
          canCreate: perms.create,
          canEdit: perms.update,
          canDelete: perms.delete,
        };
      }

      const matrix: UserPermissionMatrix = {
        role,
        modules,
        moduleAccess,
        isUnrestricted,
      };

      // Cache result
      this.userCache.set(userId, {
        data: matrix,
        expiry: Date.now() + this.CACHE_TTL,
      });

      return matrix;
    } catch (error) {
      console.error('Failed to get user permission matrix:', error);
      return this.createEmptyMatrix();
    }
  }

  /**
   * Create an empty/restricted matrix
   */
  private createEmptyMatrix(): UserPermissionMatrix {
    return {
      role: 'unknown',
      modules: {},
      moduleAccess: [],
      isUnrestricted: false,
    };
  }

  /**
   * Clear cache for a user
   */
  clearUserCache(userId: string): void {
    this.userCache.delete(userId);
  }

  /**
   * Clear all caches (call when permissions change)
   */
  clearAllCaches(): void {
    this.userCache.clear();
    databaseRbacService.clearAllCache();
  }

  /**
   * Log permission denial for audit
   */
  async logPermissionDenial(
    userId: string,
    module: string,
    action: string,
    reason: string
  ): Promise<void> {
    try {
      // Log to console in dev, could be extended to database audit table
      console.warn(`[Permission Denied] User: ${userId}, Module: ${module}, Action: ${action}, Reason: ${reason}`);
      
      // Optional: Log to audit table
      // await supabase.from('permission_audit_log').insert({ ... });
    } catch (error) {
      console.error('Failed to log permission denial:', error);
    }
  }
}

// Singleton export
export const permissionEngine = new PermissionEngine();
