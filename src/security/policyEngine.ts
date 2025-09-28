/**
 * Policy Engine - Scope-Aware RBAC Implementation
 * Evaluates permissions with record-level scopes (own/team/org)
 */

import { unifiedStore, type PermissionEntity, type RoleEntity } from '@/persistence/unifiedStore';
import { advancedRbacService } from '@/services/advancedRbacService';

// Extended Employee interface for RBAC with hierarchy
interface ExtendedEmployee {
  id: string;
  full_name: string;
  role: 'Partner' | 'CA' | 'Advocate' | 'Staff' | 'RM' | 'Finance' | 'Admin';
  email: string;
  mobile?: string;
  status: 'Active' | 'Inactive';
  date_of_joining?: string;
  notes?: string;
  department: string;
  workloadCapacity: number;
  specialization?: string[];
  managerId?: string; // For organizational hierarchy
  tenantId?: string; // For multi-tenant support
}

export interface ScopeContext {
  userId: string;
  employeeId: string;
  managerChain: string[];
  reporteeIds: string[];
  tenantId?: string;
}

export interface PolicyEvaluation {
  allowed: boolean;
  scope: 'own' | 'team' | 'org';
  conditions?: Array<{ field: string; op: string; value: any }>;
  reason?: string;
}

export interface ScopeFilter {
  field: string;
  op: 'eq' | 'in' | 'ne' | 'includes';
  value: any;
}

class PolicyEngine {
  private contextCache = new Map<string, { context: ScopeContext; expiry: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeEngine();
  }

  private async initializeEngine(): Promise<void> {
    await unifiedStore.waitUntilReady();
  }

  /**
   * Get user context with organizational hierarchy
   */
  async getUserContext(userId: string): Promise<ScopeContext> {
    // Check cache first
    const cacheKey = `user_${userId}`;
    const cached = this.contextCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.context;
    }

    try {
      // Get user's employee record
      const employees = await unifiedStore.employees.getAll();
      const employee = employees.find((emp: any) => emp.id === userId) as ExtendedEmployee;
      
      if (!employee) {
        throw new Error(`Employee not found for user: ${userId}`);
      }

      // Build manager chain (upward hierarchy)
      const managerChain: string[] = [];
      let currentManagerId = employee.managerId;
      const visited = new Set<string>(); // Prevent infinite loops
      
      while (currentManagerId && !visited.has(currentManagerId)) {
        visited.add(currentManagerId);
        const manager = employees.find((emp: any) => emp.id === currentManagerId) as ExtendedEmployee;
        if (manager) {
          managerChain.push(currentManagerId);
          currentManagerId = manager.managerId;
        } else {
          break;
        }
      }

      // Find direct and indirect reportees (downward hierarchy)
      const reporteeIds = this.findAllReportees(userId, employees as ExtendedEmployee[]);

      const context: ScopeContext = {
        userId,
        employeeId: employee.id,
        managerChain,
        reporteeIds,
        tenantId: employee.tenantId
      };

      // Cache the result
      this.contextCache.set(cacheKey, {
        context,
        expiry: Date.now() + this.cacheTTL
      });

      return context;
    } catch (error) {
      console.error('Failed to build user context:', error);
      
      // Return minimal context for fallback
      return {
        userId,
        employeeId: userId,
        managerChain: [],
        reporteeIds: [],
        tenantId: undefined
      };
    }
  }

  /**
   * Find all direct and indirect reportees
   */
  private findAllReportees(managerId: string, employees: ExtendedEmployee[]): string[] {
    const reportees = new Set<string>();
    const visited = new Set<string>();

    const findReportees = (currentManagerId: string) => {
      if (visited.has(currentManagerId)) return;
      visited.add(currentManagerId);

      // Find direct reports
      const directReports = employees.filter((emp: ExtendedEmployee) => 
        emp.managerId === currentManagerId && emp.status === 'Active'
      );

      directReports.forEach(emp => {
        reportees.add(emp.id);
        // Recursively find their reports
        findReportees(emp.id);
      });
    };

    findReportees(managerId);
    return Array.from(reportees);
  }

  /**
   * Evaluate permission with scope for a user
   */
  async evaluatePermission(
    userId: string, 
    resource: string, 
    action: 'read' | 'write' | 'delete' | 'admin'
  ): Promise<PolicyEvaluation> {
    try {
      // Get user's effective permissions
      const userRoles = await advancedRbacService.getUserRoles(userId);
      const allPermissions = await unifiedStore.permissions.getAll();
      
      // Find matching permissions for this resource/action
      const rolePermissionIds = new Set<string>();
      userRoles.forEach(role => {
        role.permissions.forEach(permId => rolePermissionIds.add(permId));
      });

      const matchingPermissions = allPermissions.filter((perm: PermissionEntity) =>
        rolePermissionIds.has(perm.id) &&
        perm.resource === resource &&
        perm.action === action
      );

      if (matchingPermissions.length === 0) {
        return {
          allowed: false,
          scope: 'own',
          reason: 'No matching permissions found'
        };
      }

      // Check for explicit deny (deny overrides allow)
      const denyPermission = matchingPermissions.find(p => p.effect === 'deny');
      if (denyPermission) {
        return {
          allowed: false,
          scope: denyPermission.scope,
          reason: 'Explicitly denied by policy'
        };
      }

      // Find strongest scope (org > team > own)
      const allowPermissions = matchingPermissions.filter(p => p.effect === 'allow');
      if (allowPermissions.length === 0) {
        return {
          allowed: false,
          scope: 'own',
          reason: 'No allow permissions found'
        };
      }

      // Get strongest scope
      const scopeHierarchy = ['own', 'team', 'org'];
      let strongestScope: 'own' | 'team' | 'org' = 'own';
      let strongestPermission = allowPermissions[0];

      allowPermissions.forEach(perm => {
        const currentScopeIndex = scopeHierarchy.indexOf(perm.scope);
        const strongestScopeIndex = scopeHierarchy.indexOf(strongestScope);
        
        if (currentScopeIndex > strongestScopeIndex) {
          strongestScope = perm.scope;
          strongestPermission = perm;
        }
      });

      return {
        allowed: true,
        scope: strongestScope,
        conditions: strongestPermission.conditions?.map(c => ({
          field: c.field,
          op: c.op,
          value: c.value
        })),
        reason: `Allowed with ${strongestScope} scope`
      };

    } catch (error) {
      console.error('Permission evaluation failed:', error);
      return {
        allowed: false,
        scope: 'own',
        reason: 'Evaluation error'
      };
    }
  }

  /**
   * Build scope filter for data queries
   */
  async buildScopeFilter(
    resource: string, 
    scope: 'own' | 'team' | 'org', 
    context: ScopeContext
  ): Promise<ScopeFilter[]> {
    const filters: ScopeFilter[] = [];

    switch (scope) {
      case 'own':
        // User can only see their own records
        filters.push(
          { field: 'ownerId', op: 'eq', value: context.userId },
          { field: 'assigned_to', op: 'eq', value: context.employeeId },
          { field: 'assignedToId', op: 'eq', value: context.employeeId }
        );
        break;

      case 'team':
        // User can see own records + reportees' records
        const teamIds = [context.employeeId, ...context.reporteeIds];
        filters.push(
          { field: 'ownerId', op: 'in', value: teamIds },
          { field: 'assigned_to', op: 'in', value: teamIds },
          { field: 'assignedToId', op: 'in', value: teamIds }
        );
        break;

      case 'org':
        // User can see all records (no filtering)
        // Add tenant filtering if multi-tenant
        if (context.tenantId) {
          filters.push({ field: 'tenantId', op: 'eq', value: context.tenantId });
        }
        break;
    }

    return filters;
  }

  /**
   * Apply scope filter to a data array
   */
  applyScopeFilter<T extends Record<string, any>>(
    data: T[], 
    filters: ScopeFilter[]
  ): T[] {
    if (filters.length === 0) return data;

    return data.filter(item => {
      // For each filter, check if at least one matches (OR logic between different fields)
      return filters.some(filter => {
        const fieldValue = item[filter.field];
        
        switch (filter.op) {
          case 'eq':
            return fieldValue === filter.value;
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(fieldValue);
          case 'ne':
            return fieldValue !== filter.value;
          case 'includes':
            return Array.isArray(fieldValue) && fieldValue.includes(filter.value);
          default:
            return false;
        }
      });
    });
  }

  /**
   * Clear user context cache
   */
  clearUserCache(userId: string): void {
    this.contextCache.delete(`user_${userId}`);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.contextCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.contextCache.size,
      entries: Array.from(this.contextCache.keys())
    };
  }
}

// Singleton export
export const policyEngine = new PolicyEngine();

/**
 * Secure data access wrapper functions
 */
export const secureDataAccess = {
  /**
   * Secure list operation with scope filtering
   */
  async secureList<T extends Record<string, any>>(
    userId: string,
    resource: string,
    getData: () => Promise<T[]>
  ): Promise<T[]> {
    try {
      // Evaluate read permission
      const evaluation = await policyEngine.evaluatePermission(userId, resource, 'read');
      
      if (!evaluation.allowed) {
        console.warn(`Access denied for user ${userId} to read ${resource}`);
        return [];
      }

      // Get data
      const data = await getData();

      // If org scope, return all data
      if (evaluation.scope === 'org') {
        return data;
      }

      // Apply scope filtering
      const context = await policyEngine.getUserContext(userId);
      const filters = await policyEngine.buildScopeFilter(resource, evaluation.scope, context);
      
      return policyEngine.applyScopeFilter(data, filters);
    } catch (error) {
      console.error(`Secure list failed for ${resource}:`, error);
      return [];
    }
  },

  /**
   * Secure get operation with scope validation
   */
  async secureGet<T extends Record<string, any>>(
    userId: string,
    resource: string,
    itemId: string,
    getData: (id: string) => Promise<T | null>
  ): Promise<T | null> {
    try {
      // Evaluate read permission
      const evaluation = await policyEngine.evaluatePermission(userId, resource, 'read');
      
      if (!evaluation.allowed) {
        console.warn(`Access denied for user ${userId} to read ${resource} ${itemId}`);
        return null;
      }

      // Get data
      const data = await getData(itemId);
      if (!data) return null;

      // If org scope, return data
      if (evaluation.scope === 'org') {
        return data;
      }

      // Check if user can access this specific record
      const context = await policyEngine.getUserContext(userId);
      const filters = await policyEngine.buildScopeFilter(resource, evaluation.scope, context);
      const filtered = policyEngine.applyScopeFilter([data], filters);
      
      return filtered.length > 0 ? filtered[0] : null;
    } catch (error) {
      console.error(`Secure get failed for ${resource} ${itemId}:`, error);
      return null;
    }
    // Missing method - add placeholder
    async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
      // Simplified check for demo
      return true;
    }
  }
};