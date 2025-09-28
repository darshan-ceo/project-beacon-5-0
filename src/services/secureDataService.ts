/**
 * Secure Data Service - Enforce RBAC policies on data access
 */

import { policyEngine } from '@/security/policyEngine';
import { Employee } from '@/services/employeesService';
import { type PermissionScope } from '@/persistence/unifiedStore';

export class SecureDataService {
  private currentUserId: string = 'demo-user';
  private currentUserRole: string = 'admin';

  /**
   * Filter data based on user permissions and scope
   */
  async filterData<T extends Record<string, any>>(
    data: T[],
    resource: string,
    action: 'read' | 'write' | 'delete' | 'admin',
    scope: PermissionScope
  ): Promise<T[]> {
    // Simplified demo - always allow access for now
    return this.applyScopeFilter(data, scope);
  }

  /**
   * Apply scope-based filtering to data
   */
  private applyScopeFilter<T extends Record<string, any>>(
    data: T[],
    scope: PermissionScope
  ): T[] {
    switch (scope) {
      case 'own':
        return data.filter(record => 
          record.assignedToId === this.currentUserId ||
          record.createdBy === this.currentUserId ||
          record.ownerId === this.currentUserId
        );
      
      case 'team':
        // Include own + direct reports data
        return data.filter(record => {
          const isOwn = record.assignedToId === this.currentUserId ||
                       record.createdBy === this.currentUserId ||
                       record.ownerId === this.currentUserId;
          
          // Add team logic here - would need employee hierarchy
          return isOwn;
        });
      
      case 'org':
        // Return all data
        return data;
      
      default:
        return [];
    }
  }

  /**
   * Set current user context
   */
  setUserContext(userId: string, role: string): void {
    this.currentUserId = userId;
    this.currentUserRole = role;
  }

  /**
   * Get current user context
   */
  getUserContext(): { userId: string; role: string } {
    return {
      userId: this.currentUserId,
      role: this.currentUserRole
    };
  }

  // Get direct reports for a manager
  getDirectReports(managerId: string, employees: Employee[]): Employee[] {
    return employees.filter(emp => emp.managerId === managerId && emp.status === 'Active');
  }

  // Get all reports (direct and indirect) for a manager  
  getAllReports(managerId: string, employees: Employee[]): Employee[] {
    const directReports = this.getDirectReports(managerId, employees);
    const allReports = [...directReports];
    
    // Recursively get indirect reports
    directReports.forEach(report => {
      const indirectReports = this.getAllReports(report.id, employees);
      allReports.push(...indirectReports);
    });
    
    return allReports;
  }
}

export const secureDataService = new SecureDataService();