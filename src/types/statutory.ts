// Statutory Deadline Automation Module Types

export interface StatutoryAct {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface StatutoryEventType {
  id: string;
  tenantId: string;
  actId: string;
  code: string;
  name: string;
  baseDateType: 'notice_date' | 'order_date' | 'receipt_date';
  deadlineType: 'days' | 'months' | 'working_days';
  deadlineCount: number;
  extensionAllowed: boolean;
  maxExtensionCount: number;
  extensionDays: number;
  legalReference?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // Joined field
  actName?: string;
}

export interface Holiday {
  id: string;
  tenantId: string;
  date: string;
  name: string;
  type: 'national' | 'state' | 'optional';
  state: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface CaseStatutoryDeadline {
  id: string;
  tenantId: string;
  caseId: string;
  eventTypeId: string;
  baseDate: string;
  calculatedDeadline: string;
  extensionDeadline?: string;
  extensionCount: number;
  status: 'pending' | 'completed' | 'overdue' | 'extended';
  taskId?: string;
  completedDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  eventTypeName?: string;
  caseName?: string;
}

// Form data types
export interface StatutoryActFormData {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface StatutoryEventTypeFormData {
  actId: string;
  code: string;
  name: string;
  baseDateType: 'notice_date' | 'order_date' | 'receipt_date';
  deadlineType: 'days' | 'months' | 'working_days';
  deadlineCount: number;
  extensionAllowed: boolean;
  maxExtensionCount: number;
  extensionDays: number;
  legalReference?: string;
  description?: string;
  isActive: boolean;
}

export interface HolidayFormData {
  date: string;
  name: string;
  type: 'national' | 'state' | 'optional';
  state: string;
  isActive: boolean;
}

// Constants
export const BASE_DATE_TYPES = [
  { value: 'notice_date', label: 'Notice Date' },
  { value: 'order_date', label: 'Order Date' },
  { value: 'receipt_date', label: 'Receipt Date' }
] as const;

export const DEADLINE_TYPES = [
  { value: 'days', label: 'Days' },
  { value: 'months', label: 'Months' },
  { value: 'working_days', label: 'Working Days' }
] as const;

export const HOLIDAY_TYPES = [
  { value: 'national', label: 'National Holiday' },
  { value: 'state', label: 'State Holiday' },
  { value: 'optional', label: 'Optional Holiday' }
] as const;

export const DEFAULT_STATUTORY_ACTS = [
  { code: 'GST', name: 'Goods & Services Tax Act', description: 'Central and State GST laws and procedures' },
  { code: 'IT', name: 'Income Tax Act', description: 'Income Tax Act, 1961' },
  { code: 'ST', name: 'Service Tax', description: 'Service Tax (Pre-GST regime)' },
  { code: 'TRIBUNAL', name: 'GST Appellate Tribunal', description: 'GSTAT proceedings and appeals' },
  { code: 'HC', name: 'High Court', description: 'High Court matters and writ petitions' },
  { code: 'SC', name: 'Supreme Court', description: 'Supreme Court appeals and SLPs' }
] as const;
