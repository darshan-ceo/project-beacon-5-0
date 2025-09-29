import { toast } from "@/hooks/use-toast";
import { AppAction } from "@/contexts/AppStateContext";

export interface Employee {
  id: string;
  full_name: string;
  role: 'Partner' | 'CA' | 'Advocate' | 'Manager' | 'Staff' | 'RM' | 'Finance' | 'Admin';
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

// Validation helper
const validateEmployee = (employee: Partial<Employee>, existingEmployees: Employee[], currentId?: string) => {
  const errors: string[] = [];

  if (!employee.full_name?.trim()) {
    errors.push("Full name is required");
  }

  if (!employee.role) {
    errors.push("Role is required");
  }

  if (!employee.email?.trim()) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
    errors.push("Invalid email format");
  } else {
    // Check email uniqueness
    const emailExists = existingEmployees.some(emp => 
      emp.email === employee.email && emp.id !== currentId
    );
    if (emailExists) {
      errors.push("Email already exists");
    }
  }

  if (employee.mobile && employee.mobile.trim()) {
    // Check mobile uniqueness
    const mobileExists = existingEmployees.some(emp => 
      emp.mobile === employee.mobile && emp.id !== currentId
    );
    if (mobileExists) {
      errors.push("Mobile number already exists");
    }
  }

  return errors;
};

export const employeesService = {
  // Create new employee
  create: async (employeeData: Partial<Employee>, dispatch: React.Dispatch<AppAction>, existingEmployees: Employee[]): Promise<Employee> => {
    const errors = validateEmployee(employeeData, existingEmployees);
    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    const newEmployee: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      full_name: employeeData.full_name!,
      role: employeeData.role!,
      email: employeeData.email!,
      mobile: employeeData.mobile,
      status: employeeData.status || 'Active',
      date_of_joining: employeeData.date_of_joining,
      notes: employeeData.notes,
      department: employeeData.department || 'General',
      workloadCapacity: employeeData.workloadCapacity || 40,
      specialization: employeeData.specialization || []
    };

    dispatch({ type: 'ADD_EMPLOYEE', payload: newEmployee });
    
    toast({
      title: "Employee created",
      description: `${newEmployee.full_name} has been added successfully.`,
    });

    return newEmployee;
  },

  // Update existing employee
  update: async (employeeId: string, updates: Partial<Employee>, dispatch: React.Dispatch<AppAction>, existingEmployees: Employee[]): Promise<void> => {
    const errors = validateEmployee(updates, existingEmployees, employeeId);
    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: employeeId, updates } });
    
    toast({
      title: "Employee updated",
      description: "Employee details have been updated successfully.",
    });
  },

  // Soft delete (deactivate) employee
  deactivate: async (employeeId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: employeeId, updates: { status: 'Inactive' } } });
    
    toast({
      title: "Employee deactivated",
      description: "Employee has been deactivated successfully.",
    });
  },

  // Reactivate employee
  activate: async (employeeId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: employeeId, updates: { status: 'Active' } } });
    
    toast({
      title: "Employee activated",
      description: "Employee has been activated successfully.",
    });
  },

  // Delete employee (only if no dependencies)
  delete: async (employeeId: string, dispatch: React.Dispatch<AppAction>, dependencies: string[]): Promise<void> => {
    if (dependencies.length > 0) {
      throw new Error(`Cannot delete employee. Found ${dependencies.length} dependencies: ${dependencies.join(', ')}`);
    }

    dispatch({ type: 'DELETE_EMPLOYEE', payload: employeeId });
    
    toast({
      title: "Employee deleted",
      description: "Employee has been deleted successfully.",
    });
  },

  // Get active employees for dropdowns
  listActive: (employees: Employee[]): Employee[] => {
    return employees.filter(emp => emp.status === 'Active');
  },

  // Get employees by role
  getByRole: (employees: Employee[], role: Employee['role']): Employee[] => {
    return employees.filter(emp => emp.role === role && emp.status === 'Active');
  },

  // Check dependencies before deletion
  checkDependencies: (employeeId: string, cases: any[], tasks: any[], hearings: any[]): string[] => {
    const dependencies: string[] = [];

    // Check cases
    const caseDependencies = cases.filter(c => c.assignedToId === employeeId);
    if (caseDependencies.length > 0) {
      dependencies.push(`${caseDependencies.length} cases`);
    }

    // Check tasks
    const taskDependencies = tasks.filter(t => t.assignedToId === employeeId || t.assignedById === employeeId);
    if (taskDependencies.length > 0) {
      dependencies.push(`${taskDependencies.length} tasks`);
    }

    // Check hearings
    const hearingDependencies = hearings.filter(h => h.responsibleId === employeeId);
    if (hearingDependencies.length > 0) {
      dependencies.push(`${hearingDependencies.length} hearings`);
    }

    return dependencies;
  },

  // Migration helper to map existing dummy data
  migrateDummyData: (cases: any[], tasks: any[], employees: Employee[]): { cases: any[], tasks: any[], report: any } => {
    const migrationReport = {
      timestamp: new Date().toISOString(),
      totalCases: cases.length,
      totalTasks: tasks.length,
      mappedCases: 0,
      mappedTasks: 0,
      unmappedCases: [],
      unmappedTasks: []
    };

    // Simple name mapping strategy
    const nameMapping: Record<string, string> = {};
    employees.forEach(emp => {
      // Try to match by first name or similar patterns
      const firstName = emp.full_name.split(' ')[0].toLowerCase();
      nameMapping[firstName] = emp.id;
      nameMapping[emp.full_name.toLowerCase()] = emp.id;
    });

    // Migrate cases
    const migratedCases = cases.map(case_ => {
      const assignedName = case_.assignedToName?.toLowerCase();
      const mappedId = assignedName ? nameMapping[assignedName] : null;
      
      if (mappedId) {
        migrationReport.mappedCases++;
        return { ...case_, assignedToId: mappedId };
      } else {
        migrationReport.unmappedCases.push({ caseId: case_.id, assignedToName: case_.assignedToName });
        return case_;
      }
    });

    // Migrate tasks
    const migratedTasks = tasks.map(task => {
      const assignedName = task.assignedToName?.toLowerCase();
      const assignedByName = task.assignedByName?.toLowerCase();
      
      const mappedAssignedToId = assignedName ? nameMapping[assignedName] : null;
      const mappedAssignedById = assignedByName ? nameMapping[assignedByName] : null;
      
      let updated = { ...task };
      if (mappedAssignedToId) {
        updated.assignedToId = mappedAssignedToId;
      } else if (task.assignedToName) {
        migrationReport.unmappedTasks.push({ taskId: task.id, assignedToName: task.assignedToName });
      }
      
      if (mappedAssignedById) {
        updated.assignedById = mappedAssignedById;
        migrationReport.mappedTasks++;
      }
      
      return updated;
    });

    return {
      cases: migratedCases,
      tasks: migratedTasks,
      report: migrationReport
    };
  }
};