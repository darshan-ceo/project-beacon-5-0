/**
 * Employee to RBAC Migration Script
 * Syncs all existing active employees to RBAC system
 */

import { Employee } from '@/services/employeesService';
import { roleMapperService } from '@/services/roleMapperService';

export interface MigrationResult {
  totalEmployees: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: Array<{ employeeId: string; employeeName: string; error: string }>;
  timestamp: string;
}

/**
 * Migrate all employees to RBAC system
 */
export async function migrateEmployeesToRBAC(employees: Employee[]): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalEmployees: employees.length,
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };

  console.log(`Starting RBAC migration for ${employees.length} employees...`);

  for (const employee of employees) {
    try {
      // Skip inactive employees
      if (employee.status !== 'Active') {
        result.skipped++;
        console.log(`Skipped inactive employee: ${employee.full_name}`);
        continue;
      }

      // Sync employee to RBAC
      await roleMapperService.syncEmployeeToRBAC(employee);
      result.synced++;
      console.log(`✓ Synced ${employee.full_name} (${employee.role})`);
      
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        employeeId: employee.id,
        employeeName: employee.full_name,
        error: errorMessage
      });
      console.error(`✗ Failed to sync ${employee.full_name}:`, errorMessage);
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Total: ${result.totalEmployees}`);
  console.log(`Synced: ${result.synced}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Failed: ${result.failed}`);
  
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(err => {
      console.log(`- ${err.employeeName}: ${err.error}`);
    });
  }

  return result;
}

/**
 * Check migration status for a list of employees
 */
export async function checkMigrationStatus(employees: Employee[]): Promise<{
  total: number;
  withRoles: number;
  withoutRoles: number;
  unmappedEmployees: Array<{ id: string; name: string; role: string }>;
}> {
  const result = {
    total: employees.length,
    withRoles: 0,
    withoutRoles: 0,
    unmappedEmployees: [] as Array<{ id: string; name: string; role: string }>
  };

  for (const employee of employees) {
    if (employee.status !== 'Active') continue;

    try {
      const rbacRoles = await roleMapperService.getCurrentRBACRoles(employee.id);
      
      if (rbacRoles.length > 0) {
        result.withRoles++;
      } else {
        result.withoutRoles++;
        result.unmappedEmployees.push({
          id: employee.id,
          name: employee.full_name,
          role: employee.role
        });
      }
    } catch (error) {
      console.error(`Failed to check RBAC status for ${employee.full_name}:`, error);
    }
  }

  return result;
}
