/**
 * Remand/Reopen Types for Enhanced Stage Transition
 * Supports non-linear lifecycle movement with full audit trail
 */

// Distinguishes between legal remand and internal reopen
export type RemandType = 'Remand' | 'Reopen';

// Categorized reasons specific to Remand/Reopen
export type RemandReasonCategory = 
  | 'Court/Tribunal Order'
  | 'Higher Authority Direction'
  | 'Fresh Evidence Discovered'
  | 'Procedural Error Identified'
  | 'Limitation/Deadline Extended'
  | 'Party Request Accepted'
  | 'Other';

// Stage context for display in selector cards
export interface StageHistoryContext {
  stageName: string;
  stageKey: string;
  authority: string;
  lastActiveDate: string | null;
  cycleCount: number;
  completedTasksCount: number;
  pendingTasksCount: number;
  hasBeenVisited: boolean;
}

// Complete remand transition details
export interface RemandTransitionDetails {
  targetStage: string;
  remandType: RemandType;
  reasonCategory: RemandReasonCategory;
  reasonDetails: string;  // Mandatory detailed notes (min 50 chars)
  orderNumber?: string;
  orderDate?: string;
  orderDocumentFile?: File;
  clientVisibleSummary?: string;
  preservesFutureHistory: boolean;
}

// Form validation state
export interface RemandFormValidation {
  isValid: boolean;
  errors: {
    targetStage?: string;
    reasonCategory?: string;
    reasonDetails?: string;
    orderNumber?: string;
    orderDate?: string;
  };
}

// Stage authority descriptions
export const STAGE_AUTHORITIES: Record<string, string> = {
  'Assessment': 'Internal Review',
  'Adjudication': 'Adjudicating Authority',
  'First Appeal': 'First Appellate Authority',
  'Tribunal': 'GST Appellate Tribunal',
  'High Court': 'High Court of Judicature',
  'Supreme Court': 'Supreme Court of India'
};

// Reason category descriptions for tooltips
export const REASON_CATEGORY_DESCRIPTIONS: Record<RemandReasonCategory, string> = {
  'Court/Tribunal Order': 'Case remanded by higher judicial authority with specific directions',
  'Higher Authority Direction': 'Administrative direction from higher tax authority',
  'Fresh Evidence Discovered': 'New documentary or testimonial evidence requiring re-examination',
  'Procedural Error Identified': 'Error in procedure or process that needs correction',
  'Limitation/Deadline Extended': 'Time limit extended by court order or statutory provision',
  'Party Request Accepted': 'Application by taxpayer/department accepted for reopening',
  'Other': 'Any other reason not covered above - provide detailed explanation'
};
