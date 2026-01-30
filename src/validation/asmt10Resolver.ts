import { useMemo } from 'react';

export interface ValidationWarning {
  path: string;
  label: string;
  message: string;
  severity: 'info' | 'warning';
  icon: '⚠️' | 'ℹ️';
}

export interface ValidationError {
  path: string;
  label: string;
  message: string;
  blocking: boolean;
}

export interface ValidationResult {
  normalized: Record<string, any>;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  canProceed: boolean;
}

export interface ResolverInput {
  extraction: any;
  confidence: Record<string, any>;
  user_overrides?: Record<string, any>;
}

// ============= Normalization Functions =============

/**
 * Normalize date from various formats to ISO (YYYY-MM-DD)
 * Accepts: dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd
 */
export function normalizeDate(input: any): string | null {
  if (!input) return null;
  
  const str = String(input).trim();
  
  // Already in ISO format (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // dd-mm-yyyy or dd/mm/yyyy
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as Date
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

/**
 * Normalize amount from various formats to number
 * Accepts: 240000, 2,40,000, ₹2,40,000, "2.4 lakhs"
 */
export function normalizeAmount(input: any): number | null {
  if (!input) return null;
  
  const str = String(input).trim()
    .replace(/[₹,\s]/g, '') // Remove currency symbols, commas, spaces
    .replace(/lakhs?/gi, '00000') // Convert lakhs to zeros
    .replace(/crores?/gi, '0000000'); // Convert crores to zeros
  
  const num = parseFloat(str);
  return !isNaN(num) ? num : null;
}

/**
 * Normalize tax period to ISO date range
 * Accepts: "FY 2024-25 (Apr-May)", "04/2024-05/2024"
 */
export function normalizeTaxPeriod(input: any): { start: string; end: string } | null {
  if (!input) return null;
  
  const str = String(input).trim();
  
  // Pattern: 04/2024-05/2024 or 04/2024 - 05/2024
  const mmyyyyMatch = str.match(/(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{4})/);
  if (mmyyyyMatch) {
    const [, startMonth, startYear, endMonth, endYear] = mmyyyyMatch;
    return {
      start: `${startYear}-${startMonth}-01`,
      end: `${endYear}-${endMonth}-${getLastDayOfMonth(parseInt(endMonth), parseInt(endYear))}`
    };
  }
  
  // Pattern: FY 2024-25 (Apr-May)
  const fyMatch = str.match(/FY\s*(\d{4})-(\d{2})\s*\((\w+)-(\w+)\)/i);
  if (fyMatch) {
    const [, startYear, endYearShort, startMonthName, endMonthName] = fyMatch;
    const startMonth = getMonthNumber(startMonthName);
    const endMonth = getMonthNumber(endMonthName);
    const endYear = `20${endYearShort}`;
    
    if (startMonth && endMonth) {
      return {
        start: `${startYear}-${startMonth.padStart(2, '0')}-01`,
        end: `${endYear}-${endMonth.padStart(2, '0')}-${getLastDayOfMonth(parseInt(endMonth), parseInt(endYear))}`
      };
    }
  }
  
  return null;
}

function getMonthNumber(monthName: string): string | null {
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  return months[monthName.toLowerCase().substring(0, 3)] || null;
}

function getLastDayOfMonth(month: number, year: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return String(lastDay).padStart(2, '0');
}

/**
 * Normalize GSTIN - relaxed validation
 * Must be exactly 15 characters (pattern validation is non-blocking)
 */
export function normalizeGSTIN(input: any): string | null {
  if (!input) return null;
  
  const str = String(input).trim().toUpperCase().replace(/\s/g, '');
  
  // Accept any 15-character string
  if (str.length === 15) {
    console.debug('[GSTIN Validation] Accepted 15-char GSTIN:', str);
    return str;
  }
  
  console.debug('[GSTIN Validation] Rejected - length:', str.length, 'value:', str);
  return null;
}

/**
 * Normalize DIN - just trim whitespace
 */
export function normalizeDIN(input: any): string {
  if (!input) return '';
  return String(input).trim().toUpperCase();
}

/**
 * Normalize Notice Number - just trim whitespace
 */
export function normalizeNoticeNumber(input: any): string {
  if (!input) return '';
  return String(input).trim();
}

// ============= Validation Rules =============

interface ValidationRule {
  path: string;
  label: string;
  normalize: (value: any) => any;
  validate: (value: any, normalized: any) => { valid: boolean; message?: string };
  blocking: boolean;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    path: '/taxpayer/gstin',
    label: 'GSTIN',
    normalize: normalizeGSTIN,
    validate: (value, normalized) => {
      if (!normalized) {
        return { valid: false, message: 'GSTIN is required and must be exactly 15 characters' };
      }
      return { valid: true };
    },
    blocking: true // ONLY GSTIN BLOCKS
  },
  {
    path: '/din',
    label: 'DIN',
    normalize: normalizeDIN,
    validate: (value, normalized) => {
      if (!normalized || normalized.length < 10) {
        return { valid: false, message: 'DIN should be at least 10 characters' };
      }
      return { valid: true };
    },
    blocking: false
  },
  {
    path: '/notice_no',
    label: 'Notice Number',
    normalize: normalizeNoticeNumber,
    validate: (value, normalized) => {
      if (!normalized || normalized.length < 5) {
        return { valid: false, message: 'Notice Number should be at least 5 characters' };
      }
      return { valid: true };
    },
    blocking: false
  },
  {
    path: '/issue_date',
    label: 'Issue Date',
    normalize: normalizeDate,
    validate: (value, normalized) => {
      if (!normalized) {
        return { valid: false, message: 'Issue Date could not be parsed. Please use DD-MM-YYYY format (e.g., 15-02-2025)' };
      }
      return { valid: true };
    },
    blocking: false
  },
  {
    path: '/action/response_due_date',
    label: 'Response Due Date',
    normalize: normalizeDate,
    validate: (value, normalized) => {
      if (!normalized) {
        return { valid: false, message: 'Due Date could not be parsed. Please use DD-MM-YYYY format (e.g., 15-02-2025)' };
      }
      return { valid: true };
    },
    blocking: false
  },
  {
    path: '/discrepancy_summary/total_amount_proposed',
    label: 'Total Amount',
    normalize: normalizeAmount,
    validate: (value, normalized) => {
      if (normalized === null || normalized <= 0) {
        return { valid: false, message: 'Amount should be a positive number' };
      }
      return { valid: true };
    },
    blocking: false
  },
  {
    path: '/periods/0/period_label',
    label: 'Tax Period',
    normalize: (input: any) => input ? String(input).trim() : '',
    validate: (value, normalized) => {
      if (!normalized) {
        return { valid: false, message: 'Tax Period is recommended' };
      }
      return { valid: true };
    },
    blocking: false
  }
];

// ============= Helper Functions =============

function getNestedValue(obj: any, path: string): any {
  return path.split('/').filter(Boolean).reduce((curr, key) => {
    if (curr && typeof curr === 'object') {
      return curr[key];
    }
    return undefined;
  }, obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('/').filter(Boolean);
  const lastKey = keys.pop()!;
  const target = keys.reduce((curr, key) => {
    if (!curr[key] || typeof curr[key] !== 'object') {
      curr[key] = {};
    }
    return curr[key];
  }, obj);
  target[lastKey] = value;
}

// ============= Main Validation Function =============

export function validateAsmt10Data(input: ResolverInput): ValidationResult {
  const { extraction, confidence, user_overrides = {} } = input;
  
  const normalized: Record<string, any> = {};
  const warnings: ValidationWarning[] = [];
  const errors: ValidationError[] = [];
  
  // Apply validation rules
  VALIDATION_RULES.forEach(rule => {
    // Get original value
    let originalValue = getNestedValue(extraction, rule.path);
    
    // Apply user override if exists
    if (user_overrides[rule.path] !== undefined) {
      originalValue = user_overrides[rule.path];
    }
    
    // Normalize the value
    const normalizedValue = rule.normalize(originalValue);
    
    // Store normalized value
    setNestedValue(normalized, rule.path, normalizedValue);
    
    // Validate
    const validationResult = rule.validate(originalValue, normalizedValue);
    
    if (!validationResult.valid) {
      const fieldConfidence = confidence[rule.path] || 0;
      
      if (rule.blocking) {
        // Only GSTIN creates blocking error
        errors.push({
          path: rule.path,
          label: rule.label,
          message: validationResult.message || 'Invalid value',
          blocking: true
        });
      } else {
        // Everything else is just a warning
        warnings.push({
          path: rule.path,
          label: rule.label,
          message: validationResult.message || 'Value may need attention',
          severity: fieldConfidence < 0.5 ? 'warning' : 'info',
          icon: fieldConfidence < 0.5 ? '⚠️' : 'ℹ️'
        });
      }
    }
  });
  
  // Copy over other fields from extraction
  Object.keys(extraction).forEach(key => {
    if (!(key in normalized)) {
      normalized[key] = extraction[key];
    }
  });
  
  // Can proceed only if no BLOCKING errors (i.e., GSTIN is valid)
  const canProceed = !errors.some(e => e.blocking);
  
  return {
    normalized,
    warnings,
    errors,
    canProceed
  };
}

// ============= React Hook =============

export function useAsmt10Resolver(input: ResolverInput) {
  const result = useMemo(() => {
    return validateAsmt10Data(input);
  }, [input.extraction, input.confidence, input.user_overrides]);
  
  return result;
}
