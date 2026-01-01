/**
 * Supabase Permissions Resolver
 * Maps user roles to actual Supabase RLS permissions
 * This ensures frontend RBAC matches database-level security
 */

import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'partner' | 'manager' | 'advocate' | 'ca' | 'staff' | 'clerk' | 'client' | 'user';
export type PermissionAction = 'read' | 'write' | 'delete' | 'admin';

interface RolePermissionMatrix {
  [module: string]: PermissionAction[];
}

/**
 * Permission matrix that mirrors actual Supabase RLS policies
 * IMPORTANT: Keep this in sync with database RLS policies
 */
const SUPABASE_ROLE_PERMISSIONS: Record<AppRole, RolePermissionMatrix> = {
  admin: {
    tasks: ['read', 'write', 'delete', 'admin'],
    cases: ['read', 'write', 'delete', 'admin'],
    clients: ['read', 'write', 'delete', 'admin'],
    documents: ['read', 'write', 'delete', 'admin'],
    courts: ['read', 'write', 'delete', 'admin'],
    judges: ['read', 'write', 'delete', 'admin'],
    employees: ['read', 'write', 'delete', 'admin'],
    hearings: ['read', 'write', 'delete', 'admin'],
    reports: ['read', 'write', 'admin'],
    settings: ['read', 'write', 'admin'],
    rbac: ['read', 'write', 'delete', 'admin'],
  },
  partner: {
    tasks: ['read', 'write', 'delete'],
    cases: ['read', 'write', 'delete'], // After RLS fix
    clients: ['read', 'write'],
    documents: ['read', 'write', 'delete'],
    courts: ['read', 'write'],
    judges: ['read', 'write'],
    employees: ['read'],
    hearings: ['read', 'write', 'delete'], // After RLS fix
    reports: ['read', 'write'],
    settings: ['read'],
    rbac: ['read'],
  },
  manager: {
    tasks: ['read', 'write', 'delete'],
    cases: ['read', 'write', 'delete'], // Scoped to subordinates
    clients: ['read', 'write'],
    documents: ['read', 'write'],
    courts: ['read', 'write'],
    judges: ['read', 'write'],
    employees: ['read', 'write'],
    hearings: ['read', 'write', 'delete'],
    reports: ['read', 'write'],
    settings: ['read'],
    rbac: ['read'],
  },
  advocate: {
    tasks: ['read', 'write'],
    cases: ['read'],
    clients: ['read', 'write'],
    documents: ['read', 'write', 'delete'],
    courts: ['read', 'write', 'delete'],
    judges: ['read', 'write', 'delete'],
    employees: ['read'],
    hearings: ['read', 'write', 'delete'],
    reports: ['read'],
    settings: ['read'],
    rbac: [],
  },
  ca: {
    tasks: ['read', 'write'],
    cases: ['read'],
    clients: ['read', 'write'],
    documents: ['read', 'write'],
    courts: ['read', 'write'],
    judges: ['read', 'write'],
    employees: ['read'],
    hearings: ['read', 'write'],
    reports: ['read'],
    settings: ['read'],
    rbac: [],
  },
  staff: {
    tasks: ['read', 'write'], // Can only delete own tasks via RLS
    cases: ['read'],
    clients: ['read'],
    documents: ['read', 'write'],
    courts: ['read'],
    judges: ['read'],
    employees: ['read'],
    hearings: ['read'],
    reports: ['read'],
    settings: ['read'],
    rbac: [],
  },
  clerk: {
    tasks: ['read'],
    cases: ['read'],
    clients: ['read'],
    documents: ['read'],
    courts: ['read'],
    judges: ['read'],
    employees: [],
    hearings: ['read'],
    reports: [],
    settings: [],
    rbac: [],
  },
  client: {
    tasks: [],
    cases: ['read'], // Own cases only
    clients: [],
    documents: ['read'], // Own documents only
    courts: [],
    judges: [],
    employees: [],
    hearings: ['read'], // Own hearings only
    reports: [],
    settings: [],
    rbac: [],
  },
  user: {
    tasks: ['read'],
    cases: ['read'],
    clients: ['read'],
    documents: ['read'],
    courts: ['read'],
    judges: ['read'],
    employees: ['read'],
    hearings: ['read'],
    reports: [],
    settings: [],
    rbac: [],
  },
};

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
};

class SupabasePermissionsResolver {
  private userRoleCache = new Map<string, { role: AppRole; expiry: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the user's role from their employee record or user_roles table
   */
  async getUserRole(userId: string): Promise<AppRole> {
    // Check cache
    const cached = this.userRoleCache.get(userId);
    if (cached && Date.now() < cached.expiry) {
      return cached.role;
    }

    try {
      // First check employees table (primary source for firm staff)
      const { data: employee } = await supabase
        .from('employees')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (employee?.role) {
        const role = this.mapEmployeeRole(employee.role);
        this.userRoleCache.set(userId, { role, expiry: Date.now() + this.cacheTTL });
        return role;
      }

      // Fallback: Check user_roles table
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (userRoles && userRoles.length > 0) {
        const role = userRoles[0].role as AppRole;
        this.userRoleCache.set(userId, { role, expiry: Date.now() + this.cacheTTL });
        return role;
      }

      // Default to 'user' if no role found
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
   * Check if a role has permission for a module and action
   */
  hasPermission(role: AppRole, module: string, action: PermissionAction): boolean {
    // Normalize module name
    const normalizedModule = MODULE_ALIASES[module.toLowerCase()] || module.toLowerCase();
    
    const rolePermissions = SUPABASE_ROLE_PERMISSIONS[role];
    if (!rolePermissions) {
      console.warn(`Unknown role: ${role}`);
      return false;
    }

    const modulePermissions = rolePermissions[normalizedModule];
    if (!modulePermissions) {
      // Module not in permissions list - deny by default
      return false;
    }

    // Admin action includes all other actions
    if (modulePermissions.includes('admin')) {
      return true;
    }

    // Direct match
    if (modulePermissions.includes(action)) {
      return true;
    }

    // Hierarchy: admin > delete > write > read
    // If user has higher permission, they implicitly have lower
    const hierarchy: PermissionAction[] = ['read', 'write', 'delete', 'admin'];
    const actionIndex = hierarchy.indexOf(action);
    
    for (let i = actionIndex + 1; i < hierarchy.length; i++) {
      if (modulePermissions.includes(hierarchy[i])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check permission for current authenticated user
   */
  async checkPermission(userId: string, module: string, action: PermissionAction): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return this.hasPermission(role, module, action);
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: AppRole): RolePermissionMatrix {
    return SUPABASE_ROLE_PERMISSIONS[role] || {};
  }

  /**
   * Clear cache for a user
   */
  clearUserCache(userId: string): void {
    this.userRoleCache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.userRoleCache.clear();
  }

  /**
   * Get the permission matrix (for debugging/admin purposes)
   */
  getPermissionMatrix(): typeof SUPABASE_ROLE_PERMISSIONS {
    return SUPABASE_ROLE_PERMISSIONS;
  }
}

export const supabasePermissionsResolver = new SupabasePermissionsResolver();
