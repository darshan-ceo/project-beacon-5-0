/**
 * Form Complexity Classifier
 * Determines whether a form should use adaptive full-page/drawer presentation
 * Based on AFPA (Adaptive Form Presentation Architecture) rules
 */

export type FormComplexity = 'simple' | 'complex';

export type PrimaryEntityType = 
  | 'case' 
  | 'client' 
  | 'task' 
  | 'hearing' 
  | 'document' 
  | 'employee'
  | 'court'
  | 'contact'
  | 'other';

export interface FormComplexityOptions {
  /** Number of input fields in the form */
  fieldCount?: number;
  /** Number of tabs in the form */
  tabCount?: number;
  /** Whether the form has section headers/cards */
  hasSectionHeaders?: boolean;
  /** Type of entity being created/edited */
  entityType?: PrimaryEntityType;
}

/**
 * Primary entities that always require complex form treatment
 */
const PRIMARY_ENTITIES: PrimaryEntityType[] = [
  'case',
  'client',
  'employee',
  'hearing',
  'document',
  'task',
];

/**
 * Classify form complexity based on AFPA criteria
 * 
 * A form is classified as "complex" if ANY of these conditions are true:
 * - More than 6 input fields
 * - More than 1 tab
 * - Has section headers (Card components)
 * - Creates or edits a primary entity
 */
export function classifyFormComplexity(options: FormComplexityOptions): FormComplexity {
  const { fieldCount = 0, tabCount = 0, hasSectionHeaders = false, entityType = 'other' } = options;

  // Complex if more than 6 fields
  if (fieldCount > 6) return 'complex';

  // Complex if more than 1 tab
  if (tabCount > 1) return 'complex';

  // Complex if has section headers
  if (hasSectionHeaders) return 'complex';

  // Complex if primary entity
  if (PRIMARY_ENTITIES.includes(entityType)) return 'complex';

  return 'simple';
}

/**
 * Pre-defined complexity for known modals
 * Used for quick lookup without needing to analyze form structure
 */
export const KNOWN_MODAL_COMPLEXITY: Record<string, FormComplexity> = {
  CaseModal: 'complex',
  ClientModal: 'complex',
  EmployeeModal: 'complex',
  EmployeeModalV2: 'complex',
  HearingModal: 'complex',
  DocumentModal: 'complex',
  TaskModal: 'complex',
  ContactModal: 'complex',
  JudgeModal: 'complex',
  CourtModal: 'complex',
  // Simple modals
  HolidayModal: 'simple',
  StatutoryActModal: 'simple',
  StatutoryEventTypeModal: 'simple',
};
