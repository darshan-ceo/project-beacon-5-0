/**
 * Cyclic Lifecycle Types for Beacon Essential 5.0
 * Supports forward/back/remand with evidence-based validation
 */

export type TransitionType = 'Forward' | 'Send Back' | 'Remand';

export type StageStatus = 'Active' | 'Completed' | 'Remanded' | 'Superseded';

export type ChecklistRuleType = 'auto_dms' | 'auto_hearing' | 'auto_field' | 'manual';

export type ChecklistStatus = 'Auto✓' | 'Attested' | 'Override' | 'Pending';

export type ReasonEnum = 
  | 'Missing Documents'
  | 'Incorrect Filing'
  | 'Legal Deficiency'
  | 'Technical Error'
  | 'Court Direction'
  | 'Other';

export interface StageInstance {
  id: string;
  caseId: string;
  stageKey: string;
  cycleNo: number;
  startedAt: string;
  endedAt?: string;
  status: StageStatus;
  createdBy: string;
  createdAt: string;
}

export interface StageTransition {
  id: string;
  caseId: string;
  fromStageInstanceId?: string;
  toStageInstanceId: string;
  type: TransitionType;
  reasonEnum?: ReasonEnum;
  reasonText?: string;
  orderNo?: string;
  orderDate?: string;
  orderDocId?: string;
  comments?: string;
  createdBy: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  stageInstanceId: string;
  itemKey: string;
  label: string;
  required: boolean;
  ruleType: ChecklistRuleType;
  status: ChecklistStatus;
  attestedBy?: string;
  attestedAt?: string;
  note?: string;
  evidenceFileId?: string;
}

export interface OrderDetails {
  reasonEnum: ReasonEnum;
  reasonText?: string;
  orderNo: string;
  orderDate: string;
  attachedFile?: File;
}

export interface LifecycleState {
  currentInstance: StageInstance | null;
  stageInstances: StageInstance[];
  transitions: StageTransition[];
  checklistItems: ChecklistItem[];
  isLoading: boolean;
}