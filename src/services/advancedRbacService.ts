/**
 * Advanced RBAC Service - DEMO Mode Implementation
 * Provides role and permission management backed by unifiedStore
 */

import { unifiedStore, type RoleEntity, type PermissionEntity, type UserRoleAssignment, type PolicyAuditEntry } from '@/persistence/unifiedStore';
import { toast } from 'sonner';

export interface CreateRoleData {
  name: string;
  description: string;
  permissions: string[];
  isActive?: boolean;
}

export interface CreatePermissionData {
  name: string;
  category: string;
  description: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  effect?: 'allow' | 'deny';
}

export interface AssignRoleData {
  userId: string;
  roleId: string;
  expiresAt?: string;
}

class AdvancedRBACService {
  private currentActorId = 'demo-user'; // In real app, get from auth context

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    await unifiedStore.waitUntilReady();
    await this.seedDefaultData();
  }

  private async auditLog(
    action: PolicyAuditEntry['action'],
    entityType: PolicyAuditEntry['entityType'],
    entityId: string,
    before?: any,
    after?: any
  ): Promise<void> {
    try {
      await unifiedStore.policyAudit.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        actorId: this.currentActorId,
        action,
        before,
        after,
        timestamp: new Date().toISOString(),
        entityType,
        entityId
      });
    } catch (error) {
      console.warn('Failed to create audit log:', error);
    }
  }

  // Role Management
  async createRole(data: CreateRoleData): Promise<RoleEntity> {
    const existing = await unifiedStore.roles.getByName(data.name);
    if (existing.length > 0) {
      throw new Error(`Role "${data.name}" already exists`);
    }

    const role: RoleEntity = {
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      isActive: data.isActive ?? true,
      isSystemRole: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.currentActorId
    };

    const created = await unifiedStore.roles.create(role);
    await this.auditLog('create_role', 'role', created.id, null, created);
    
    return created;
  }

  async updateRole(id: string, updates: Partial<CreateRoleData>): Promise<RoleEntity> {
    const existing = await unifiedStore.roles.getById(id);
    if (!existing) {
      throw new Error('Role not found');
    }

    if (existing.isSystemRole && (updates.name || updates.permissions)) {
      throw new Error('Cannot modify system role properties');
    }

    if (updates.name && updates.name !== existing.name) {
      const nameCheck = await unifiedStore.roles.getByName(updates.name);
      if (nameCheck.length > 0) {
        throw new Error(`Role "${updates.name}" already exists`);
      }
    }

    const updated = await unifiedStore.roles.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    await this.auditLog('update_role', 'role', id, existing, updated);
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    const existing = await unifiedStore.roles.getById(id);
    if (!existing) {
      throw new Error('Role not found');
    }

    if (existing.isSystemRole) {
      throw new Error('Cannot delete system role');
    }

    // Check if role is assigned to users
    const assignments = await unifiedStore.userRoles.getByRoleId(id);
    if (assignments.length > 0) {
      throw new Error(`Cannot delete role - assigned to ${assignments.length} users`);
    }

    await unifiedStore.roles.delete(id);
    await this.auditLog('delete_role', 'role', id, existing, null);
  }

  async getAllRoles(): Promise<RoleEntity[]> {
    return unifiedStore.roles.getAll();
  }

  async getRoleById(id: string): Promise<RoleEntity | null> {
    return unifiedStore.roles.getById(id);
  }

  // Permission Management
  async createPermission(data: CreatePermissionData): Promise<PermissionEntity> {
    const permission: PermissionEntity = {
      id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      category: data.category,
      description: data.description,
      resource: data.resource,
      action: data.action,
      effect: data.effect ?? 'allow',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.currentActorId
    };

    const created = await unifiedStore.permissions.create(permission);
    await this.auditLog('create_permission', 'permission', created.id, null, created);
    
    return created;
  }

  async getAllPermissions(): Promise<PermissionEntity[]> {
    return unifiedStore.permissions.getAll();
  }

  async getPermissionsByCategory(category: string): Promise<PermissionEntity[]> {
    return unifiedStore.permissions.getByCategory(category);
  }

  // User Role Assignment
  async assignRole(data: AssignRoleData): Promise<UserRoleAssignment> {
    // Check if user already has this role
    const existing = await unifiedStore.userRoles.query(
      (ur) => ur.userId === data.userId && ur.roleId === data.roleId && ur.isActive
    );

    if (existing.length > 0) {
      throw new Error('User already has this role assigned');
    }

    const assignment: UserRoleAssignment = {
      id: `userrole_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: data.userId,
      roleId: data.roleId,
      assignedAt: new Date().toISOString(),
      assignedBy: this.currentActorId,
      expiresAt: data.expiresAt,
      isActive: true
    };

    const created = await unifiedStore.userRoles.create(assignment);
    await this.auditLog('assign_role', 'user_role', created.id, null, created);
    
    return created;
  }

  async revokeRole(userId: string, roleId: string): Promise<void> {
    const assignments = await unifiedStore.userRoles.query(
      (ur) => ur.userId === userId && ur.roleId === roleId && ur.isActive
    );

    for (const assignment of assignments) {
      await unifiedStore.userRoles.update(assignment.id, { isActive: false });
      await this.auditLog('revoke_role', 'user_role', assignment.id, assignment, { ...assignment, isActive: false });
    }
  }

  async getUserRoles(userId: string): Promise<RoleEntity[]> {
    const assignments = await unifiedStore.userRoles.getByUserId(userId);
    const roles: RoleEntity[] = [];

    for (const assignment of assignments) {
      const role = await unifiedStore.roles.getById(assignment.roleId);
      if (role && role.isActive) {
        roles.push(role);
      }
    }

    return roles;
  }

  async getRoleUsers(roleId: string): Promise<UserRoleAssignment[]> {
    return unifiedStore.userRoles.getByRoleId(roleId);
  }

  // Audit and Analytics
  async getAuditLog(limit = 100): Promise<PolicyAuditEntry[]> {
    const logs = await unifiedStore.policyAudit.getAll();
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getAuditByActor(actorId: string): Promise<PolicyAuditEntry[]> {
    return unifiedStore.policyAudit.getByActor(actorId);
  }

  async getRoleAnalytics(): Promise<{
    totalRoles: number;
    activeRoles: number;
    systemRoles: number;
    totalAssignments: number;
    mostAssignedRole: { role: RoleEntity; count: number } | null;
  }> {
    const roles = await unifiedStore.roles.getAll();
    const assignments = await unifiedStore.userRoles.getAll();

    const activeRoles = roles.filter(r => r.isActive).length;
    const systemRoles = roles.filter(r => r.isSystemRole).length;
    const activeAssignments = assignments.filter(a => a.isActive).length;

    // Find most assigned role
    const roleCounts = assignments
      .filter(a => a.isActive)
      .reduce((counts, assignment) => {
        counts[assignment.roleId] = (counts[assignment.roleId] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

    let mostAssignedRole: { role: RoleEntity; count: number } | null = null;
    let maxCount = 0;

    for (const [roleId, count] of Object.entries(roleCounts)) {
      if (count > maxCount) {
        const role = await unifiedStore.roles.getById(roleId);
        if (role) {
          mostAssignedRole = { role, count };
          maxCount = count;
        }
      }
    }

    return {
      totalRoles: roles.length,
      activeRoles,
      systemRoles,
      totalAssignments: activeAssignments,
      mostAssignedRole
    };
  }

  // Seed default system roles and permissions
  private async seedDefaultData(): Promise<void> {
    try {
      const existingRoles = await unifiedStore.roles.getAll();
      if (existingRoles.length > 0) {
        return; // Already seeded
      }

      console.log('🌱 Seeding default RBAC data...');

      // Create default permissions
      const defaultPermissions = [
        // Cases
        { name: 'cases.read', category: 'Cases', description: 'View cases', resource: 'cases', action: 'read' as const },
        { name: 'cases.write', category: 'Cases', description: 'Create and edit cases', resource: 'cases', action: 'write' as const },
        { name: 'cases.delete', category: 'Cases', description: 'Delete cases', resource: 'cases', action: 'delete' as const },
        { name: 'cases.admin', category: 'Cases', description: 'Full case administration', resource: 'cases', action: 'admin' as const },
        
        // Clients
        { name: 'clients.read', category: 'Clients', description: 'View clients', resource: 'clients', action: 'read' as const },
        { name: 'clients.write', category: 'Clients', description: 'Create and edit clients', resource: 'clients', action: 'write' as const },
        { name: 'clients.delete', category: 'Clients', description: 'Delete clients', resource: 'clients', action: 'delete' as const },
        { name: 'clients.admin', category: 'Clients', description: 'Full client administration', resource: 'clients', action: 'admin' as const },
        
        // Documents
        { name: 'documents.read', category: 'Documents', description: 'View documents', resource: 'documents', action: 'read' as const },
        { name: 'documents.write', category: 'Documents', description: 'Upload and edit documents', resource: 'documents', action: 'write' as const },
        { name: 'documents.delete', category: 'Documents', description: 'Delete documents', resource: 'documents', action: 'delete' as const },
        { name: 'documents.admin', category: 'Documents', description: 'Full document administration', resource: 'documents', action: 'admin' as const },
        
        // Tasks
        { name: 'tasks.read', category: 'Tasks', description: 'View tasks', resource: 'tasks', action: 'read' as const },
        { name: 'tasks.write', category: 'Tasks', description: 'Create and edit tasks', resource: 'tasks', action: 'write' as const },
        { name: 'tasks.delete', category: 'Tasks', description: 'Delete tasks', resource: 'tasks', action: 'delete' as const },
        { name: 'tasks.admin', category: 'Tasks', description: 'Full task administration', resource: 'tasks', action: 'admin' as const },
        
        // Hearings
        { name: 'hearings.read', category: 'Hearings', description: 'View hearings', resource: 'hearings', action: 'read' as const },
        { name: 'hearings.write', category: 'Hearings', description: 'Schedule and edit hearings', resource: 'hearings', action: 'write' as const },
        { name: 'hearings.delete', category: 'Hearings', description: 'Delete hearings', resource: 'hearings', action: 'delete' as const },
        { name: 'hearings.admin', category: 'Hearings', description: 'Full hearing administration', resource: 'hearings', action: 'admin' as const },
        
        // System
        { name: 'system.settings', category: 'System', description: 'Manage system settings', resource: 'system', action: 'admin' as const },
        { name: 'system.rbac', category: 'System', description: 'Manage roles and permissions', resource: 'rbac', action: 'admin' as const },
        { name: 'system.audit', category: 'System', description: 'View audit logs', resource: 'audit', action: 'read' as const }
      ];

      const permissions: PermissionEntity[] = [];
      for (const perm of defaultPermissions) {
        permissions.push(await this.createPermission(perm));
      }

      // Create default roles
      const defaultRoles: Array<CreateRoleData & { isSystemRole: boolean }> = [
        {
          name: 'SuperAdmin',
          description: 'Full system access with all administrative privileges',
          permissions: permissions.map(p => p.id),
          isSystemRole: true
        },
        {
          name: 'Admin',
          description: 'Administrative access excluding super admin functions',
          permissions: permissions.filter(p => !p.name.includes('system.rbac')).map(p => p.id),
          isSystemRole: true
        },
        {
          name: 'Manager',
          description: 'Senior legal professional with case and client management',
          permissions: permissions.filter(p => 
            p.resource === 'cases' || p.resource === 'clients' || p.resource === 'documents' || p.resource === 'hearings'
          ).map(p => p.id),
          isSystemRole: true
        },
        {
          name: 'Staff',
          description: 'Legal staff with limited access to assigned work',
          permissions: permissions.filter(p => 
            p.action === 'read' || (p.action === 'write' && p.resource === 'tasks')
          ).map(p => p.id),
          isSystemRole: true
        },
        {
          name: 'ReadOnly',
          description: 'Read-only access to basic information',
          permissions: permissions.filter(p => p.action === 'read').map(p => p.id),
          isSystemRole: true
        }
      ];

      for (const roleData of defaultRoles) {
        const { isSystemRole, ...createData } = roleData;
        const role = await this.createRole(createData);
        await unifiedStore.roles.update(role.id, { isSystemRole });
      }

      console.log('✅ Default RBAC data seeded successfully');
    } catch (error) {
      console.error('❌ Failed to seed default RBAC data:', error);
    }
  }
}

// Singleton export
export const advancedRbacService = new AdvancedRBACService();