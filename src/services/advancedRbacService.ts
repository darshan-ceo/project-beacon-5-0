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
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Lazy initialization - do not initialize in constructor to avoid race conditions
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    // Prevent multiple concurrent initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    await this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log('🔐 Initializing AdvancedRBACService...');
      await unifiedStore.waitUntilReady();
      await this.seedDefaultData();
      // Ensure critical baseline exists even if store was previously seeded
      await this.ensureBaseline();
      this.initialized = true;
      console.log('✅ AdvancedRBACService initialized successfully');
    } catch (error) {
      console.error('❌ AdvancedRBACService initialization failed:', error);
      this.initPromise = null; // Reset to allow retry
      throw error;
    }
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    return unifiedStore.roles.getAll();
  }

  async getRoleById(id: string): Promise<RoleEntity | null> {
    await this.ensureInitialized();
    return unifiedStore.roles.getById(id);
  }

  // Permission Management
  async createPermission(data: CreatePermissionData): Promise<PermissionEntity> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    return unifiedStore.permissions.getAll();
  }

  async getPermissionsByCategory(category: string): Promise<PermissionEntity[]> {
    await this.ensureInitialized();
    return unifiedStore.permissions.getByCategory(category);
  }

  // User Role Assignment
  async assignRole(data: AssignRoleData): Promise<UserRoleAssignment> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    const assignments = await unifiedStore.userRoles.query(
      (ur) => ur.userId === userId && ur.roleId === roleId && ur.isActive
    );

    for (const assignment of assignments) {
      await unifiedStore.userRoles.update(assignment.id, { isActive: false });
      await this.auditLog('revoke_role', 'user_role', assignment.id, assignment, { ...assignment, isActive: false });
    }
  }

  async getUserRoles(userId: string): Promise<RoleEntity[]> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
    return unifiedStore.userRoles.getByRoleId(roleId);
  }

  // Audit and Analytics
  async getAuditLog(limit = 100): Promise<PolicyAuditEntry[]> {
    await this.ensureInitialized();
    const logs = await unifiedStore.policyAudit.getAll();
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getAuditByActor(actorId: string): Promise<PolicyAuditEntry[]> {
    await this.ensureInitialized();
    return unifiedStore.policyAudit.getByActor(actorId);
  }

  async getRoleAnalytics(): Promise<{
    totalRoles: number;
    activeRoles: number;
    systemRoles: number;
    totalAssignments: number;
    mostAssignedRole: { role: RoleEntity; count: number } | null;
  }> {
    await this.ensureInitialized();
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
      const existingPermissions = await unifiedStore.permissions.getAll();
      if (existingPermissions.length >= 40) { // We expect ~46 default permissions
        console.log('✅ RBAC permissions already seeded, skipping...');
        return;
      }

      // Clear existing incomplete data and re-seed
      console.log('🔄 Incomplete RBAC data detected, re-seeding...');
      const existingRoles = await unifiedStore.roles.getAll();
      const existingPerms = await unifiedStore.permissions.getAll();

      // Delete existing incomplete data
      for (const role of existingRoles) {
        if (!role.isSystemRole) continue; // Keep custom roles
        await unifiedStore.roles.delete(role.id);
      }
      for (const perm of existingPerms) {
        await unifiedStore.permissions.delete(perm.id);
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
        { name: 'system.audit', category: 'System', description: 'View audit logs', resource: 'audit', action: 'read' as const, scope: 'org' as const },
        
        // Reports - Scope-aware
        { name: 'reports.read.own', category: 'Reports', description: 'View own reports', resource: 'reports', action: 'read' as const, scope: 'own' as const },
        { name: 'reports.read.org', category: 'Reports', description: 'View all reports', resource: 'reports', action: 'read' as const, scope: 'org' as const },
        { name: 'reports.write.org', category: 'Reports', description: 'Generate reports', resource: 'reports', action: 'write' as const, scope: 'org' as const },
        { name: 'reports.admin.org', category: 'Reports', description: 'Manage report templates', resource: 'reports', action: 'admin' as const, scope: 'org' as const },

        // Dashboard - Scope-aware
        { name: 'dashboard.read.own', category: 'Dashboard', description: 'View own dashboard', resource: 'dashboard', action: 'read' as const, scope: 'own' as const },
        { name: 'dashboard.read.org', category: 'Dashboard', description: 'View all dashboards', resource: 'dashboard', action: 'read' as const, scope: 'org' as const },
        { name: 'dashboard.admin.org', category: 'Dashboard', description: 'Customize dashboards', resource: 'dashboard', action: 'admin' as const, scope: 'org' as const },

        // Analytics - Scope-aware
        { name: 'analytics.read.own', category: 'Analytics', description: 'View own analytics', resource: 'analytics', action: 'read' as const, scope: 'own' as const },
        { name: 'analytics.read.org', category: 'Analytics', description: 'View all analytics', resource: 'analytics', action: 'read' as const, scope: 'org' as const },
        { name: 'analytics.admin.org', category: 'Analytics', description: 'Configure analytics', resource: 'analytics', action: 'admin' as const, scope: 'org' as const }
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
            (p.scope === 'org' || (p.scope === 'team' && (p.action === 'write' || p.action === 'read' || p.action === 'admin')))
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

      // Auto-assign Admin role to demo user
      const roles = await unifiedStore.roles.getAll();
      const adminRole = roles.find(r => r.name === 'Admin');
      if (adminRole) {
        await this.assignRole({
          userId: 'demo-user',
          roleId: adminRole.id
        });
        console.log('[AdvancedRBACService] Assigned Admin role to demo-user');
      }
    } catch (error) {
      console.error('❌ Failed to seed default RBAC data:', error);
    }
  }

  async ensureBaseline(): Promise<void> {
    try {
      await unifiedStore.waitUntilReady();

      // Ensure required document permissions exist
      const allPerms = await unifiedStore.permissions.getAll();
      const findPerm = (predicate: (p: any) => boolean) => allPerms.find(predicate);

      let writeTeam = findPerm((p) => p.resource === 'documents' && p.action === 'write' && p.scope === 'team');
      if (!writeTeam) {
        writeTeam = await this.createPermission({
          name: 'documents.write.team',
          category: 'Documents',
          description: 'Upload team documents',
          resource: 'documents',
          action: 'write',
          scope: 'team',
          effect: 'allow',
        });
      }

      let adminOrg = findPerm((p) => p.resource === 'documents' && p.action === 'admin' && p.scope === 'org');
      if (!adminOrg) {
        adminOrg = await this.createPermission({
          name: 'documents.admin.org',
          category: 'Documents',
          description: 'Full document administration',
          resource: 'documents',
          action: 'admin',
          scope: 'org',
          effect: 'allow',
        });
      }

      // Ensure Admin role includes the required permissions
      const roles = await unifiedStore.roles.getAll();
      const adminRole = roles.find((r) => r.name === 'Admin');
      if (adminRole) {
        const permSet = new Set(adminRole.permissions);
        if (writeTeam && !permSet.has(writeTeam.id)) permSet.add(writeTeam.id);
        if (adminOrg && !permSet.has(adminOrg.id)) permSet.add(adminOrg.id);
        const updatedPermissions = Array.from(permSet);
        if (updatedPermissions.length !== adminRole.permissions.length) {
          await unifiedStore.roles.update(adminRole.id, {
            permissions: updatedPermissions,
            updatedAt: new Date().toISOString(),
          });
        }

        // Ensure demo-user has Admin assigned
        const existing = await unifiedStore.userRoles.query(
          (ur) => ur.userId === 'demo-user' && ur.roleId === adminRole.id && ur.isActive
        );
        if (existing.length === 0) {
          await this.assignRole({ userId: 'demo-user', roleId: adminRole.id });
        }
      }
    } catch (error) {
      console.warn('[AdvancedRBACService] ensureBaseline failed:', error);
    }
  }
}


// Singleton export
export const advancedRbacService = new AdvancedRBACService();