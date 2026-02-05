/**
 * Stage Workflow Types for Micro-Workflow within Legal Stages
 * Supports: Notices → Replies → Hearings → Stage Closure
 */

// ============= Stage Notice Types =============

export type NoticeStatus = 'Received' | 'Reply Pending' | 'Replied' | 'Closed';
export type NoticeWorkflowStep = 'notice' | 'reply' | 'hearing' | 'closed';

export interface StageNotice {
  id: string;
  tenant_id: string;
  stage_instance_id: string | null;
  case_id: string;
  notice_type: string | null;
  notice_number: string | null;
  notice_date: string | null;
  due_date: string | null;
  amount_demanded: number | null;
  section_invoked: string | null;
  status: NoticeStatus;
  is_original: boolean;
  documents: string[]; // Array of document IDs
  metadata: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // New fields for expanded notice workflow
  offline_reference_no: string | null;
  issuing_authority: string | null;
  issuing_designation: string | null;
  tax_period_start: string | null;
  tax_period_end: string | null;
  financial_year: string | null;
  tax_amount: number | null;
  interest_amount: number | null;
  penalty_amount: number | null;
  tax_applicable: boolean;
  interest_applicable: boolean;
  penalty_applicable: boolean;
  workflow_step: NoticeWorkflowStep;
}

export interface CreateStageNoticeInput {
  stage_instance_id?: string;
  case_id: string;
  notice_type?: string;
  notice_number?: string;
  notice_date?: string;
  due_date?: string;
  amount_demanded?: number;
  section_invoked?: string;
  status?: NoticeStatus;
  is_original?: boolean;
  documents?: string[];
  metadata?: Record<string, any>;
  // New fields
  offline_reference_no?: string;
  issuing_authority?: string;
  issuing_designation?: string;
  tax_period_start?: string;
  tax_period_end?: string;
  financial_year?: string;
  tax_amount?: number;
  interest_amount?: number;
  penalty_amount?: number;
  tax_applicable?: boolean;
  interest_applicable?: boolean;
  penalty_applicable?: boolean;
  workflow_step?: NoticeWorkflowStep;
}

export interface UpdateStageNoticeInput {
  notice_type?: string;
  notice_number?: string;
  notice_date?: string;
  due_date?: string;
  amount_demanded?: number;
  section_invoked?: string;
  status?: NoticeStatus;
  documents?: string[];
  metadata?: Record<string, any>;
  // New fields
  offline_reference_no?: string;
  issuing_authority?: string;
  issuing_designation?: string;
  tax_period_start?: string;
  tax_period_end?: string;
  financial_year?: string;
  tax_amount?: number;
  interest_amount?: number;
  penalty_amount?: number;
  tax_applicable?: boolean;
  interest_applicable?: boolean;
  penalty_applicable?: boolean;
  workflow_step?: NoticeWorkflowStep;
}

// ============= Stage Reply Types =============

export type ReplyFilingStatus = 'Draft' | 'Filed' | 'Acknowledged';

export type FilingMode = 'Portal' | 'Physical' | 'Email';

export interface StageReply {
  id: string;
  tenant_id: string;
  notice_id: string;
  stage_instance_id: string | null;
  reply_date: string | null;
  reply_reference: string | null;
  filing_status: ReplyFilingStatus;
  filing_mode: FilingMode | null;
  documents: string[]; // Array of document IDs
  notes: string | null;
  filed_by: string | null;
  filed_by_name?: string; // Joined from profiles
  created_at: string;
  updated_at: string;
}

export interface CreateStageReplyInput {
  notice_id: string;
  stage_instance_id?: string;
  reply_date?: string;
  reply_reference?: string;
  filing_status?: ReplyFilingStatus;
  filing_mode?: FilingMode;
  documents?: string[];
  notes?: string;
}

export interface UpdateStageReplyInput {
  reply_date?: string;
  reply_reference?: string;
  filing_status?: ReplyFilingStatus;
  filing_mode?: FilingMode;
  documents?: string[];
  notes?: string;
}

// ============= Stage Workflow Step Types =============

export type WorkflowStepKey = 'notices' | 'reply' | 'hearings' | 'closure';
export type WorkflowStepStatus = 'Pending' | 'In Progress' | 'Completed' | 'Skipped';

export interface StageWorkflowStep {
  id: string;
  tenant_id: string;
  stage_instance_id: string;
  step_key: WorkflowStepKey;
  status: WorkflowStepStatus;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_name?: string; // Joined from profiles
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateWorkflowStepInput {
  status?: WorkflowStepStatus;
  notes?: string;
}

// ============= Stage Closure Types =============

export type ClosureOutcome = 
  | 'Order Passed' 
  | 'Case Dropped' 
  | 'Withdrawn' 
  | 'Settled' 
  | 'Remanded';

export interface StageClosureDetails {
  outcome: ClosureOutcome;
  order_number?: string;
  order_date?: string;
  order_document_id?: string;
  closure_notes?: string;
}

// ============= Aggregated Workflow State =============

export interface StageWorkflowState {
  stageInstanceId: string;
  stageKey: string;
  caseId: string;
  
  // Workflow steps status - transformed for timeline display
  steps: WorkflowTimelineStep[];
  
  // Raw step data (for updates)
  rawSteps: StageWorkflowStep[];
  
  // Data for each step
  notices: StageNotice[];
  replies: StageReply[];
  hearingsCount: number;
  
  // Computed progress
  currentStep: WorkflowStepKey;
  overallProgress: number; // 0-100
  
  // Closure eligibility
  canClose: boolean;
  blockingReasons: string[];
  
  // Metadata
  isLoading: boolean;
  error: string | null;
}

// ============= Workflow Timeline Display =============

export interface WorkflowTimelineStep {
  key: WorkflowStepKey;
  label: string;
  icon: string;
  status: WorkflowStepStatus;
  count?: number;
  subtitle?: string;
  isClickable: boolean;
}

// ============= Service Response Types =============

export interface StageWorkflowSummary {
  stageInstanceId: string;
  noticesCount: number;
  repliesCount: number;
  hearingsCount: number;
  stepsCompleted: number;
  stepsTotal: number;
  currentStep: WorkflowStepKey;
  lastActivity?: string;
}
