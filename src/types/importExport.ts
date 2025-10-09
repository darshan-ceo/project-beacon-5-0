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
  // Client fields
  'legal_name': ['legal_name', 'legal name', 'name', 'client_name', 'client name', 'company name', 'company_name', 'firm_name', 'firm name'],
  'trade_name': ['trade_name', 'trade name', 'business_name', 'business name', 'trading name', 'trading_name', 'shop_name', 'shop name'],
  'gstin': ['gstin', 'gst_number', 'gst number', 'gst no', 'gst', 'gst_no'],
  'pan': ['pan', 'pan_number', 'pan number', 'pan no', 'pan_no'],
  'taxpayer_type': ['taxpayer_type', 'taxpayer type', 'type', 'gst type', 'taxpayer'],
  'constitution': ['constitution', 'constitution_type', 'constitution type', 'entity type', 'entity_type'],
  'city': ['city', 'town', 'place', 'city_name'],
  'district': ['district', 'area', 'region', 'dist', 'district_name'],
  'state': ['state', 'state_name', 'state name', 'state code', 'prov', 'province'],
  'state_name': ['state', 'state_name', 'prov', 'province'],
  'pincode': ['pincode', 'pin', 'zip', 'postal_code', 'postal code', 'zip_code', 'zip code', 'postal'],
  'primary_contact_email': ['primary_contact_email', 'email', 'primary email', 'contact email', 'e-mail', 'email_address', 'email_id', 'mail'],
  'primary_contact_mobile': ['primary_contact_mobile', 'mobile', 'phone', 'contact_number', 'contact number', 'phone_number', 'phone number', 'primary mobile', 'primary phone', 'mobile_no', 'contact', 'cell'],
  
  // Common fields
  'name': ['name', 'full_name', 'contact_name'],
  'email': ['email', 'email_address', 'e-mail', 'email_id', 'mail'],
  'phone': ['phone', 'mobile', 'contact_number', 'phone_number', 'mobile_no'],
  'mobile': ['phone', 'mobile_no', 'contact', 'cell', 'mobile', 'phone_number'],
  'address': ['address', 'location', 'street_address', 'street address'],
  'line1': ['address', 'address_line1', 'addr1', 'street', 'line1'],
  'line2': ['address_line2', 'addr2', 'street2', 'line2'],
  
  // Court/Judge fields
  'court_name': ['court', 'court_name', 'tribunal'],
  'judge_name': ['judge', 'judge_name', 'justice'],
  
  // Employee fields
  'employee_code': ['emp_code', 'employee_id', 'staff_id', 'employee_code'],
  'full_name': ['name', 'employee_name', 'staff_name', 'full_name'],
  'work_email': ['email', 'office_email', 'work_mail', 'work_email'],
  'designation': ['designation', 'position', 'role', 'title', 'job_title'],
  'department': ['department', 'dept'],
  'joining_date': ['joining_date', 'date_of_joining', 'join_date', 'joining date', 'date of joining']
};