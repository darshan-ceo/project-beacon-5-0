import { toast } from "@/hooks/use-toast";
import { AppAction } from "@/contexts/AppStateContext";
import { roleMapperService } from './roleMapperService';
import { normalizeEmployeePayload } from '@/utils/formatters';
import { 
  normalizeAddress, 
  serializeAddress, 
  createAddressFromLegacy,
  isAddressEmpty,
  validateAddress
} from '@/utils/addressUtils';
import { PartialAddress, UnifiedAddress } from '@/types/address';

export interface Employee {
  id: string;
  full_name: string;
  role: 'Partner' | 'CA' | 'Advocate' | 'Manager' | 'Staff' | 'RM' | 'Finance' | 'Admin';
  email: string;
  mobile?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  date_of_joining?: string;
  notes?: string;
  department: string;
  workloadCapacity: number;
  specialization?: string[];
  managerId?: string;
  tenantId?: string;
  
  // Personal Tab
  employeeCode?: string;
  profilePhoto?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  pan?: string;
  aadhaar?: string;
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';
  
  // Contact Tab
  officialEmail?: string;
  personalEmail?: string;
  alternateContact?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  
  // NEW: Unified address (JSONB - takes priority when present)
  address?: UnifiedAddress;
  
  // Employment Tab
  designation?: string;
  reportingTo?: string;
  branch?: string;
  employmentType?: 'Permanent' | 'Contract' | 'Intern' | 'Consultant';
  confirmationDate?: string;
  weeklyOff?: 'Sunday' | 'Alternate Saturday' | 'Custom';
  weeklyOffDays?: string[]; // Array of selected days when weeklyOff is 'Custom'
  workShift?: 'Regular' | 'Remote' | 'Flexible';
  
  // Credentials Tab
  barCouncilNo?: string;
  icaiNo?: string;
  gstPractitionerId?: string;
  qualification?: string;
  experienceYears?: number;
  areasOfPractice?: string[];
  university?: string;
  graduationYear?: number;
  
  // Billing Tab
  billingRate?: number;
  billable?: boolean;
  defaultTaskCategory?: string;
  incentiveEligible?: boolean;
  
  // Access Tab
  moduleAccess?: string[];
  dataScope?: 'Own Cases' | 'Team Cases' | 'All Cases';
  aiAccess?: boolean;
  whatsappAccess?: boolean;
  
  // Documents Tab (DMS references)
  documents?: {
    resume?: string;
    idProof?: string;
    addressProof?: string;
    barOrIcaiCert?: string;
    nda?: string;
    offerLetter?: string;
  };
  
  // Audit Tab
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// Auto-generate employee code
const generateEmployeeCode = (existingEmployees: Employee[]): string => {
  const prefix = 'GSTE';
  const existingCodes = existingEmployees
    .map(e => e.employeeCode)
    .filter(code => code?.startsWith(prefix))
    .map(code => parseInt(code?.substring(4) || '0'))
    .filter(num => !isNaN(num));
  
  const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
};

// Validation helper
const validateEmployee = (employee: Partial<Employee>, existingEmployees: Employee[], currentId?: string) => {
  const errors: string[] = [];

  if (!employee.full_name?.trim()) {
    errors.push("Full name is required");
  }

  if (!employee.role) {
    errors.push("Role is required");
  }

  if (!employee.department?.trim()) {
    errors.push("Department is required");
  }

  if (!employee.date_of_joining) {
    errors.push("Joining date is required");
  }

  // Email validation (official email or email field)
  const emailToCheck = employee.officialEmail || employee.email;
  if (!emailToCheck?.trim()) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToCheck)) {
    errors.push("Invalid email format");
  } else {
    const emailExists = existingEmployees.some(emp => 
      (emp.officialEmail === emailToCheck || emp.email === emailToCheck) && emp.id !== currentId
    );
    if (emailExists) {
      errors.push("Email already exists");
    }
  }

  if (employee.mobile && employee.mobile.trim()) {
    const mobileExists = existingEmployees.some(emp => 
      emp.mobile === employee.mobile && emp.id !== currentId
    );
    if (mobileExists) {
      errors.push("Mobile number already exists");
    }
  }

  // PAN validation
  if (employee.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(employee.pan)) {
    errors.push("Invalid PAN format. Required: AAAAA9999A");
  }

  // Pincode validation (legacy field)
  if (employee.pincode && !/^\d{6}$/.test(employee.pincode)) {
    errors.push("Invalid pincode. Must be 6 digits");
  }
  
  // Unified address validation (if provided)
  if (employee.address && !isAddressEmpty(employee.address)) {
    const addressValidation = validateAddress(employee.address, 'employee');
    if (!addressValidation.isValid) {
      addressValidation.errors.forEach(err => errors.push(err.message));
    }
  }

  // Billing rate validation
  if (employee.billingRate !== undefined && employee.billingRate < 0) {
    errors.push("Billing rate must be non-negative");
  }

  return errors;
};

export const employeesService = {
  // Create new employee
  create: async (employeeData: Partial<Employee>, dispatch: React.Dispatch<AppAction>, existingEmployees: Employee[]): Promise<Employee> => {
    // Normalize payload before persistence
    const normalizedData = normalizeEmployeePayload(employeeData);

    // Auto-generate employee code if not provided
    if (!normalizedData.employeeCode) {
      normalizedData.employeeCode = generateEmployeeCode(existingEmployees);
    }

    // Set officialEmail as primary email if email not provided
    if (!normalizedData.email && normalizedData.officialEmail) {
      normalizedData.email = normalizedData.officialEmail;
    }

    const errors = validateEmployee(normalizedData, existingEmployees);
    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    const now = new Date().toISOString();
    const newEmployee: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      full_name: employeeData.full_name!,
      role: employeeData.role!,
      email: employeeData.email || employeeData.officialEmail!,
      mobile: employeeData.mobile,
      status: employeeData.status || 'Active',
      date_of_joining: employeeData.date_of_joining,
      notes: employeeData.notes,
      department: employeeData.department!,
      workloadCapacity: employeeData.workloadCapacity || 40,
      specialization: employeeData.specialization || [],
      ...employeeData,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
      billingRate: employeeData.billingRate || 0,
      billable: employeeData.billable !== undefined ? employeeData.billable : true,
    };

    // Persist to storage
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();
      await storage.create('employees', {
        id: newEmployee.id,
        employee_code: newEmployee.employeeCode,
        email: newEmployee.email,
        role: newEmployee.role,
        full_name: newEmployee.full_name,
        mobile: newEmployee.mobile,
        status: newEmployee.status,
        date_of_joining: newEmployee.date_of_joining ? new Date(newEmployee.date_of_joining) : undefined,
        department: newEmployee.department,
        workload_capacity: newEmployee.workloadCapacity,
        billing_rate: newEmployee.billingRate || 0,
        billable: newEmployee.billable,
        // NEW: Unified address JSONB
        address: newEmployee.address ? serializeAddress(newEmployee.address) : null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch (storageError) {
      console.error('Failed to persist employee to storage:', storageError);
    }

    dispatch({ type: 'ADD_EMPLOYEE', payload: newEmployee });
    
    // Sync RBAC roles (non-blocking)
    roleMapperService.syncEmployeeToRBAC(newEmployee).catch(err => 
      console.error('RBAC sync failed for new employee:', err)
    );
    
    toast({
      title: "Employee created",
      description: `${newEmployee.full_name} (${newEmployee.employeeCode}) has been added successfully.`,
    });

    return newEmployee;
  },

  // Update existing employee
  update: async (employeeId: string, updates: Partial<Employee>, dispatch: React.Dispatch<AppAction>, existingEmployees: Employee[]): Promise<void> => {
    // Set officialEmail as primary email if email not provided
    if (!updates.email && updates.officialEmail) {
      updates.email = updates.officialEmail;
    }

    const errors = validateEmployee(updates, existingEmployees, employeeId);
    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    const currentEmployee = existingEmployees.find(emp => emp.id === employeeId);
    const roleChanged = updates.role && currentEmployee && updates.role !== currentEmployee.role;

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };

    // Persist to storage
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();
      await storage.update('employees', employeeId, {
        ...updates,
        email: updates.email || updates.officialEmail,
        status: updates.status,
        // NEW: Serialize unified address if provided
        ...(updates.address && { address: serializeAddress(updates.address as PartialAddress) }),
        updated_at: new Date(),
      });
    } catch (storageError) {
      console.error('Failed to update employee in storage:', storageError);
    }

    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: employeeId, updates: updatedData } });
    
    // If role changed, sync RBAC roles (non-blocking)
    if (roleChanged && currentEmployee) {
      const updatedEmployee = { ...currentEmployee, ...updatedData };
      roleMapperService.syncEmployeeToRBAC(updatedEmployee as Employee).catch(err => 
        console.error('RBAC sync failed for updated employee:', err)
      );
    }
    
    toast({
      title: "Employee updated",
      description: "Employee details have been updated successfully.",
    });
  },

  // Soft delete (deactivate) employee
  deactivate: async (employeeId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    // Persist to storage
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();
      await storage.update('employees', employeeId, {
        status: 'Inactive',
        updated_at: new Date(),
      } as any);
    } catch (storageError) {
      console.error('Failed to deactivate employee in storage:', storageError);
    }

    dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id: employeeId, updates: { status: 'Inactive' } } });
    
    toast({
      title: "Employee deactivated",
      description: "Employee has been deactivated successfully.",
    });
  },

  // Reactivate employee
  activate: async (employeeId: string, dispatch: React.Dispatch<AppAction>): Promise<void> => {
    // Persist to storage
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();
      await storage.update('employees', employeeId, {
        status: 'Active',
        updated_at: new Date(),
      } as any);
    } catch (storageError) {
      console.error('Failed to activate employee in storage:', storageError);
    }

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

    // Persist to storage
    try {
      const { storageManager } = await import('@/data/StorageManager');
      const storage = storageManager.getStorage();
      await storage.delete('employees', employeeId);
    } catch (storageError) {
      console.error('Failed to delete employee from storage:', storageError);
      throw storageError;
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
  },

  /**
   * Get address from employee with legacy fallback
   * Priority: address (JSONB) > legacy fields (currentAddress/city/state)
   */
  getEmployeeAddress: (emp: Partial<Employee>): UnifiedAddress | null => {
    // Priority 1: New unified JSONB address
    if (emp.address && !isAddressEmpty(emp.address)) {
      return normalizeAddress(emp.address);
    }
    
    // Priority 2: Legacy TEXT fields
    if (emp.currentAddress || emp.city || emp.state) {
      return createAddressFromLegacy(
        emp.currentAddress || null,
        emp.city || null,
        emp.state || null,
        emp.pincode || null
      );
    }
    
    return null;
  }
};