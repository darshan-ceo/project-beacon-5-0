/**
 * Stage Action Types for Legal-Grade Audit Trail
 * Extends lifecycle types with approval workflow and attachments
 */

import { TransitionType, ReasonEnum } from './lifecycle';

export type ValidationStatus = 'passed' | 'overridden' | 'pending_approval';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalAction = 'request' | 'approve' | 'reject' | 'comment';

export interface StageTransitionAttachment {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface StageTransitionApproval {
  id: string;
  tenantId: string;
  transitionId: string;
  action: ApprovalAction;
  actorId: string;
  actorRole?: string;
  actorName?: string;
  comments?: string;
  createdAt: string;
}

export interface EnhancedStageTransition {
  id: string;
  caseId: string;
  fromStage: string | null;
  toStage: string;
  transitionType: TransitionType;
  comments: string | null;
  createdBy: string;
  createdAt: string;
  
  // Enhanced fields
  validationStatus: ValidationStatus;
  validationWarnings?: string[];
  overrideReason?: string;
  
  // Approval workflow
  requiresApproval: boolean;
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalComments?: string;
  
  // Attachments
  attachments: StageTransitionAttachment[];
  
  // Actor details
  actorRole?: string;
  actorName?: string;
  
  // Immutability marker
  isConfirmed: boolean;
  
  // Approval history
  approvals?: StageTransitionApproval[];
}

export interface CaseActivityItem {
  id: string;
  type: 'stage_transition' | 'document' | 'hearing' | 'task' | 'communication';
  title: string;
  description: string;
  timestamp: string;
  actorName?: string;
  actorRole?: string;
  metadata?: Record<string, any>;
}

export interface CaseActionDossier {
  case: {
    id: string;
    caseNumber: string;
    title: string;
    client: string;
    currentStage: string;
    status: string;
    createdAt: string;
  };
  stageTimeline: EnhancedStageTransition[];
  hearings: Array<{
    date: string;
    type: string;
    status: string;
    outcome?: string;
    notes?: string;
    courtName?: string;
  }>;
  tasks: Array<{
    title: string;
    status: string;
    assignee?: string;
    dueDate?: string;
    completedAt?: string;
  }>;
  documents: Array<{
    name: string;
    category?: string;
    uploadedAt: string;
    uploadedBy?: string;
  }>;
  timeTracking?: {
    totalHours: number;
    entries: Array<{
      date: string;
      hours: number;
      description: string;
      user?: string;
    }>;
  };
  billingSummary?: {
    totalFees: number;
    totalDisbursements: number;
    totalOutstanding: number;
  };
  generatedAt: string;
  generatedBy: string;
}

export interface CreateTransitionWithApprovalRequest {
  caseId: string;
  type: TransitionType;
  toStageKey: string;
  comments?: string;
  requiresApproval?: boolean;
  attachments?: File[];
  validationStatus?: ValidationStatus;
  validationWarnings?: string[];
  overrideReason?: string;
  dispatch?: React.Dispatch<any>;
}
