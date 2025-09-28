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
  scope?: 'own' | 'team' | 'org';
  conditions?: Array<{ field: string; op: string; value?: any; ctx?: string }>;
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
      scope: data.scope ?? 'own',
      conditions: data.conditions as any,
      isSystemPermission: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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

      // Create scope-aware default permissions
      const defaultPermissions = [
        // Cases - Scope-aware
        { name: 'cases.read.own', category: 'Cases', description: 'View own cases', resource: 'cases', action: 'read' as const, scope: 'own' as const },
        { name: 'cases.read.team', category: 'Cases', description: 'View team cases', resource: 'cases', action: 'read' as const, scope: 'team' as const },
        { name: 'cases.read.org', category: 'Cases', description: 'View all cases', resource: 'cases', action: 'read' as const, scope: 'org' as const },
        { name: 'cases.write.own', category: 'Cases', description: 'Edit own cases', resource: 'cases', action: 'write' as const, scope: 'own' as const },
        { name: 'cases.write.team', category: 'Cases', description: 'Edit team cases', resource: 'cases', action: 'write' as const, scope: 'team' as const },
        { name: 'cases.write.org', category: 'Cases', description: 'Edit all cases', resource: 'cases', action: 'write' as const, scope: 'org' as const },
        { name: 'cases.delete.team', category: 'Cases', description: 'Delete team cases', resource: 'cases', action: 'delete' as const, scope: 'team' as const },
        { name: 'cases.admin.org', category: 'Cases', description: 'Full case administration', resource: 'cases', action: 'admin' as const, scope: 'org' as const },
        
        // Clients - Scope-aware  
        { name: 'clients.read.own', category: 'Clients', description: 'View own clients', resource: 'clients', action: 'read' as const, scope: 'own' as const },
        { name: 'clients.read.team', category: 'Clients', description: 'View team clients', resource: 'clients', action: 'read' as const, scope: 'team' as const },
        { name: 'clients.read.org', category: 'Clients', description: 'View all clients', resource: 'clients', action: 'read' as const, scope: 'org' as const },
        { name: 'clients.write.own', category: 'Clients', description: 'Edit own clients', resource: 'clients', action: 'write' as const, scope: 'own' as const },
        { name: 'clients.write.team', category: 'Clients', description: 'Edit team clients', resource: 'clients', action: 'write' as const, scope: 'team' as const },
        { name: 'clients.write.org', category: 'Clients', description: 'Edit all clients', resource: 'clients', action: 'write' as const, scope: 'org' as const },
        { name: 'clients.admin.org', category: 'Clients', description: 'Full client administration', resource: 'clients', action: 'admin' as const, scope: 'org' as const },
        
        // Documents - Scope-aware
        { name: 'documents.read.own', category: 'Documents', description: 'View own documents', resource: 'documents', action: 'read' as const, scope: 'own' as const },
        { name: 'documents.read.team', category: 'Documents', description: 'View team documents', resource: 'documents', action: 'read' as const, scope: 'team' as const },
        { name: 'documents.read.org', category: 'Documents', description: 'View all documents', resource: 'documents', action: 'read' as const, scope: 'org' as const },
        { name: 'documents.write.own', category: 'Documents', description: 'Upload own documents', resource: 'documents', action: 'write' as const, scope: 'own' as const },
        { name: 'documents.write.team', category: 'Documents', description: 'Upload team documents', resource: 'documents', action: 'write' as const, scope: 'team' as const },
        { name: 'documents.admin.org', category: 'Documents', description: 'Full document administration', resource: 'documents', action: 'admin' as const, scope: 'org' as const },
        
        // Tasks - Scope-aware
        { name: 'tasks.read.own', category: 'Tasks', description: 'View own tasks', resource: 'tasks', action: 'read' as const, scope: 'own' as const },
        { name: 'tasks.read.team', category: 'Tasks', description: 'View team tasks', resource: 'tasks', action: 'read' as const, scope: 'team' as const },
        { name: 'tasks.read.org', category: 'Tasks', description: 'View all tasks', resource: 'tasks', action: 'read' as const, scope: 'org' as const },
        { name: 'tasks.write.own', category: 'Tasks', description: 'Edit own tasks', resource: 'tasks', action: 'write' as const, scope: 'own' as const },
        { name: 'tasks.write.team', category: 'Tasks', description: 'Edit team tasks', resource: 'tasks', action: 'write' as const, scope: 'team' as const },
        { name: 'tasks.write.org', category: 'Tasks', description: 'Edit all tasks', resource: 'tasks', action: 'write' as const, scope: 'org' as const },
        { name: 'tasks.admin.org', category: 'Tasks', description: 'Full task administration', resource: 'tasks', action: 'admin' as const, scope: 'org' as const },
        
        // Hearings - Scope-aware
        { name: 'hearings.read.own', category: 'Hearings', description: 'View own hearings', resource: 'hearings', action: 'read' as const, scope: 'own' as const },
        { name: 'hearings.read.team', category: 'Hearings', description: 'View team hearings', resource: 'hearings', action: 'read' as const, scope: 'team' as const },
        { name: 'hearings.read.org', category: 'Hearings', description: 'View all hearings', resource: 'hearings', action: 'read' as const, scope: 'org' as const },
        { name: 'hearings.write.team', category: 'Hearings', description: 'Schedule team hearings', resource: 'hearings', action: 'write' as const, scope: 'team' as const },
        { name: 'hearings.write.org', category: 'Hearings', description: 'Schedule all hearings', resource: 'hearings', action: 'write' as const, scope: 'org' as const },
        { name: 'hearings.admin.org', category: 'Hearings', description: 'Full hearing administration', resource: 'hearings', action: 'admin' as const, scope: 'org' as const },
        
        // System
        { name: 'system.settings', category: 'System', description: 'Manage system settings', resource: 'system', action: 'admin' as const, scope: 'org' as const },
        { name: 'system.rbac', category: 'System', description: 'Manage roles and permissions', resource: 'rbac', action: 'admin' as const, scope: 'org' as const },
        { name: 'system.audit', category: 'System', description: 'View audit logs', resource: 'audit', action: 'read' as const, scope: 'org' as const }
      ];

      const permissions: PermissionEntity[] = [];
      for (const perm of defaultPermissions) {
        permissions.push(await this.createPermission(perm));
      }

      // Create scope-aware default roles
      const defaultRoles: Array<CreateRoleData & { isSystemRole: boolean }> = [
        {
          name: 'SuperAdmin',
          description: 'Full system access with organizational scope',
          permissions: permissions.map(p => p.id),
          isSystemRole: true
        },
        {
          name: 'Admin',
          description: 'Administrative access with organizational scope for most resources',
          permissions: permissions.filter(p => 
            !p.name.includes('system.rbac') && 
            (p.scope === 'org' || (p.scope === 'team' && p.action !== 'delete'))
          ).map(p => p.id),
          isSystemRole: true
        },
        {
          name: 'Manager',
          description: 'Team lead with team scope for cases, clients, and documents',
          permissions: permissions.filter(p => 
            (p.resource === 'cases' && p.scope === 'team') ||
            (p.resource === 'clients' && p.scope === 'team') ||
            (p.resource === 'documents' && p.scope === 'team') ||
            (p.resource === 'hearings' && p.scope === 'team') ||
            (p.resource === 'tasks' && p.scope === 'org' && p.action === 'read')
          ).map(p => p.id),
          isSystemRole: true
        },
        {
          name: 'Staff',
          description: 'Legal staff with own scope for assigned work',
          permissions: permissions.filter(p => 
            (p.scope === 'own' && (p.action === 'read' || p.action === 'write')) ||
            (p.resource === 'documents' && p.scope === 'team' && p.action === 'read')
          ).map(p => p.id),
          isSystemRole: true
        },
        {
          name: 'ReadOnly',
          description: 'Read-only access with own scope',
          permissions: permissions.filter(p => 
            p.action === 'read' && p.scope === 'own'
          ).map(p => p.id),
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