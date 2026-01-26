/**
 * Supabase Permissions Resolver
 * Maps user roles to actual database permissions from role_permissions table
 * This ensures frontend RBAC matches database-level security (RLS)
 * 
 * IMPORTANT: This resolver now reads permissions from the database (role_permissions table)
 * instead of using a hardcoded matrix, ensuring the UI respects whatever is configured
 * in the Access & Roles admin panel.
 */

import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'partner' | 'manager' | 'advocate' | 'ca' | 'staff' | 'clerk' | 'client' | 'user';
export type PermissionAction = 'read' | 'write' | 'delete' | 'admin' | 'manage';

interface CachedPermissions {
  permissions: Set<string>;
  expiry: number;
}

// Module aliases for compatibility
const MODULE_ALIASES: Record<string, string> = {
  task: 'tasks',
  case: 'cases',
  client: 'clients',
  document: 'documents',
  court: 'courts',
  judge: 'judges',
  employee: 'employees',
  hearing: 'hearings',
  report: 'reports',
  setting: 'settings',
  // Task sub-module aliases (no transformation needed, but included for completeness)
  'tasks.templates': 'tasks.templates',
  'tasks.automation': 'tasks.automation',
  'tasks.escalation': 'tasks.escalation',
  'tasks.ai': 'tasks.ai',
};

// Priority order: admin > partner > manager > advocate > ca > staff > clerk > client > user
const ROLE_PRIORITY: AppRole[] = ['admin', 'partner', 'manager', 'advocate', 'ca', 'staff', 'clerk', 'client', 'user'];

// Map database action names to our PermissionAction type
const ACTION_MAP: Record<string, PermissionAction> = {
  'read': 'read',
  'create': 'write',
  'update': 'write',
  'delete': 'delete',
  'manage': 'admin',
  'admin': 'admin',
};

// Priority order for sub-module action mapping
const MANAGE_ACTION_KEY = 'manage';

class SupabasePermissionsResolver {
  private userRoleCache = new Map<string, { role: AppRole; expiry: number }>();
  private rolePermissionsCache = new Map<string, CachedPermissions>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private permissionsLoading = new Map<string, Promise<Set<string>>>();

  /**
   * Get highest priority role from a list of roles
   */
  private getHighestPriorityRole(roles: string[]): AppRole {
    const normalizedRoles = roles.map(r => r.toLowerCase() as AppRole);
    for (const priorityRole of ROLE_PRIORITY) {
      if (normalizedRoles.includes(priorityRole)) {
        return priorityRole;
      }
    }
    return 'user';
  }

  /**
   * Get the user's role from their employee record or user_roles table
   */
  /**
   * Get the user's effective role by checking BOTH employees table AND user_roles table,
   * then selecting the highest priority role. This ensures RBAC roles (like 'admin') 
   * override operational employee roles (like 'RM').
   */
  async getUserRole(userId: string): Promise<AppRole> {
    // Check cache
    const cached = this.userRoleCache.get(userId);
    if (cached && Date.now() < cached.expiry) {
      return cached.role;
    }

    try {
      const allRoles: string[] = [];
      
      // 1. Check employees table for operational role
      const { data: employee } = await supabase
        .from('employees')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (employee?.role) {
        allRoles.push(employee.role);
        console.log(`[RBAC] User ${userId} employee role: ${employee.role}`);
      }

      // 2. Check user_roles table for RBAC roles (always check, not just fallback)
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (userRoles && userRoles.length > 0) {
        const rbacRoles = userRoles.map(r => r.role as string);
        allRoles.push(...rbacRoles);
        console.log(`[RBAC] User ${userId} RBAC roles: ${rbacRoles.join(', ')}`);
      }

      // 3. Get highest priority role from ALL sources
      if (allRoles.length > 0) {
        const role = this.getHighestPriorityRole(allRoles);
        this.userRoleCache.set(userId, { role, expiry: Date.now() + this.cacheTTL });
        console.log(`[RBAC] User ${userId} effective role: ${role} (from: ${allRoles.join(', ')})`);
        return role;
      }

      // Default to 'user' if no role found
      console.log(`[RBAC] User ${userId} has no roles, defaulting to 'user'`);
      return 'user';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'user';
    }
  }

  /**
   * Map employee role strings to AppRole
   */
  private mapEmployeeRole(employeeRole: string): AppRole {
    const roleMap: Record<string, AppRole> = {
      'Admin': 'admin',
      'Partner': 'partner',
      'Manager': 'manager',
      'RM': 'manager',
      'Advocate': 'advocate',
      'CA': 'ca',
      'Staff': 'staff',
      'Clerk': 'clerk',
      'Client': 'client',
      'User': 'user',
      // Lowercase variants
      'admin': 'admin',
      'partner': 'partner',
      'manager': 'manager',
      'rm': 'manager',
      'advocate': 'advocate',
      'ca': 'ca',
      'staff': 'staff',
      'clerk': 'clerk',
      'client': 'client',
      'user': 'user',
    };

    return roleMap[employeeRole] || 'user';
  }

  /**
   * Load permissions for a role from the database (role_permissions table)
   */
  private async loadRolePermissions(role: AppRole): Promise<Set<string>> {
    // Check cache
    const cached = this.rolePermissionsCache.get(role);
    if (cached && Date.now() < cached.expiry) {
      return cached.permissions;
    }

    // Check if already loading (prevent duplicate requests)
    const existingLoad = this.permissionsLoading.get(role);
    if (existingLoad) {
      return existingLoad;
    }

    // Start loading
    const loadPromise = (async () => {
      try {
        const { data: rolePermissions, error } = await supabase
          .from('role_permissions')
          .select('permission_key')
          .eq('role', role);

        if (error) {
          console.error(`[RBAC] Error loading permissions for role ${role}:`, error);
          return new Set<string>();
        }

        const permissions = new Set<string>();
        if (rolePermissions) {
          for (const rp of rolePermissions) {
            permissions.add(rp.permission_key);
          }
        }

        // Cache the result
        this.rolePermissionsCache.set(role, {
          permissions,
          expiry: Date.now() + this.cacheTTL
        });

        console.log(`[RBAC] Loaded ${permissions.size} permissions for role ${role}:`, Array.from(permissions));
        return permissions;
      } catch (error) {
        console.error(`[RBAC] Failed to load permissions for role ${role}:`, error);
        return new Set<string>();
      } finally {
        this.permissionsLoading.delete(role);
      }
    })();

    this.permissionsLoading.set(role, loadPromise);
    return loadPromise;
  }

  /**
   * Check if a role has permission for a module and action
   * Uses database-driven permissions from role_permissions table
   */
  hasPermission(role: AppRole, module: string, action: PermissionAction): boolean {
    // Normalize module name
    const normalizedModule = MODULE_ALIASES[module.toLowerCase()] || module.toLowerCase();
    
    // Check cache for role permissions
    const cached = this.rolePermissionsCache.get(role);
    if (!cached || Date.now() >= cached.expiry) {
      // Permissions not loaded yet - trigger async load and return false (fail-closed)
      // The UI should re-check after loading completes
      this.loadRolePermissions(role).catch(console.error);
      console.log(`[RBAC] Permissions not loaded for role ${role}, denying ${normalizedModule}:${action}`);
      return false;
    }

    const permissions = cached.permissions;

    // Build the permission keys to check
    // The database uses format: module.action (e.g., clients.read, clients.create)
    const dbActions = this.mapActionToDatabaseActions(action);
    
    // Check if any of the database action permissions exist
    for (const dbAction of dbActions) {
      const permissionKey = `${normalizedModule}.${dbAction}`;
      if (permissions.has(permissionKey)) {
        return true;
      }
    }

    // Check for manage/admin permission which grants all actions
    if (permissions.has(`${normalizedModule}.manage`)) {
      return true;
    }

    console.log(`[RBAC] Permission denied: ${normalizedModule}:${action} for role ${role}`);
    return false;
  }

  /**
   * Map our PermissionAction to database action names
   * The database uses: read, create, update, delete, manage
   * Our actions are: read, write, delete, admin
   */
  private mapActionToDatabaseActions(action: PermissionAction): string[] {
    switch (action) {
      case 'read':
        return ['read'];
      case 'write':
        // write = create OR update
        return ['create', 'update'];
      case 'delete':
        return ['delete'];
      case 'admin':
        return ['manage', 'admin'];
      case 'manage':
        // manage action maps to 'manage' in database
        return ['manage'];
      default:
        return [action];
    }
  }

  /**
   * Async permission check that ensures permissions are loaded
   * Use this for initial checks where you need to wait for permissions to load
   */
  async hasPermissionAsync(role: AppRole, module: string, action: PermissionAction): Promise<boolean> {
    // Ensure permissions are loaded
    await this.loadRolePermissions(role);
    return this.hasPermission(role, module, action);
  }

  /**
   * Check permission for current authenticated user
   */
  async checkPermission(userId: string, module: string, action: PermissionAction): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return this.hasPermissionAsync(role, module, action);
  }

  /**
   * Get all permissions for a role (from database)
   */
  async getRolePermissions(role: AppRole): Promise<Set<string>> {
    return this.loadRolePermissions(role);
  }

  /**
   * Preload permissions for a role (call this early to avoid delays)
   */
  async preloadPermissions(role: AppRole): Promise<void> {
    await this.loadRolePermissions(role);
  }

  /**
   * Check if permissions are loaded for a role
   */
  isPermissionsLoaded(role: AppRole): boolean {
    const cached = this.rolePermissionsCache.get(role);
    return cached !== undefined && Date.now() < cached.expiry;
  }

  /**
   * Clear cache for a user
   */
  clearUserCache(userId: string): void {
    this.userRoleCache.delete(userId);
  }

  /**
   * Clear role permissions cache (call after role permissions are edited)
   */
  clearRolePermissionsCache(role?: AppRole): void {
    if (role) {
      this.rolePermissionsCache.delete(role);
    } else {
      this.rolePermissionsCache.clear();
    }
    console.log(`[RBAC] Cleared permissions cache${role ? ` for role: ${role}` : ' for all roles'}`);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.userRoleCache.clear();
    this.rolePermissionsCache.clear();
    console.log('[RBAC] Cleared all caches');
  }
}

export const supabasePermissionsResolver = new SupabasePermissionsResolver();
