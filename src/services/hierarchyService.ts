/**
 * Hierarchy Service
 * Calculates access chains, visibility, and team relationships
 */

import { Employee, Case, Client, Task } from '@/contexts/AppStateContext';
import { supabaseRbacService } from './supabaseRbacService';

export interface HierarchyNode {
  employee: Employee;
  directReports: HierarchyNode[];
  level: number;
  totalReports: number;
}

export interface AccessPath {
  type: 'direct' | 'ownership' | 'team' | 'hierarchy' | 'department' | 'manager';
  through?: string;
  description: string;
}

export interface VisibleEntity {
  id: string;
  name: string;
  accessPath: AccessPath;
}

export interface EmployeeVisibility {
  clients: VisibleEntity[];
  cases: VisibleEntity[];
  tasks: VisibleEntity[];
  totalClients: number;
  totalCases: number;
  totalTasks: number;
}

export interface AccessChain {
  employeeId: string;
  employeeName: string;
  roles: string[];
  reportsTo: { id: string; name: string; role: string } | null;
  directReports: { id: string; name: string; role: string }[];
  allSubordinates: { id: string; name: string; role: string; level: number }[];
  visibility: EmployeeVisibility;
}

export interface TeamStatistics {
  totalEmployees: number;
  managersCount: number;
  maxLevels: number;
  avgTeamSize: number;
  roleDistribution: Record<string, number>;
}

class HierarchyService {
  /**
   * Build hierarchy tree from flat employee list
   */
  buildHierarchy(employees: Employee[]): HierarchyNode[] {
    console.log('[HierarchyService] Building hierarchy with employees:', {
      total: employees.length,
      statuses: employees.reduce((acc, e) => {
        acc[e.status] = (acc[e.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sample: employees.slice(0, 3).map(e => ({
        id: e.id,
        name: e.full_name,
        status: e.status,
        role: e.role,
        reportingTo: e.reportingTo,
        managerId: e.managerId
      }))
    });
    
    // Filter for active employees - case-insensitive status check
    const activeEmployees = employees.filter(emp => 
      emp.status?.toLowerCase() === 'active' || emp.status === 'Active'
    );
    
    console.log('[HierarchyService] Active employees after filter:', {
      count: activeEmployees.length,
      employees: activeEmployees.map(e => ({
        name: e.full_name,
        role: e.role,
        reportingTo: e.reportingTo,
        managerId: e.managerId
      }))
    });
    
    const employeeMap = new Map<string, Employee>();
    
    activeEmployees.forEach(emp => employeeMap.set(emp.id, emp));

    const buildNode = (employee: Employee, level: number = 0): HierarchyNode => {
      const directReports = activeEmployees
        .filter(emp => emp.managerId === employee.id || emp.reportingTo === employee.id)
        .map(emp => buildNode(emp, level + 1))
        .sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name));

      const totalReports = this.countAllReports(directReports);

      return {
        employee,
        directReports,
        level,
        totalReports
      };
    };

    // Find root employees (no manager/reportingTo)
    const rootEmployees = activeEmployees
      .filter(emp => !emp.managerId && !emp.reportingTo)
      .sort((a, b) => {
        const roleOrder: Record<string, number> = { 'Partner': 0, 'CA': 1, 'Manager': 2 };
        const aOrder = roleOrder[a.role] ?? 99;
        const bOrder = roleOrder[b.role] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.full_name.localeCompare(b.full_name);
      });

    console.log('[HierarchyService] Root employees (no manager):', {
      count: rootEmployees.length,
      names: rootEmployees.map(e => e.full_name)
    });
    
    console.log('[HierarchyService] Employees with managers:', {
      count: activeEmployees.filter(e => e.managerId || e.reportingTo).length,
      employees: activeEmployees.filter(e => e.managerId || e.reportingTo).map(e => ({
        name: e.full_name,
        reportingTo: e.reportingTo,
        managerId: e.managerId
      }))
    });

    return rootEmployees.map(emp => buildNode(emp));
  }

  private countAllReports(nodes: HierarchyNode[]): number {
    return nodes.reduce((sum, node) => sum + 1 + this.countAllReports(node.directReports), 0);
  }

  /**
   * Get access chain for an employee - their complete access path
   */
  async getAccessChain(
    employeeId: string,
    employees: Employee[],
    clients: Client[],
    cases: Case[],
    tasks: Task[]
  ): Promise<AccessChain> {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Get RBAC roles
    const roles = await supabaseRbacService.getUserRoles(employeeId);

    // Find manager (reports to)
    const manager = employees.find(e => 
      e.id === employee.managerId || e.id === employee.reportingTo
    );

    // Find direct reports
    const directReports = employees
      .filter(e => (e.managerId === employeeId || e.reportingTo === employeeId) && e.status === 'Active')
      .map(e => ({ id: e.id, name: e.full_name, role: e.role }));

    // Find all subordinates recursively
    const allSubordinates = this.getAllSubordinates(employeeId, employees);

    // Calculate visibility
    const visibility = this.calculateVisibility(employee, employees, clients, cases, tasks);

    return {
      employeeId,
      employeeName: employee.full_name,
      roles,
      reportsTo: manager ? { id: manager.id, name: manager.full_name, role: manager.role } : null,
      directReports,
      allSubordinates,
      visibility
    };
  }

  /**
   * Get all subordinates recursively with their levels
   */
  private getAllSubordinates(
    employeeId: string,
    employees: Employee[],
    level: number = 1
  ): { id: string; name: string; role: string; level: number }[] {
    const directReports = employees.filter(
      e => (e.managerId === employeeId || e.reportingTo === employeeId) && e.status === 'Active'
    );

    const result: { id: string; name: string; role: string; level: number }[] = [];
    
    for (const report of directReports) {
      result.push({ id: report.id, name: report.full_name, role: report.role, level });
      result.push(...this.getAllSubordinates(report.id, employees, level + 1));
    }

    return result;
  }

  /**
   * Calculate what data an employee can see based on their dataScope setting
   * This must respect the employee's dataScope from Employee Master:
   * - 'All Cases': See all organization data
   * - 'Team Cases': See own + team/subordinate data
   * - 'Own Cases': See only directly assigned/owned data
   */
  /**
   * Normalize dataScope value from various formats to standard display values
   * Handles: snake_case from DB, legacy enum values, undefined/null
   */
  private normalizeDataScope(rawScope: string | undefined | null): 'Own Cases' | 'Team Cases' | 'All Cases' {
    if (!rawScope) return 'Own Cases';
    
    const normalized = rawScope.toLowerCase().trim();
    
    // Handle legacy enum values
    if (normalized === 'own' || normalized === 'own cases' || normalized === 'own_cases') return 'Own Cases';
    if (normalized === 'team' || normalized === 'team cases' || normalized === 'team_cases') return 'Team Cases';
    if (normalized === 'all' || normalized === 'all cases' || normalized === 'all_cases') return 'All Cases';
    
    // If it matches display values directly
    if (rawScope === 'Own Cases' || rawScope === 'Team Cases' || rawScope === 'All Cases') {
      return rawScope as 'Own Cases' | 'Team Cases' | 'All Cases';
    }
    
    return 'Own Cases'; // Default fallback
  }

  /**
   * Get effective data scope for an employee, checking both camelCase and snake_case fields
   */
  getEmployeeDataScope(employee: Employee): 'Own Cases' | 'Team Cases' | 'All Cases' {
    // Check both camelCase (JS) and snake_case (DB) field names
    const rawScope = employee.dataScope || (employee as any).data_scope;
    return this.normalizeDataScope(rawScope);
  }

  calculateVisibility(
    employee: Employee,
    employees: Employee[],
    clients: Client[],
    cases: Case[],
    tasks: Task[]
  ): EmployeeVisibility {
    const role = employee.role;
    // CRITICAL FIX: Check both camelCase and snake_case, then normalize
    const dataScope = this.getEmployeeDataScope(employee);
    
    // Admin/Partner override - they always get 'All Cases' access
    const isPartnerOrAdmin = role === 'Partner' || role === 'Admin';
    const effectiveScope = isPartnerOrAdmin ? 'All Cases' : dataScope;
    
    console.log('[HierarchyService] Calculating visibility for:', {
      employee: employee.full_name,
      role: employee.role,
      rawDataScope: employee.dataScope,
      rawData_scope: (employee as any).data_scope,
      normalizedDataScope: dataScope,
      effectiveScope
    });

    // Get team members (people who report to this employee) for Team Cases scope
    const subordinateIds = new Set(
      this.getAllSubordinates(employee.id, employees).map(s => s.id)
    );
    
    // Get the manager's ID (the person this employee reports to)
    const managerId = employee.reportingTo || employee.managerId;
    
    // CRITICAL FIX: Build manager chain (upward visibility - manager, manager's manager, etc.)
    const managerChainIds = new Set<string>();
    let currentManagerId = managerId;
    while (currentManagerId) {
      managerChainIds.add(currentManagerId);
      const manager = employees.find(e => e.id === currentManagerId);
      currentManagerId = manager?.reportingTo || manager?.managerId;
      if (managerChainIds.size > 5) break; // Safety limit
    }
    
    // Get same-team colleagues (people with same manager)
    const sameManagerIds = new Set(
      employees
        .filter(e => 
          e.status?.toLowerCase() === 'active' &&
          (e.managerId === employee.managerId || e.reportingTo === employee.reportingTo) &&
          (employee.managerId || employee.reportingTo) // Only if employee has a manager
        )
        .map(e => e.id)
    );

    // CRITICAL: For "Team Cases", include the entire manager chain
    // This allows staff to see cases/clients/tasks assigned to their manager and above
    const managerAndTeamIds = new Set([
      ...sameManagerIds,
      ...managerChainIds
    ]);

    // Combine for "team" - self + subordinates + same-manager colleagues + manager chain
    const teamMemberIds = new Set([employee.id, ...subordinateIds, ...managerAndTeamIds]);

    // Calculate visible cases based on dataScope
    const visibleCases: VisibleEntity[] = [];
    
    if (effectiveScope === 'All Cases') {
      // Full organization access
      cases.forEach(c => {
        const accessType = c.assignedToId === employee.id ? 'direct' : 'hierarchy';
        visibleCases.push({
          id: c.id,
          name: c.title || c.caseNumber,
          accessPath: { 
            type: accessType, 
            description: accessType === 'direct' ? 'Directly assigned' : 'Organization-wide visibility (All Cases scope)' 
          }
        });
      });
    } else if (effectiveScope === 'Team Cases') {
      // Own cases + team/subordinate cases + manager's cases
      cases.forEach(c => {
        const caseOwnerId = (c as any).ownerId || (c as any).owner_id;
        
        if (c.assignedToId === employee.id || caseOwnerId === employee.id) {
          // Direct assignment or ownership
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'direct', description: 'Directly assigned/owned' }
          });
        } else if (c.assignedToId && subordinateIds.has(c.assignedToId)) {
          // Subordinate's case
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'hierarchy', through: c.assignedToId, description: 'Assigned to subordinate' }
          });
        } else if (c.assignedToId && managerChainIds.has(c.assignedToId)) {
          // CRITICAL FIX: Case assigned to someone in manager chain (manager, manager's manager, etc.)
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'manager', through: c.assignedToId, description: 'Assigned to manager chain' }
          });
        } else if (caseOwnerId && managerChainIds.has(caseOwnerId)) {
          // Case owned by someone in manager chain
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'manager', through: caseOwnerId, description: 'Owned by manager chain' }
          });
        } else if (c.assignedToId && sameManagerIds.has(c.assignedToId)) {
          // Teammate's case
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'team', through: c.assignedToId, description: 'Assigned to team member (same manager)' }
          });
        } else if (caseOwnerId && (subordinateIds.has(caseOwnerId) || sameManagerIds.has(caseOwnerId))) {
          // Case owned by team member
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'team', through: caseOwnerId, description: 'Owned by team member' }
          });
        }
      });
    } else {
      // 'Own Cases' - most restrictive
      cases.forEach(c => {
        if (c.assignedToId === employee.id) {
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'direct', description: 'Directly assigned' }
          });
        }
      });
    }

    // Calculate visible clients - inherited from visible cases
    const visibleCaseClientIds = new Set(visibleCases.map(c => {
      const caseData = cases.find(cs => cs.id === c.id);
      return caseData?.clientId;
    }).filter(Boolean));
    
    const visibleClients: VisibleEntity[] = [];
    const getClientName = (client: Client) => (client as any).displayName || (client as any).name || 'Unknown';
    const getClientOwnerId = (client: Client) => (client as any).ownerId || (client as any).owner_id;
    
    clients.forEach(client => {
      const clientOwnerId = getClientOwnerId(client);
      
      if (clientOwnerId === employee.id) {
        visibleClients.push({
          id: client.id,
          name: getClientName(client),
          accessPath: { type: 'ownership', description: 'Owner of this client' }
        });
      } else if (visibleCaseClientIds.has(client.id)) {
        visibleClients.push({
          id: client.id,
          name: getClientName(client),
          accessPath: { type: 'hierarchy', description: 'Via visible case (inherited from case visibility)' }
        });
      } else if (effectiveScope === 'Team Cases' && clientOwnerId && managerChainIds.has(clientOwnerId)) {
        // CRITICAL FIX: Client owned by someone in manager chain
        visibleClients.push({
          id: client.id,
          name: getClientName(client),
          accessPath: { type: 'manager', description: 'Owned by manager chain' }
        });
      } else if (effectiveScope === 'Team Cases' && clientOwnerId && (subordinateIds.has(clientOwnerId) || sameManagerIds.has(clientOwnerId))) {
        // Client owned by team member
        visibleClients.push({
          id: client.id,
          name: getClientName(client),
          accessPath: { type: 'team', description: 'Owned by team member' }
        });
      } else if (effectiveScope === 'All Cases') {
        visibleClients.push({
          id: client.id,
          name: getClientName(client),
          accessPath: { type: 'hierarchy', description: 'Organization-wide visibility (All Cases scope)' }
        });
      }
    });

    // Calculate visible tasks - based on case visibility + direct assignment
    const visibleCaseIds = new Set(visibleCases.map(c => c.id));
    const visibleTasks: VisibleEntity[] = [];
    
    tasks.forEach(task => {
      // Always see tasks assigned to self
      if (task.assignedToId === employee.id) {
        visibleTasks.push({
          id: task.id,
          name: task.title,
          accessPath: { type: 'direct', description: 'Directly assigned' }
        });
      }
      // Always see tasks created by self
      else if (task.assignedById === employee.id) {
        visibleTasks.push({
          id: task.id,
          name: task.title,
          accessPath: { type: 'ownership', description: 'Created by you' }
        });
      }
      // See tasks from visible cases (inherited visibility)
      else if (task.caseId && visibleCaseIds.has(task.caseId)) {
        visibleTasks.push({
          id: task.id,
          name: task.title,
          accessPath: { type: 'hierarchy', description: 'Via visible case (inherited from case visibility)' }
        });
      }
      // For All Cases scope, see all tasks
      else if (effectiveScope === 'All Cases') {
        visibleTasks.push({
          id: task.id,
          name: task.title,
          accessPath: { type: 'hierarchy', description: 'Organization-wide visibility (All Cases scope)' }
        });
      }
      // For Team Cases scope, also see manager/subordinate/team tasks
      else if (effectiveScope === 'Team Cases') {
        if (task.assignedToId && managerChainIds.has(task.assignedToId)) {
          // CRITICAL FIX: Task assigned to someone in manager chain
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'manager', description: 'Assigned to manager chain' }
          });
        } else if (task.assignedToId && subordinateIds.has(task.assignedToId)) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'hierarchy', through: task.assignedToId, description: 'Assigned to subordinate' }
          });
        } else if (task.assignedToId && sameManagerIds.has(task.assignedToId)) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'team', description: 'Assigned to team member (same manager)' }
          });
        }
      }
    });

    console.log('[HierarchyService] Visibility calculated:', {
      employee: employee.full_name,
      dataScope: effectiveScope,
      visibleCases: visibleCases.length,
      visibleClients: visibleClients.length,
      visibleTasks: visibleTasks.length,
      totalCases: cases.length,
      totalClients: clients.length,
      totalTasks: tasks.length
    });

    return {
      clients: visibleClients,
      cases: visibleCases,
      tasks: visibleTasks,
      totalClients: clients.length,
      totalCases: cases.length,
      totalTasks: tasks.length
    };
  }

  /**
   * Calculate team statistics
   */
  getTeamStatistics(employees: Employee[], hierarchy: HierarchyNode[]): TeamStatistics {
    const activeEmployees = employees.filter(e => e.status === 'Active');
    
    // Count managers (anyone with direct reports)
    const managersCount = activeEmployees.filter(emp =>
      activeEmployees.some(e => e.managerId === emp.id || e.reportingTo === emp.id)
    ).length;

    // Calculate max levels
    const getMaxLevel = (node: HierarchyNode): number => {
      if (node.directReports.length === 0) return node.level;
      return Math.max(node.level, ...node.directReports.map(getMaxLevel));
    };
    const maxLevels = hierarchy.length > 0 
      ? Math.max(...hierarchy.map(getMaxLevel)) + 1 
      : 0;

    // Calculate average team size
    const teamsizes = activeEmployees
      .map(emp => activeEmployees.filter(e => e.managerId === emp.id || e.reportingTo === emp.id).length)
      .filter(size => size > 0);
    const avgTeamSize = teamsizes.length > 0 
      ? teamsizes.reduce((a, b) => a + b, 0) / teamsizes.length 
      : 0;

    // Role distribution
    const roleDistribution = activeEmployees.reduce((acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEmployees: activeEmployees.length,
      managersCount,
      maxLevels,
      avgTeamSize: Math.round(avgTeamSize * 10) / 10,
      roleDistribution
    };
  }

  /**
   * Find manager chain upwards (who they report to)
   */
  getManagerChain(employeeId: string, employees: Employee[]): Employee[] {
    const chain: Employee[] = [];
    let currentId = employeeId;
    
    while (currentId) {
      const employee = employees.find(e => e.id === currentId);
      if (!employee) break;
      
      const managerId = employee.managerId || employee.reportingTo;
      if (!managerId) break;
      
      const manager = employees.find(e => e.id === managerId);
      if (!manager || chain.some(e => e.id === manager.id)) break;
      
      chain.push(manager);
      currentId = managerId;
    }
    
    return chain;
  }

  /**
   * Get the access path for a specific entity (case, task, etc.)
   * Returns the access path explaining HOW the user can access this item
   */
  getAccessPathForEntity(
    entityId: string,
    entityType: 'case' | 'task' | 'client',
    visibility: EmployeeVisibility
  ): AccessPath | null {
    const collection = entityType === 'case' ? visibility.cases :
                       entityType === 'task' ? visibility.tasks :
                       visibility.clients;
    
    const entity = collection.find(e => e.id === entityId);
    return entity?.accessPath || null;
  }

  /**
   * Get user's visibility summary for quick stats
   */
  getVisibilitySummary(visibility: EmployeeVisibility): {
    directCases: number;
    managerCases: number;
    teamCases: number;
    hierarchyCases: number;
    totalAccessibleCases: number;
    totalAccessibleTasks: number;
    totalAccessibleClients: number;
  } {
    const countByType = (items: VisibleEntity[], type: AccessPath['type']) =>
      items.filter(i => i.accessPath.type === type).length;

    return {
      directCases: countByType(visibility.cases, 'direct'),
      managerCases: countByType(visibility.cases, 'manager'),
      teamCases: countByType(visibility.cases, 'team'),
      hierarchyCases: countByType(visibility.cases, 'hierarchy'),
      totalAccessibleCases: visibility.cases.length,
      totalAccessibleTasks: visibility.tasks.length,
      totalAccessibleClients: visibility.clients.length,
    };
  }
}

export const hierarchyService = new HierarchyService();
