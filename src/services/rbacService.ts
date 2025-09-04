import { UserRole, Permission } from '@/hooks/useRBAC';

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface CreateRoleData {
  name: string;
  permissions: Permission[];
  description?: string;
}

class RBACService {
  private roles: RolePermissions[] = [];

  // Enhanced permissions including granular reports permissions
  private availablePermissions: Permission[] = [
    // Cases
    { module: 'cases', action: 'read' },
    { module: 'cases', action: 'write' },
    { module: 'cases', action: 'delete' },
    { module: 'cases', action: 'admin' },
    
    // Clients
    { module: 'clients', action: 'read' },
    { module: 'clients', action: 'write' },
    { module: 'clients', action: 'delete' },
    { module: 'clients', action: 'admin' },
    
    // Tasks
    { module: 'tasks', action: 'read' },
    { module: 'tasks', action: 'write' },
    { module: 'tasks', action: 'delete' },
    { module: 'tasks', action: 'admin' },
    
    // Documents
    { module: 'documents', action: 'read' },
    { module: 'documents', action: 'write' },
    { module: 'documents', action: 'delete' },
    { module: 'documents', action: 'admin' },
    
    // Reports - Granular permissions
    { module: 'reports', action: 'read' },
    { module: 'reports.view', action: 'read' },
    { module: 'reports.export', action: 'write' },
    { module: 'reports.schedule', action: 'admin' },
    
    // RBAC
    { module: 'rbac', action: 'read' },
    { module: 'rbac', action: 'admin' },
    
    // Global Parameters
    { module: 'global-parameters', action: 'read' },
    { module: 'global-parameters', action: 'admin' },
    
    // Templates
    { module: 'templates', action: 'read' },
    { module: 'templates.generate', action: 'write' },
    { module: 'templates', action: 'admin' },
    
    // AI
    { module: 'ai', action: 'read' },
    { module: 'ai', action: 'write' },
    { module: 'ai', action: 'admin' },
    
    // Hearings
    { module: 'hearings', action: 'read' },
    { module: 'hearings', action: 'write' },
    { module: 'hearings', action: 'delete' },
    { module: 'hearings', action: 'admin' }
  ];

  async getAvailablePermissions(): Promise<Permission[]> {
    return [...this.availablePermissions];
  }

  async getRoles(): Promise<RolePermissions[]> {
    return [...this.roles];
  }

  async createRole(data: CreateRoleData): Promise<RolePermissions> {
    const newRole: RolePermissions = {
      role: data.name as UserRole,
      permissions: data.permissions
    };

    this.roles.push(newRole);
    return newRole;
  }

  async updateRole(roleName: UserRole, permissions: Permission[]): Promise<RolePermissions> {
    const index = this.roles.findIndex(r => r.role === roleName);
    if (index === -1) {
      throw new Error('Role not found');
    }

    this.roles[index].permissions = permissions;
    return this.roles[index];
  }

  async deleteRole(roleName: UserRole): Promise<void> {
    const index = this.roles.findIndex(r => r.role === roleName);
    if (index !== -1) {
      this.roles.splice(index, 1);
    }
  }

  // Check if user has permission for specific module and action
  hasPermission(userRole: UserRole, module: string, action: Permission['action']): boolean {
    const rolePermissions = this.roles.find(r => r.role === userRole);
    if (!rolePermissions) return false;

    // Check for wildcard permission
    const wildcardPermission = rolePermissions.permissions.find(p => p.module === '*');
    if (wildcardPermission && (wildcardPermission.action === 'admin' || wildcardPermission.action === action)) {
      return true;
    }

    // Check specific module permission
    const modulePermission = rolePermissions.permissions.find(p => p.module === module);
    if (!modulePermission) return false;

    // Check action hierarchy: admin > delete > write > read
    const actionHierarchy = ['read', 'write', 'delete', 'admin'];
    const requiredLevel = actionHierarchy.indexOf(action);
    const userLevel = actionHierarchy.indexOf(modulePermission.action);

    return userLevel >= requiredLevel;
  }

  // Route guard helper
  canAccessRoute(userRole: UserRole, route: string): boolean {
    const routePermissions: Record<string, { module: string; action: Permission['action'] }> = {
      '/rbac': { module: 'rbac', action: 'read' },
      '/global-parameters': { module: 'global-parameters', action: 'read' },
      '/reports/schedule': { module: 'reports.schedule', action: 'admin' },
      '/templates': { module: 'templates', action: 'read' },
      '/ai': { module: 'ai', action: 'read' },
      '/hearings': { module: 'hearings', action: 'read' },
      '/hearings/calendar': { module: 'hearings', action: 'read' },
      '/hearings/list': { module: 'hearings', action: 'read' }
    };

    const permission = routePermissions[route];
    if (!permission) return true; // Allow access to unprotected routes

    return this.hasPermission(userRole, permission.module, permission.action);
  }

  // DEV only - Self-check for debugging
  async selfCheck(userRole: UserRole): Promise<{ role: UserRole; permissions: Permission[]; routes: Record<string, boolean> }> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Self-check only available in development mode');
    }

    const rolePermissions = this.roles.find(r => r.role === userRole);
    const routes = {
      '/rbac': this.canAccessRoute(userRole, '/rbac'),
      '/global-parameters': this.canAccessRoute(userRole, '/global-parameters'),
      '/reports/schedule': this.canAccessRoute(userRole, '/reports/schedule'),
      '/templates': this.canAccessRoute(userRole, '/templates'),
      '/ai': this.canAccessRoute(userRole, '/ai')
    };

    return {
      role: userRole,
      permissions: rolePermissions?.permissions || [],
      routes
    };
  }
}

export const rbacService = new RBACService();