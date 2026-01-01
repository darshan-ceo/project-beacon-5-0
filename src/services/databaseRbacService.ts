/**
 * Database RBAC Service
 * Fetches permissions directly from the role_permissions table in Supabase
 * This is the single source of truth for all RBAC permissions
 */

import { supabase } from '@/integrations/supabase/client';

export interface DatabasePermission {
  role: string;
  permission_key: string; // Format: "module.action" e.g., "tasks.read", "tasks.create"
  created_at: string;
}

export interface ParsedPermission {
  module: string;
  action: 'read' | 'create' | 'update' | 'delete' | 'manage';
  rbacAction: 'read' | 'write' | 'delete' | 'admin'; // Mapped to RBAC action
}

// Map database actions to RBAC actions
const ACTION_TO_RBAC: Record<string, 'read' | 'write' | 'delete' | 'admin'> = {
  read: 'read',
  create: 'write',
  update: 'write',
  delete: 'delete',
  manage: 'admin',
  customize: 'write',
};

class DatabaseRbacService {
  private permissionsCache = new Map<string, ParsedPermission[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch all permissions for a specific role from the database
   */
  async getPermissionsForRole(role: string): Promise<ParsedPermission[]> {
    const normalizedRole = role.toLowerCase().trim();
    
    // Check cache
    const cached = this.permissionsCache.get(normalizedRole);
    const expiry = this.cacheExpiry.get(normalizedRole);
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    try {
      // Use type assertion for the role enum - the database accepts string values
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permission_key')
        .eq('role', normalizedRole as any);

      if (error) {
        console.error('Failed to fetch role permissions:', error);
        return [];
      }

      const permissions = (data || []).map(row => this.parsePermissionKey(row.permission_key));
      
      // Cache results
      this.permissionsCache.set(normalizedRole, permissions);
      this.cacheExpiry.set(normalizedRole, Date.now() + this.CACHE_TTL);

      return permissions;
    } catch (error) {
      console.error('Database RBAC fetch error:', error);
      return [];
    }
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(
    role: string, 
    module: string, 
    action: 'read' | 'write' | 'delete' | 'admin'
  ): Promise<boolean> {
    const permissions = await this.getPermissionsForRole(role);
    
    // Map RBAC action back to possible database actions
    const dbActions = this.getRbacToDbActions(action);
    
    return permissions.some(p => 
      p.module === module && dbActions.includes(p.action)
    );
  }

  /**
   * Check multiple permissions at once for efficiency
   */
  async hasMultiplePermissions(
    role: string,
    checks: Array<{ module: string; action: 'read' | 'write' | 'delete' | 'admin' }>
  ): Promise<Record<string, boolean>> {
    const permissions = await this.getPermissionsForRole(role);
    const result: Record<string, boolean> = {};

    for (const check of checks) {
      const dbActions = this.getRbacToDbActions(check.action);
      const key = `${check.module}.${check.action}`;
      result[key] = permissions.some(p => 
        p.module === check.module && dbActions.includes(p.action)
      );
    }

    return result;
  }

  /**
   * Get all permissions for a role, grouped by module
   */
  async getPermissionMatrix(role: string): Promise<Record<string, { 
    read: boolean; 
    create: boolean; 
    update: boolean; 
    delete: boolean 
  }>> {
    const permissions = await this.getPermissionsForRole(role);
    const matrix: Record<string, { read: boolean; create: boolean; update: boolean; delete: boolean }> = {};

    for (const perm of permissions) {
      if (!matrix[perm.module]) {
        matrix[perm.module] = { read: false, create: false, update: false, delete: false };
      }
      
      if (perm.action === 'read') matrix[perm.module].read = true;
      else if (perm.action === 'create') matrix[perm.module].create = true;
      else if (perm.action === 'update') matrix[perm.module].update = true;
      else if (perm.action === 'delete') matrix[perm.module].delete = true;
      else if (perm.action === 'manage') {
        // manage = full access
        matrix[perm.module] = { read: true, create: true, update: true, delete: true };
      }
    }

    return matrix;
  }

  /**
   * Parse permission_key format "module.action" into structured object
   */
  private parsePermissionKey(permissionKey: string): ParsedPermission {
    const [module, action] = permissionKey.split('.');
    return {
      module: module || '',
      action: (action as ParsedPermission['action']) || 'read',
      rbacAction: ACTION_TO_RBAC[action] || 'read',
    };
  }

  /**
   * Map RBAC action to possible database actions
   */
  private getRbacToDbActions(rbacAction: 'read' | 'write' | 'delete' | 'admin'): string[] {
    switch (rbacAction) {
      case 'read':
        return ['read'];
      case 'write':
        return ['create', 'update', 'customize'];
      case 'delete':
        return ['delete'];
      case 'admin':
        return ['manage', 'create', 'update', 'delete', 'read'];
      default:
        return [];
    }
  }

  /**
   * Clear cache for a specific role
   */
  clearRoleCache(role: string): void {
    const normalizedRole = role.toLowerCase().trim();
    this.permissionsCache.delete(normalizedRole);
    this.cacheExpiry.delete(normalizedRole);
  }

  /**
   * Clear all caches
   */
  clearAllCache(): void {
    this.permissionsCache.clear();
    this.cacheExpiry.clear();
  }
}

// Singleton export
export const databaseRbacService = new DatabaseRbacService();
