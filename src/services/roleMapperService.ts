/**
 * Role Mapper Service
 * Maps Employee operational roles to RBAC permission roles
 */

import { advancedRbacService } from './advancedRbacService';
import { Employee } from './employeesService';
import { toast } from '@/hooks/use-toast';

// Mapping configuration: Employee Role → RBAC Role Names
export const EMPLOYEE_TO_RBAC_MAPPING: Record<Employee['role'], string[]> = {
  'Partner': ['SuperAdmin'],      // Full system access
  'CA': ['Admin'],                 // Administrative access
  'Advocate': ['Manager'],         // Team management
  'Manager': ['Manager'],          // Team management
  'Staff': ['Staff'],              // Own work scope
  'RM': ['Manager'],               // Relationship managers need team visibility
  'Finance': ['Manager'],          // Finance needs team visibility
  'Admin': ['Admin']               // Admin role maps to RBAC Admin
};

// Role descriptions for UI display
export const ROLE_DESCRIPTIONS: Record<Employee['role'], string> = {
  'Partner': 'Full system access with all administrative privileges',
  'CA': 'Administrative access for financial and compliance management',
  'Advocate': 'Team management with case and client oversight',
  'Manager': 'Team management with task and resource coordination',
  'Staff': 'Access to assigned work and own tasks',
  'RM': 'Relationship management with client and team visibility',
  'Finance': 'Financial management with reporting and analysis access',
  'Admin': 'Administrative access for system configuration'
};

/**
 * Get RBAC role IDs for a given employee role
 */
export async function getRBACRolesForEmployee(employeeRole: Employee['role']): Promise<string[]> {
  try {
    const rbacRoleNames = EMPLOYEE_TO_RBAC_MAPPING[employeeRole] || [];
    const allRoles = await advancedRbacService.getAllRoles();
    
    // Map role names to role IDs
    const roleIds = rbacRoleNames
      .map(roleName => {
        const role = allRoles.find(r => r.name === roleName);
        return role?.id;
      })
      .filter((id): id is string => id !== undefined);
    
    return roleIds;
  } catch (error) {
    console.error('Failed to get RBAC roles for employee:', error);
    return [];
  }
}

/**
 * Get role description for UI display
 */
export function getRoleDescription(employeeRole: Employee['role']): string {
  return ROLE_DESCRIPTIONS[employeeRole] || 'Standard employee access';
}

/**
 * Get RBAC role names for display
 */
export function getRBACRoleNamesForEmployee(employeeRole: Employee['role']): string[] {
  return EMPLOYEE_TO_RBAC_MAPPING[employeeRole] || [];
}

/**
 * Sync employee to RBAC system
 * This assigns appropriate RBAC roles based on the employee's operational role
 */
export async function syncEmployeeToRBAC(employee: Employee): Promise<void> {
  try {
    // Only sync active employees
    if (employee.status !== 'Active') {
      console.log(`Skipping RBAC sync for inactive employee: ${employee.full_name}`);
      return;
    }

    // Get current RBAC role assignments
    const currentUserRoles = await advancedRbacService.getUserRoles(employee.id);
    const currentRoleIds = currentUserRoles.map(ur => (ur as any).roleId);
    
    // Get target RBAC roles based on employee role
    const targetRoleIds = await getRBACRolesForEmployee(employee.role);
    
    if (targetRoleIds.length === 0) {
      console.warn(`No RBAC roles mapped for employee role: ${employee.role}`);
      return;
    }

    // Remove roles that should no longer be assigned (auto-assigned roles only)
    const allRoles = await advancedRbacService.getAllRoles();
    const autoAssignedRoleIds = allRoles
      .filter(role => Object.values(EMPLOYEE_TO_RBAC_MAPPING).flat().includes(role.name))
      .map(role => role.id);

    for (const roleId of currentRoleIds) {
      if (!targetRoleIds.includes(roleId) && autoAssignedRoleIds.includes(roleId)) {
        await advancedRbacService.revokeRole(employee.id, roleId);
      }
    }
    
    // Assign new roles
    for (const roleId of targetRoleIds) {
      if (!currentRoleIds.includes(roleId)) {
        await advancedRbacService.assignRole({
          userId: employee.id,
          roleId: roleId
        });
      }
    }
    
    console.log(`Successfully synced RBAC roles for employee: ${employee.full_name}`);
  } catch (error) {
    console.error(`Failed to sync RBAC for employee ${employee.id}:`, error);
    // Don't throw - we don't want RBAC sync failures to block employee operations
  }
}

/**
 * Get current RBAC role names for an employee
 */
export async function getCurrentRBACRoles(employeeId: string): Promise<string[]> {
  try {
    const userRoles = await advancedRbacService.getUserRoles(employeeId);
    const allRoles = await advancedRbacService.getAllRoles();
    
    return userRoles
      .map(ur => {
        const role = allRoles.find(r => r.id === (ur as any).roleId);
        return role?.name;
      })
      .filter((name): name is string => name !== undefined);
  } catch (error) {
    console.error('Failed to get current RBAC roles:', error);
    return [];
  }
}

export const roleMapperService = {
  getRBACRolesForEmployee,
  getRoleDescription,
  getRBACRoleNamesForEmployee,
  syncEmployeeToRBAC,
  getCurrentRBACRoles
};
