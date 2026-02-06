import { validateExtraction, Extraction, ValidationError } from './validator';

export interface DataGap {
  path: string;
  label: string;
  currentValue: any;
  confidence: number;
  suggested?: any;
  evidence?: string;
  critical: boolean;
  type: 'text' | 'date' | 'number' | 'enum';
  enumOptions?: string[];
}

export interface ResolverInput {
  extraction: Extraction;
  confidence: Record<string, number>;
  provenance?: Record<string, { page?: number; snippet?: string; bbox?: any }>;
  user_overrides?: Record<string, any>;
}

export interface ResolverOutput {
  status: 'complete' | 'incomplete';
  gaps: DataGap[];
  normalized: Extraction;
  errors: ValidationError[];
  can_proceed: boolean;
}

// ONLY GSTIN is blocking - all other fields are warnings
const CRITICAL_PATHS = [
  '/taxpayer/gstin'
];

const FIELD_DEFINITIONS: Record<string, { label: string; type: DataGap['type']; enumOptions?: string[] }> = {
  '/taxpayer/gstin': { label: 'GSTIN', type: 'text' },
  '/taxpayer/name': { label: 'Taxpayer Name', type: 'text' },
  '/issue_date': { label: 'Issue Date', type: 'date' },
  '/notice_no': { label: 'Notice Number', type: 'text' },
  '/din': { label: 'DIN', type: 'text' },
  '/periods/0/period_label': { label: 'Tax Period', type: 'text' },
  '/action/response_due_date': { label: 'Response Due Date', type: 'date' },
  '/action/response_mode': { 
    label: 'Response Mode', 
    type: 'enum', 
    enumOptions: ['GST Portal', 'Email', 'Physical'] 
  },
  '/discrepancy_summary/total_amount_proposed': { label: 'Total Amount Proposed', type: 'number' },
  '/notice_title': { label: 'Notice Title', type: 'text' },
  '/section_invoked': { label: 'Legal Section', type: 'text' },
  '/notice_type': { 
    label: 'Notice Type', 
    type: 'enum',
    enumOptions: ['ASMT-10', 'ASMT-11', 'ASMT-12', 'DRC-01', 'DRC-01A', 'DRC-03', 'DRC-07', 'Other']
  },
  '/issuing_authority_office': { label: 'Issuing Authority Office', type: 'text' },
  // V2 additions
  '/offline_reference_no': { label: 'Offline Reference No', type: 'text' },
  '/issuing_designation': { label: 'Officer Designation', type: 'text' },
  '/tax_period_start': { label: 'Tax Period Start', type: 'date' },
  '/tax_period_end': { label: 'Tax Period End', type: 'date' },
  '/financial_year': { label: 'Financial Year', type: 'text' },
  '/tax_amount': { label: 'Tax Amount', type: 'number' },
  '/interest_amount': { label: 'Interest Amount', type: 'number' },
  '/penalty_amount': { label: 'Penalty Amount', type: 'number' }
};

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

function hasValue(value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function generateSuggestion(
  path: string, 
  extraction: Extraction, 
  provenance?: Record<string, any>
): { suggested: any; evidence?: string } {
  const evidence = provenance?.[path];
  
  // If we have strong evidence (high confidence extraction), use it as suggestion
  if (evidence?.snippet && evidence.snippet.trim()) {
    return {
      suggested: evidence.snippet.trim(),
      evidence: `Found on page ${evidence.page || '?'}: "${evidence.snippet}"`
    };
  }
  
  // Contextual suggestions based on path
  if (path === '/action/response_mode') {
    return { suggested: 'GST Portal' }; // Most common
  }
  
  if (path === '/legal/section') {
    return { suggested: 'Section 61' }; // Common for ASMT-10
  }
  
  // No evidence, no suggestion
  return { suggested: null };
}

export function resolveDataGaps(input: ResolverInput): ResolverOutput {
  const { extraction, confidence, provenance = {}, user_overrides = {} } = input;
  
  // Apply user overrides to extraction
  const workingExtraction = structuredClone(extraction);
  Object.entries(user_overrides).forEach(([path, value]) => {
    setNestedValue(workingExtraction, path, value);
  });
  
  // Validate the working extraction
  const validation = validateExtraction(workingExtraction);
  const { normalized, errors } = validation;
  
  // Find gaps: missing values or low confidence
  const gaps: DataGap[] = [];
  
  Object.entries(FIELD_DEFINITIONS).forEach(([path, definition]) => {
    const currentValue = getNestedValue(normalized, path);
    const fieldConfidence = confidence[path] || 0;
    const isOverridden = path in user_overrides;
    
    // Gap exists if: no value OR low confidence (and not user-overridden)
    const hasGap = !hasValue(currentValue) || (fieldConfidence < 0.8 && !isOverridden);
    const isCritical = CRITICAL_PATHS.includes(path);
    
    if (hasGap) {
      const { suggested, evidence } = generateSuggestion(path, extraction, provenance);
      
      gaps.push({
        path,
        label: definition.label,
        currentValue,
        confidence: fieldConfidence,
        suggested,
        evidence,
        critical: isCritical,
        type: definition.type,
        enumOptions: definition.enumOptions
      });
    }
  });
  
  // Special handling for discrepancies - check if we have any numeric values
  const hasDiscrepancyAmounts = normalized.discrepancy_summary?.total_amount_proposed > 0 ||
    (normalized.discrepancies || []).some((d: any) => 
      [d.difference_value, d.tax_difference, d.declared_value, d.derived_value]
        .some((n: any) => typeof n === 'number' && !Number.isNaN(n) && n !== 0)
    );
  
  if (!hasDiscrepancyAmounts) {
    gaps.push({
      path: '/discrepancies',
      label: 'Discrepancy Details',
      currentValue: null,
      confidence: 0,
      suggested: null,
      critical: true,
      type: 'text'
    });
  }
  
  // Check critical gaps
  const criticalGaps = gaps.filter(g => g.critical);
  const hasCriticalErrors = errors.some(e => e.critical);
  
  const status: 'complete' | 'incomplete' = 
    criticalGaps.length === 0 && !hasCriticalErrors ? 'complete' : 'incomplete';
  
  return {
    status,
    gaps,
    normalized,
    errors,
    can_proceed: status === 'complete'
  };
}