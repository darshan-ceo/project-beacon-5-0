/**
 * Notice Intake Wizard V2.0 Types
 * Supports dual-path: New Case creation OR Add to Existing Case
 */

export type WizardMode = 'new_case' | 'existing_case';

export type WizardStep = 
  | 'entry_decision'
  | 'upload'
  | 'extract'
  | 'resolve_gaps'
  | 'case_mapping'
  | 'timeline_assignment'
  | 'financial_validation'
  | 'create_link'
  | 'stage_tasks'
  | 'completion';

export interface WizardStepConfig {
  id: WizardStep;
  title: string;
  description: string;
  icon: string;
  applicableModes: WizardMode[];
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  {
    id: 'entry_decision',
    title: 'Choose Action',
    description: 'Create new case or add to existing',
    icon: 'CircleDot',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'upload',
    title: 'Upload Notice',
    description: 'Upload PDF notice document',
    icon: 'Upload',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'extract',
    title: 'Extract Data',
    description: 'AI-powered data extraction',
    icon: 'FileText',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'resolve_gaps',
    title: 'Verify Data',
    description: 'Review and fill missing fields',
    icon: 'AlertCircle',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'case_mapping',
    title: 'Case Details',
    description: 'Case identification and client',
    icon: 'FolderOpen',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'timeline_assignment',
    title: 'Timeline',
    description: 'Due dates and assignment',
    icon: 'Calendar',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'financial_validation',
    title: 'Financial',
    description: 'Demand breakdown verification',
    icon: 'IndianRupee',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'create_link',
    title: 'Save',
    description: 'Create case and notice',
    icon: 'Save',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'stage_tasks',
    title: 'Tasks',
    description: 'Auto-generate workflow tasks',
    icon: 'CheckSquare',
    applicableModes: ['new_case', 'existing_case']
  },
  {
    id: 'completion',
    title: 'Complete',
    description: 'Summary and next steps',
    icon: 'CheckCircle',
    applicableModes: ['new_case', 'existing_case']
  }
];

export type NoticeStageTag = 'SCN' | 'Reminder' | 'Hearing' | 'Order';

export interface ExtractedNoticeDataV2 {
  // Notice Identification
  notice_type: string;
  notice_number: string;
  offline_reference_no: string;
  din: string;
  notice_date: string;
  due_date: string;
  
  // Taxpayer
  gstin: string;
  taxpayer_name: string;
  trade_name: string;
  
  // Legal Classification
  section_invoked: string;
  notice_title: string;
  issuing_authority: string;
  issuing_designation: string;
  city: string;
  
  // Period
  tax_period_start: string;
  tax_period_end: string;
  financial_year: string;
  
  // Financial
  tax_amount: number | null;
  interest_amount: number | null;
  penalty_amount: number | null;
  tax_applicable: boolean;
  interest_applicable: boolean;
  penalty_applicable: boolean;
  total_demand: number | null;
  
  // Metadata
  document_type: 'main_notice' | 'annexure';
  raw_text?: string;
  field_confidence: Record<string, { value: string; confidence: number; source: string }>;
}

export interface WizardFormData {
  // Mode
  mode: WizardMode | null;
  
  // Uploaded File
  uploadedFile: File | null;
  
  // Extracted Data
  extractedData: Partial<ExtractedNoticeDataV2> | null;
  
  // Case Selection (existing case mode)
  selectedCaseId: string | null;
  selectedCase: any | null;
  
  // New Case Data
  caseType: string;
  caseYear: string;
  caseSequence: string;
  officeFileNo: string;
  primaryIssue: string;
  caseTitle: string;
  
  // Client & Assignment
  clientId: string;
  clientName: string;
  assignedToId: string;
  assignedToName: string;
  priority: 'Low' | 'Medium' | 'High';
  
  // Stage & Tasks
  stageTag: NoticeStageTag;
  internalNotes: string;
  legalObservations: string;
  
  // Confirmation
  dataConfirmed: boolean;
}

export interface WizardState {
  currentStep: WizardStep;
  formData: WizardFormData;
  isLoading: boolean;
  error: string | null;
  
  // Results
  createdCaseId: string | null;
  createdNoticeId: string | null;
  uploadedDocumentId: string | null;
  generatedTaskIds: string[];
}

export const getInitialWizardState = (): WizardState => ({
  currentStep: 'entry_decision',
  formData: {
    mode: null,
    uploadedFile: null,
    extractedData: null,
    selectedCaseId: null,
    selectedCase: null,
    caseType: 'GST',
    caseYear: new Date().getFullYear().toString(),
    caseSequence: '',
    officeFileNo: '',
    primaryIssue: '',
    caseTitle: '',
    clientId: '',
    clientName: '',
    assignedToId: '',
    assignedToName: '',
    priority: 'Medium',
    stageTag: 'SCN',
    internalNotes: '',
    legalObservations: '',
    dataConfirmed: false
  },
  isLoading: false,
  error: null,
  createdCaseId: null,
  createdNoticeId: null,
  uploadedDocumentId: null,
  generatedTaskIds: []
});

export const getStepIndex = (step: WizardStep): number => {
  return WIZARD_STEPS.findIndex(s => s.id === step);
};

export const getNextStep = (current: WizardStep, mode: WizardMode): WizardStep | null => {
  const currentIndex = getStepIndex(current);
  for (let i = currentIndex + 1; i < WIZARD_STEPS.length; i++) {
    if (WIZARD_STEPS[i].applicableModes.includes(mode)) {
      return WIZARD_STEPS[i].id;
    }
  }
  return null;
};

export const getPreviousStep = (current: WizardStep, mode: WizardMode): WizardStep | null => {
  const currentIndex = getStepIndex(current);
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (WIZARD_STEPS[i].applicableModes.includes(mode)) {
      return WIZARD_STEPS[i].id;
    }
  }
  return null;
};
