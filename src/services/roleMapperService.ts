/**
 * Role Mapper Service
 * Maps Employee operational roles to RBAC permission roles (app_role enum)
 */

import { supabaseRbacService, AppRole } from './supabaseRbacService';
import { Employee } from './employeesService';
import { toast } from '@/hooks/use-toast';

// Mapping configuration: Employee Role → app_role enum values
// These must match the app_role enum in Supabase exactly
export const EMPLOYEE_TO_RBAC_MAPPING: Record<Employee['role'], AppRole[]> = {
  'Partner': ['partner'],           // Partner-level access
  'CA': ['ca'],                     // Chartered Accountant access
  'Advocate': ['advocate'],         // Legal professional access
  'Manager': ['manager'],           // Team management
  'Staff': ['staff'],               // Basic staff access
  'RM': ['manager'],                // Relationship managers need team visibility
  'Finance': ['manager'],           // Finance needs team visibility
  'Admin': ['admin']                // Full administrative access
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
 * Get RBAC role names for a given employee role
 */
export function getRBACRoleNamesForEmployee(employeeRole: Employee['role']): AppRole[] {
  return EMPLOYEE_TO_RBAC_MAPPING[employeeRole] || ['user'];
}

/**
 * Get role description for UI display
 */
export function getRoleDescription(employeeRole: Employee['role']): string {
  return ROLE_DESCRIPTIONS[employeeRole] || 'Standard employee access';
}

/**
 * Sync employee to RBAC system
 * This assigns appropriate RBAC roles based on the employee's operational role
 * Uses supabaseRbacService to write directly to user_roles table
 */
export async function syncEmployeeToRBAC(employee: Employee): Promise<void> {
  try {
    // Only sync active employees
    if (employee.status !== 'Active') {
      console.log(`Skipping RBAC sync for inactive employee: ${employee.full_name}`);
      return;
    }

    // Get target RBAC roles based on employee role
    const targetRoles = getRBACRoleNamesForEmployee(employee.role);
    
    if (targetRoles.length === 0) {
      console.warn(`No RBAC roles mapped for employee role: ${employee.role}`);
      return;
    }

    // Get current RBAC role assignments from database
    const currentRoles = await supabaseRbacService.getUserRoles(employee.id);
    
    // Get all auto-assignable roles (ones that come from employee role mapping)
    const allAutoAssignableRoles = new Set(
      Object.values(EMPLOYEE_TO_RBAC_MAPPING).flat()
    );

    // Remove roles that should no longer be assigned (only auto-assigned roles)
    for (const currentRole of currentRoles) {
      // Only revoke if it's an auto-assignable role and not in target roles
      if (allAutoAssignableRoles.has(currentRole as AppRole) && !targetRoles.includes(currentRole as AppRole)) {
        try {
          await supabaseRbacService.revokeRole(employee.id, currentRole as AppRole);
          console.log(`Revoked role '${currentRole}' from employee: ${employee.full_name}`);
        } catch (err) {
          console.warn(`Failed to revoke role '${currentRole}':`, err);
        }
      }
    }
    
    // Assign new roles that aren't already assigned
    for (const targetRole of targetRoles) {
      if (!currentRoles.includes(targetRole)) {
        try {
          await supabaseRbacService.assignRole(employee.id, targetRole);
          console.log(`Assigned role '${targetRole}' to employee: ${employee.full_name}`);
        } catch (err: any) {
          // Ignore "already has role" errors
          if (!err.message?.includes('already has this role')) {
            console.warn(`Failed to assign role '${targetRole}':`, err);
          }
        }
      }
    }
    
    console.log(`Successfully synced RBAC roles for employee: ${employee.full_name} -> [${targetRoles.join(', ')}]`);
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
    return await supabaseRbacService.getUserRoles(employeeId);
  } catch (error) {
    console.error('Failed to get current RBAC roles:', error);
    return [];
  }
}

/**
 * Bulk sync all employees to RBAC system
 * Useful for migration or fixing role assignments
 */
export async function bulkSyncEmployeesToRBAC(employees: Employee[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const employee of employees) {
    try {
      await syncEmployeeToRBAC(employee);
      success++;
    } catch (error) {
      console.error(`Failed to sync employee ${employee.id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

export const roleMapperService = {
  getRBACRoleNamesForEmployee,
  getRoleDescription,
  syncEmployeeToRBAC,
  getCurrentRBACRoles,
  bulkSyncEmployeesToRBAC
};
