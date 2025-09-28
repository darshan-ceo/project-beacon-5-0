/**
 * Permissions Resolver - DEMO Mode Implementation
 * Resolves effective permissions for users based on their assigned roles
 */

import { unifiedStore, type RoleEntity, type PermissionEntity } from '@/persistence/unifiedStore';
import { advancedRbacService } from './advancedRbacService';

export interface ResolvedPermission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  allowed: boolean;
  source: 'role' | 'explicit_allow' | 'explicit_deny';
  roleId?: string;
  permissionId?: string;
}

export interface EffectivePermissions {
  userId: string;
  permissions: ResolvedPermission[];
  roles: RoleEntity[];
  resolvedAt: string;
}

class PermissionsResolver {
  private cache = new Map<string, { permissions: EffectivePermissions; expiry: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes in DEMO mode

  constructor() {
    this.initializeResolver();
  }

  private async initializeResolver(): Promise<void> {
    await unifiedStore.waitUntilReady();
  }

  /**
   * Resolve effective permissions for a user
   */
  async resolveUserPermissions(userId: string): Promise<EffectivePermissions> {
    // Check cache first
    const cacheKey = `user_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.permissions;
    }

    try {
      // Get user's roles
      const userRoles = await advancedRbacService.getUserRoles(userId);
      
      // Get all permissions referenced by these roles
      const allPermissions = await unifiedStore.permissions.getAll();
      const rolePermissionIds = new Set<string>();
      
      // Collect all permission IDs from user's roles
      userRoles.forEach(role => {
        role.permissions.forEach(permId => rolePermissionIds.add(permId));
      });

      // Group permissions by resource.action for conflict resolution
      const permissionMap = new Map<string, PermissionEntity[]>();
      
      allPermissions
        .filter(perm => rolePermissionIds.has(perm.id))
        .forEach(perm => {
          const key = `${perm.resource}.${perm.action}`;
          if (!permissionMap.has(key)) {
            permissionMap.set(key, []);
          }
          permissionMap.get(key)!.push(perm);
        });

      // Resolve conflicts: deny overrides allow
      const resolvedPermissions: ResolvedPermission[] = [];
      
      for (const [resourceAction, permissions] of permissionMap) {
        const [resource, action] = resourceAction.split('.');
        
        // Check for explicit deny
        const denyPermission = permissions.find(p => p.effect === 'deny');
        if (denyPermission) {
          resolvedPermissions.push({
            resource,
            action: action as any,
            allowed: false,
            source: 'explicit_deny',
            permissionId: denyPermission.id
          });
          continue;
        }

        // Check for allow permissions
        const allowPermissions = permissions.filter(p => p.effect === 'allow');
        if (allowPermissions.length > 0) {
          resolvedPermissions.push({
            resource,
            action: action as any,
            allowed: true,
            source: 'explicit_allow',
            permissionId: allowPermissions[0].id
          });
        }
      }

      // Apply hierarchical permissions (admin > delete > write > read)
      const hierarchicalPermissions = this.applyHierarchy(resolvedPermissions);

      const effectivePermissions: EffectivePermissions = {
        userId,
        permissions: hierarchicalPermissions,
        roles: userRoles,
        resolvedAt: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        permissions: effectivePermissions,
        expiry: Date.now() + this.cacheTTL
      });

      return effectivePermissions;
    } catch (error) {
      console.error('Failed to resolve user permissions:', error);
      
      // Return empty permissions on error
      return {
        userId,
        permissions: [],
        roles: [],
        resolvedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Apply hierarchical permission inheritance
   */
  private applyHierarchy(permissions: ResolvedPermission[]): ResolvedPermission[] {
    const actionHierarchy = ['read', 'write', 'delete', 'admin'];
    const resourcePermissions = new Map<string, ResolvedPermission[]>();

    // Group by resource
    permissions.forEach(perm => {
      if (!resourcePermissions.has(perm.resource)) {
        resourcePermissions.set(perm.resource, []);
      }
      resourcePermissions.get(perm.resource)!.push(perm);
    });

    const result: ResolvedPermission[] = [];

    // Apply hierarchy for each resource
    for (const [resource, perms] of resourcePermissions) {
      const allowedActions = new Set<string>();
      const deniedActions = new Set<string>();

      // Collect allowed and denied actions
      perms.forEach(perm => {
        if (perm.allowed) {
          allowedActions.add(perm.action);
        } else {
          deniedActions.add(perm.action);
        }
      });

      // Apply hierarchy for allowed actions
      for (const action of actionHierarchy) {
        // If explicitly denied, deny it
        if (deniedActions.has(action)) {
          result.push({
            resource,
            action: action as any,
            allowed: false,
            source: 'explicit_deny'
          });
          continue;
        }

        // Check if user has this action or higher level action
        let hasPermission = false;
        const actionIndex = actionHierarchy.indexOf(action);
        
        for (let i = actionIndex; i < actionHierarchy.length; i++) {
          if (allowedActions.has(actionHierarchy[i])) {
            hasPermission = true;
            break;
          }
        }

        if (hasPermission) {
          result.push({
            resource,
            action: action as any,
            allowed: true,
            source: 'role'
          });
        }
      }
    }

    return result;
  }

  /**
   * Check if user has specific permission
   */
  async can(userId: string, resource: string, action: 'read' | 'write' | 'delete' | 'admin'): Promise<boolean> {
    const permissions = await this.resolveUserPermissions(userId);
    const permission = permissions.permissions.find(p => 
      p.resource === resource && p.action === action
    );
    
    return permission?.allowed ?? false;
  }

  /**
   * Check multiple permissions at once
   */
  async canMultiple(userId: string, checks: Array<{ resource: string; action: 'read' | 'write' | 'delete' | 'admin' }>): Promise<Record<string, boolean>> {
    const permissions = await this.resolveUserPermissions(userId);
    const result: Record<string, boolean> = {};

    checks.forEach(check => {
      const key = `${check.resource}.${check.action}`;
      const permission = permissions.permissions.find(p => 
        p.resource === check.resource && p.action === check.action
      );
      result[key] = permission?.allowed ?? false;
    });

    return result;
  }

  /**
   * Get all allowed resources for user
   */
  async getAllowedResources(userId: string): Promise<string[]> {
    const permissions = await this.resolveUserPermissions(userId);
    const resources = new Set<string>();
    
    permissions.permissions.forEach(perm => {
      if (perm.allowed) {
        resources.add(perm.resource);
      }
    });

    return Array.from(resources);
  }

  /**
   * Clear cache for user (call when roles change)
   */
  clearUserCache(userId: string): void {
    this.cache.delete(`user_${userId}`);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats (for debugging)
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Singleton export
export const permissionsResolver = new PermissionsResolver();

/**
 * API Stub for future backend integration
 */
export const apiPermissionsResolver = {
  async resolveUserPermissions(userId: string): Promise<EffectivePermissions> {
    // TODO: Replace with actual API call when backend is ready
    console.log('🚧 API call would be made here to resolve permissions for user:', userId);
    return permissionsResolver.resolveUserPermissions(userId);
  },

  async can(userId: string, resource: string, action: 'read' | 'write' | 'delete' | 'admin'): Promise<boolean> {
    // TODO: Replace with actual API call when backend is ready
    console.log('🚧 API call would be made here to check permission:', { userId, resource, action });
    return permissionsResolver.can(userId, resource, action);
  }
};