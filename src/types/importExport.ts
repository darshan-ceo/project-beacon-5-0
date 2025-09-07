/**
 * Import/Export Types for Contacts & Masters
 * Provides comprehensive type definitions for data import/export operations
 */

export type EntityType = 'court' | 'client' | 'judge' | 'employee';

export interface ImportJob {
  id: string;
  entityType: EntityType;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userId: string;
  createdAt: string;
  updatedAt: string;
  counts: {
    total: number;
    valid: number;
    invalid: number;
    processed: number;
  };
  mapping?: ColumnMapping;
  errors?: ImportError[];
}

export interface ColumnMapping {
  [templateColumn: string]: {
    sourceColumn: string;
    confidence: number;
    isRequired: boolean;
    dataType: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select';
    validationRules?: ValidationRule[];
  };
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'pincode' | 'gstin' | 'pan' | 'custom';
  message: string;
  pattern?: string;
}

export interface ImportError {
  id: string;
  jobId: string;
  row: number;
  column: string;
  value: string;
  error: string;
  severity: 'error' | 'warning';
  canAutoFix: boolean;
}

export interface PendingRecord {
  id: string;
  jobId: string;
  row: number;
  originalData: Record<string, any>;
  errors: ImportError[];
  status: 'pending' | 'fixed' | 'skipped';
  fixedData?: Record<string, any>;
}

export interface ExportRequest {
  entityType: EntityType;
  format: 'xlsx' | 'csv';
  filters: ExportFilter;
  columns: string[];
  userId: string;
  passwordProtected?: boolean;
}

export interface ExportFilter {
  search?: string;
  city?: string;
  state?: string;
  court?: string;
  role?: string;
  active?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportJob {
  id: string;
  entityType: EntityType;
  format: 'xlsx' | 'csv';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  userId: string;
  createdAt: string;
  completedAt?: string;
  filters: ExportFilter;
  recordCount: number;
}

// Template definitions for each entity type
export interface TemplateColumn {
  key: string;
  label: string;
  isRequired: boolean;
  dataType: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select';
  validationRules: ValidationRule[];
  helpText: string;
  examples: string[];
  selectOptions?: string[];
}

export interface EntityTemplate {
  entityType: EntityType;
  columns: TemplateColumn[];
  upsertKeys: string[];
  addressFields: string[];
}

// Structured address mapping for India
export interface StructuredAddress {
  line1: string;
  line2?: string;
  landmark?: string;
  locality?: string;
  district: string;
  cityId?: string;
  stateCode: string;
  stateName: string;
  country: string;
  pincode: string;
  lat?: number;
  lng?: number;
}

// Auto-mapping configuration
export interface MappingProfile {
  id: string;
  tenantId: string;
  entityType: EntityType;
  name: string;
  mapping: ColumnMapping;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// API response types
export interface ImportResponse {
  success: boolean;
  data?: ImportJob;
  error?: string;
}

export interface ExportResponse {
  success: boolean;
  data?: ExportJob;
  error?: string;
}

export interface TemplateResponse {
  success: boolean;
  data?: Blob;
  error?: string;
}

// Column synonyms for auto-mapping
export interface ColumnSynonyms {
  [standardColumn: string]: string[];
}

export const COLUMN_SYNONYMS: ColumnSynonyms = {
  'pincode': ['pin', 'postal_code', 'zip_code', 'zip', 'postal'],
  'state_name': ['state', 'state_name', 'prov', 'province'],
  'district': ['dist', 'district', 'district_name'],
  'line1': ['address', 'address_line1', 'addr1', 'street'],
  'line2': ['address_line2', 'addr2', 'street2'],
  'email': ['email_id', 'email_address', 'mail'],
  'mobile': ['phone', 'mobile_no', 'contact', 'cell'],
  'legal_name': ['name', 'company_name', 'firm_name', 'client_name'],
  'trade_name': ['trading_name', 'business_name', 'shop_name'],
  'court_name': ['court', 'court_name', 'tribunal'],
  'judge_name': ['judge', 'judge_name', 'justice'],
  'employee_code': ['emp_code', 'employee_id', 'staff_id'],
  'full_name': ['name', 'employee_name', 'staff_name'],
  'work_email': ['email', 'office_email', 'work_mail'],
  'designation': ['position', 'role', 'title', 'job_title']
};