/**
 * Supabase RBAC Service - Direct Supabase Integration
 * Manages roles and permissions using Supabase tables
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// App role enum matches Supabase's app_role type
export type AppRole = Database['public']['Enums']['app_role'];

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
  is_active: boolean;
}

export interface UserWithRoles {
  id: string;
  full_name: string;
  email?: string;
  designation?: string;
  roles: string[]; // Can be AppRole or custom role names
  status: 'Active' | 'Inactive';
  last_login?: string;
}

export interface Permission {
  key: string;
  module: string;
  action: string;
  description: string | null;
}

export interface RoleDefinition {
  id: string;
  name: AppRole | string;
  displayName: string;
  description: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: string[];
}

export interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateCustomRoleInput {
  name: string;
  displayName: string;
  description?: string;
}

// Role display names and descriptions
const ROLE_METADATA: Record<string, { displayName: string; description: string; isSystemRole: boolean }> = {
  admin: { displayName: 'Administrator', description: 'Full system access with all administrative privileges', isSystemRole: true },
  manager: { displayName: 'Manager', description: 'Team management and oversight capabilities', isSystemRole: true },
  user: { displayName: 'User', description: 'Standard user access', isSystemRole: true },
  partner: { displayName: 'Partner', description: 'Partner-level access with full visibility', isSystemRole: true },
  advocate: { displayName: 'Advocate', description: 'Legal professional with case management access', isSystemRole: true },
  ca: { displayName: 'CA', description: 'Chartered Accountant with financial and compliance access', isSystemRole: true },
  staff: { displayName: 'Staff', description: 'Basic staff access for assigned tasks', isSystemRole: true },
  clerk: { displayName: 'Clerk', description: 'Administrative support role', isSystemRole: true },
  client: { displayName: 'Client', description: 'External client with limited access', isSystemRole: true },
};

class SupabaseRbacService {
  private currentUserId: string | null = null;

  async getCurrentUserId(): Promise<string | null> {
    if (this.currentUserId) return this.currentUserId;
    
    const { data: { user } } = await supabase.auth.getUser();
    this.currentUserId = user?.id || null;
    return this.currentUserId;
  }

  // ==================== ROLE MANAGEMENT ====================

  /**
   * Get all available roles with their metadata (system + custom)
   */
  async getAllRoles(): Promise<RoleDefinition[]> {
    // Get all permissions to build role-permission mappings
    const { data: permissions } = await supabase
      .from('permissions')
      .select('key, module, action, description');

    // Get user counts per role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('is_active', true);

    // Build system role definitions from metadata
    const systemRoles: RoleDefinition[] = Object.entries(ROLE_METADATA).map(([role, meta]) => ({
      id: role,
      name: role as AppRole,
      displayName: meta.displayName,
      description: meta.description,
      isSystemRole: meta.isSystemRole,
      isActive: true,
      permissions: this.getDefaultPermissionsForRole(role as AppRole, (permissions || []) as Permission[]),
    }));

    // Get custom roles from database
    const { data: customRolesData } = await supabase
      .from('custom_roles')
      .select('*')
      .eq('is_active', true);

    const customRoles: RoleDefinition[] = (customRolesData || []).map((cr: CustomRole) => ({
      id: cr.id,
      name: cr.name,
      displayName: cr.display_name,
      description: cr.description || '',
      isSystemRole: false,
      isActive: cr.is_active,
      permissions: [], // Custom roles get permissions from role_permissions table
    }));

    return [...systemRoles, ...customRoles];
  }

  // ==================== CUSTOM ROLE MANAGEMENT ====================

  /**
   * Create a new custom role
   */
  async createCustomRole(input: CreateCustomRoleInput): Promise<CustomRole> {
    const currentUserId = await this.getCurrentUserId();
    
    // Get tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', currentUserId)
      .single();

    if (!profile?.tenant_id) {
      throw new Error('Could not determine tenant');
    }

    // Validate name format (lowercase, no spaces)
    const normalizedName = input.name.toLowerCase().replace(/\s+/g, '_');

    const { data, error } = await supabase
      .from('custom_roles')
      .insert({
        tenant_id: profile.tenant_id,
        name: normalizedName,
        display_name: input.displayName,
        description: input.description || null,
        is_system: false,
        is_active: true,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('A role with this name already exists');
      }
      console.error('Error creating custom role:', error);
      throw new Error('Failed to create role');
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      tenant_id: profile.tenant_id,
      user_id: currentUserId,
      action_type: 'create_custom_role',
      entity_type: 'role',
      entity_id: data.id,
      details: { name: normalizedName, display_name: input.displayName },
    });

    return data as CustomRole;
  }

  /**
   * Update a custom role
   */
  async updateCustomRole(roleId: string, updates: Partial<CreateCustomRoleInput>): Promise<void> {
    const updateData: Record<string, any> = {};
    if (updates.displayName) updateData.display_name = updates.displayName;
    if (updates.description !== undefined) updateData.description = updates.description;

    const { error } = await supabase
      .from('custom_roles')
      .update(updateData)
      .eq('id', roleId);

    if (error) {
      console.error('Error updating custom role:', error);
      throw new Error('Failed to update role');
    }
  }

  /**
   * Delete a custom role (soft delete by setting is_active = false)
   */
  async deleteCustomRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_roles')
      .update({ is_active: false })
      .eq('id', roleId);

    if (error) {
      console.error('Error deleting custom role:', error);
      throw new Error('Failed to delete role');
    }
  }

  /**
   * Get all custom roles for current tenant
   */
  async getCustomRoles(): Promise<CustomRole[]> {
    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .order('display_name');

    if (error) {
      console.error('Error fetching custom roles:', error);
      return [];
    }

    return (data || []) as CustomRole[];
  }

  /**
   * Get default permissions for a role based on role hierarchy
   */
  private getDefaultPermissionsForRole(role: AppRole, allPermissions: Permission[]): string[] {
    const permissionKeys = allPermissions.map(p => p.key);
    
    switch (role) {
      case 'admin':
        return permissionKeys; // All permissions
      case 'partner':
        return permissionKeys.filter(k => !k.includes('rbac.manage'));
      case 'manager':
      case 'ca':
      case 'advocate':
        return permissionKeys.filter(k => 
          !k.includes('rbac') && !k.includes('employees.delete')
        );
      case 'staff':
      case 'user':
      case 'clerk':
        return permissionKeys.filter(k => 
          k.includes('.read') || k.includes('.create') || 
          (k.includes('.update') && !k.includes('employees') && !k.includes('courts') && !k.includes('judges'))
        );
      case 'client':
        return permissionKeys.filter(k => k.includes('.read') && (k.includes('cases') || k.includes('documents') || k.includes('hearings')));
      default:
        return [];
    }
  }

  // ==================== USER ROLE ASSIGNMENT ====================

  /**
   * Get all users with their assigned roles
   */
  async getAllUsersWithRoles(): Promise<UserWithRoles[]> {
    // Get profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, designation');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw new Error('Failed to fetch users');
    }

    // Get all active role assignments
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('is_active', true);

    if (roleError) {
      console.error('Error fetching user roles:', roleError);
      throw new Error('Failed to fetch user roles');
    }

    // Group roles by user
    const rolesByUser = (userRoles || []).reduce((acc, ur) => {
      if (!acc[ur.user_id]) acc[ur.user_id] = [];
      acc[ur.user_id].push(ur.role as AppRole);
      return acc;
    }, {} as Record<string, AppRole[]>);

    // Build user list
    const users: UserWithRoles[] = (profiles || []).map(profile => ({
      id: profile.id,
      full_name: profile.full_name || 'Unknown',
      designation: profile.designation || undefined,
      roles: rolesByUser[profile.id] || [],
      status: 'Active' as const,
      last_login: undefined,
    }));

    return users;
  }

  /**
   * Assign a role to a user
   */
  async assignRole(userId: string, role: AppRole): Promise<void> {
    const currentUserId = await this.getCurrentUserId();
    
    // Check if user already has this role
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .eq('is_active', true)
      .single();

    if (existing) {
      throw new Error('User already has this role');
    }

    // Insert new role assignment
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        granted_by: currentUserId,
        is_active: true,
      });

    if (error) {
      console.error('Error assigning role:', error);
      throw new Error('Failed to assign role');
    }
  }

  /**
   * Revoke a role from a user
   */
  async revokeRole(userId: string, role: AppRole): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('role', role)
      .eq('is_active', true);

    if (error) {
      console.error('Error revoking role:', error);
      throw new Error('Failed to revoke role');
    }
  }

  /**
   * Get roles for a specific user
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return (data || []).map(r => r.role as string);
  }

  // ==================== PERMISSIONS ====================

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module', { ascending: true })
      .order('action', { ascending: true });

    if (error) {
      console.error('Error fetching permissions:', error);
      throw new Error('Failed to fetch permissions');
    }

    return (data || []) as Permission[];
  }

  /**
   * Get permissions grouped by module
   */
  async getPermissionsByModule(): Promise<Record<string, Permission[]>> {
    const permissions = await this.getAllPermissions();
    
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }

  /**
   * Update permissions for a role (system or custom)
   */
  async updateRolePermissions(roleName: string, permissionKeys: string[]): Promise<void> {
    const currentUserId = await this.getCurrentUserId();
    
    // Get tenant_id from current user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', currentUserId)
      .single();

    if (!profile?.tenant_id) {
      throw new Error('Could not determine tenant');
    }

    // Delete existing role permissions for this role
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role', roleName as AppRole);

    if (deleteError) {
      console.error('Error deleting existing permissions:', deleteError);
      throw new Error('Failed to update permissions');
    }

    // Insert new permissions
    if (permissionKeys.length > 0) {
      const inserts = permissionKeys.map(key => ({
        role: roleName as AppRole,
        permission_key: key,
      }));

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(inserts);

      if (insertError) {
        console.error('Error inserting permissions:', insertError);
        throw new Error('Failed to update permissions');
      }
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      tenant_id: profile.tenant_id,
      user_id: currentUserId,
      action_type: 'update_role_permissions',
      entity_type: 'role',
      entity_id: roleName,
      details: { role: roleName, permissions_count: permissionKeys.length },
    });
  }

  /**
   * Get permissions for a specific role from role_permissions table
   */
  async getRolePermissions(roleName: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission_key')
      .eq('role', roleName as AppRole);

    if (error) {
      console.error('Error fetching role permissions:', error);
      // Fall back to default permissions if table query fails (only for system roles)
      if (Object.keys(ROLE_METADATA).includes(roleName)) {
        const allPerms = await this.getAllPermissions();
        return this.getDefaultPermissionsForRole(roleName as AppRole, allPerms);
      }
      return [];
    }

    // If no custom permissions set, return defaults (only for system roles)
    if (!data || data.length === 0) {
      if (Object.keys(ROLE_METADATA).includes(roleName)) {
        const allPerms = await this.getAllPermissions();
        return this.getDefaultPermissionsForRole(roleName as AppRole, allPerms);
      }
      return [];
    }

    return data.map(r => r.permission_key);
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, module: string, action: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    
    // Admin has all permissions
    if (roles.includes('admin')) return true;

    // Get permissions for all user roles
    const allRoles = await this.getAllRoles();
    const userRoleDefs = allRoles.filter(r => roles.includes(String(r.name)));
    
    const permissionKey = `${module}.${action}`;
    return userRoleDefs.some(role => role.permissions.includes(permissionKey));
  }

  // ==================== ANALYTICS ====================

  /**
   * Get RBAC analytics
   */
  async getAnalytics(): Promise<{
    totalUsers: number;
    usersWithRoles: number;
    totalRoles: number;
    totalPermissions: number;
    roleDistribution: Record<string, number>;
  }> {
    // Get user counts
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get role assignments
    const { data: roleAssignments } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('is_active', true);

    // Get permission count
    const { count: totalPermissions } = await supabase
      .from('permissions')
      .select('*', { count: 'exact', head: true });

    // Calculate role distribution
    const roleDistribution = (roleAssignments || []).reduce((acc, ra) => {
      acc[ra.role] = (acc[ra.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count unique users with roles
    const uniqueUsersWithRoles = new Set((roleAssignments || []).map(ra => ra.user_id)).size;

    return {
      totalUsers: totalUsers || 0,
      usersWithRoles: uniqueUsersWithRoles,
      totalRoles: Object.keys(ROLE_METADATA).length,
      totalPermissions: totalPermissions || 0,
      roleDistribution,
    };
  }

  // ==================== AUDIT LOG ====================

  /**
   * Get RBAC audit log from main audit_log table
   */
  async getAuditLog(limit = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .or('entity_type.eq.role,entity_type.eq.permission,entity_type.eq.user_role')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }

    return data || [];
  }
}

export const supabaseRbacService = new SupabaseRbacService();
