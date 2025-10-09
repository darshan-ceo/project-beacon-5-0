/**
 * Employee Export Configuration
 * Defines column schemas for employee data exports
 */

import { Employee } from '@/contexts/AppStateContext';
import { ExportColumn } from './client';

export const EMPLOYEE_EXPORT_COLUMNS: ExportColumn<Employee>[] = [
  { key: 'id', label: 'Employee ID', type: 'string' },
  { key: 'full_name', label: 'Full Name', type: 'string' },
  { key: 'email', label: 'Email', type: 'email' },
  { 
    key: 'mobile', 
    label: 'Phone', 
    type: 'phone',
    get: (employee) => employee.mobile || 'N/A'
  },
  { key: 'role', label: 'Role', type: 'string' },
  { key: 'department', label: 'Department', type: 'string' },
  { key: 'status', label: 'Status', type: 'string' },
  { 
    key: 'date_of_joining', 
    label: 'Date of Joining', 
    type: 'date', 
    format: 'dd-MM-yyyy',
    get: (employee) => employee.date_of_joining || ''
  },
  { 
    key: 'specialization', 
    label: 'Specialization', 
    type: 'string',
    get: (employee) => {
      if (Array.isArray(employee.specialization) && employee.specialization.length > 0) {
        return employee.specialization.join(', ');
      }
      return 'N/A';
    }
  },
  { 
    key: 'workloadCapacity', 
    label: 'Workload Capacity', 
    type: 'number',
    get: (employee) => employee.workloadCapacity || 0
  },
  { 
    key: 'managerId', 
    label: 'Manager ID', 
    type: 'string',
    get: (employee) => employee.managerId || 'N/A'
  },
  { 
    key: 'notes', 
    label: 'Notes', 
    type: 'string',
    get: (employee) => employee.notes || ''
  },
];

// Define default visible columns (for "Export visible only" feature)
export const EMPLOYEE_VISIBLE_COLUMNS = [
  'full_name', 
  'email', 
  'mobile', 
  'role', 
  'department', 
  'status',
  'date_of_joining'
];
