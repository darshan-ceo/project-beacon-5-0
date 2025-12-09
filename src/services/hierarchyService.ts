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
  type: 'direct' | 'ownership' | 'team' | 'hierarchy' | 'department';
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
    const activeEmployees = employees.filter(emp => emp.status === 'Active');
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
   * Calculate what data an employee can see based on their position
   */
  calculateVisibility(
    employee: Employee,
    employees: Employee[],
    clients: Client[],
    cases: Case[],
    tasks: Task[]
  ): EmployeeVisibility {
    const role = employee.role;
    const isPartner = role === 'Partner';
    const isCA = role === 'CA';
    const isManager = role === 'Manager';
    const isAdvocate = role === 'Advocate';
    const isStaff = role === 'Staff' || role === 'RM';

    // Get team members (people who report to this employee)
    const teamMemberIds = new Set(
      this.getAllSubordinates(employee.id, employees).map(s => s.id)
    );
    teamMemberIds.add(employee.id);

    // Calculate visible clients
    const visibleClients: VisibleEntity[] = [];
    const getClientName = (client: Client) => (client as any).displayName || (client as any).name || 'Unknown';
    const getClientOwnerId = (client: Client) => (client as any).ownerId || (client as any).owner_id;
    
    if (isPartner || isCA) {
      // Partners and CAs see clients they own
      clients.forEach(client => {
        if (getClientOwnerId(client) === employee.id) {
          visibleClients.push({
            id: client.id,
            name: getClientName(client),
            accessPath: { type: 'ownership', description: 'Owner of this client' }
          });
        } else {
          // They also see all clients in their org (admin-level)
          visibleClients.push({
            id: client.id,
            name: getClientName(client),
            accessPath: { type: 'hierarchy', description: 'Organization-wide visibility' }
          });
        }
      });
    } else if (isManager || isAdvocate) {
      // Managers/Advocates see clients from cases assigned to them or their team
      const relevantCaseClientIds = new Set(
        cases
          .filter(c => c.assignedToId && teamMemberIds.has(c.assignedToId))
          .map(c => c.clientId)
      );
      
      clients.forEach(client => {
        if (relevantCaseClientIds.has(client.id)) {
          visibleClients.push({
            id: client.id,
            name: getClientName(client),
            accessPath: { type: 'team', description: 'Via assigned cases' }
          });
        }
      });
    } else if (isStaff) {
      // Staff see clients only from their directly assigned cases
      const assignedCaseClientIds = new Set(
        cases
          .filter(c => c.assignedToId === employee.id)
          .map(c => c.clientId)
      );
      
      clients.forEach(client => {
        if (assignedCaseClientIds.has(client.id)) {
          visibleClients.push({
            id: client.id,
            name: getClientName(client),
            accessPath: { type: 'direct', description: 'Via assigned case' }
          });
        }
      });
    }

    // Calculate visible cases
    const visibleCases: VisibleEntity[] = [];
    
    if (isPartner || isCA) {
      // Partners/CAs see all cases
      cases.forEach(c => {
        visibleCases.push({
          id: c.id,
          name: c.title || c.caseNumber,
          accessPath: { type: 'hierarchy', description: 'Organization-wide visibility' }
        });
      });
    } else if (isManager || isAdvocate) {
      // Managers/Advocates see cases assigned to them or their team
      cases.forEach(c => {
        if (c.assignedToId === employee.id) {
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'direct', description: 'Directly assigned' }
          });
        } else if (c.assignedToId && teamMemberIds.has(c.assignedToId)) {
          visibleCases.push({
            id: c.id,
            name: c.title || c.caseNumber,
            accessPath: { type: 'team', through: c.assignedToId, description: 'Assigned to team member' }
          });
        }
      });
    } else if (isStaff) {
      // Staff see only their assigned cases
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

    // Calculate visible tasks
    const visibleTasks: VisibleEntity[] = [];
    
    if (isPartner || isCA || isManager) {
      // Partners/CAs/Managers see all tasks or team tasks
      tasks.forEach(task => {
        if (task.assignedToId === employee.id) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'direct', description: 'Directly assigned' }
          });
        } else if (task.assignedById === employee.id) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'ownership', description: 'Created by you' }
          });
        } else if (task.assignedToId && teamMemberIds.has(task.assignedToId)) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'team', through: task.assignedToId, description: 'Assigned to team member' }
          });
        } else if (isPartner || isCA) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'hierarchy', description: 'Organization-wide visibility' }
          });
        }
      });
    } else if (isAdvocate || isStaff) {
      // Advocates/Staff see their own tasks and tasks of colleagues with same manager
      const sameManagerIds = new Set(
        employees
          .filter(e => 
            (e.managerId === employee.managerId || e.reportingTo === employee.reportingTo) &&
            e.status === 'Active'
          )
          .map(e => e.id)
      );
      
      tasks.forEach(task => {
        if (task.assignedToId === employee.id) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'direct', description: 'Directly assigned' }
          });
        } else if (task.assignedById === employee.id) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'ownership', description: 'Created by you' }
          });
        } else if (task.assignedToId && sameManagerIds.has(task.assignedToId)) {
          visibleTasks.push({
            id: task.id,
            name: task.title,
            accessPath: { type: 'team', description: 'Same team (same manager)' }
          });
        }
      });
    }

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
}

export const hierarchyService = new HierarchyService();
