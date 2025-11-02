import { GSTStage, GSTNoticeType } from '../../config/appConfig';

export type AutomationTriggerEvent = 
  | 'case_stage_changed'
  | 'hearing_scheduled'
  | 'hearing_updated'
  | 'document_uploaded'
  | 'task_overdue'
  | 'case_created'
  | 'task_created'
  | 'task_completed'
  | 'manual';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp';

export type RecipientType = 'assignee' | 'manager' | 'client' | 'team' | 'creator';

export interface AutomationTrigger {
  event: AutomationTriggerEvent;
  conditions?: {
    stageFrom?: GSTStage;
    stageTo?: GSTStage;
    noticeType?: GSTNoticeType;
    priority?: string[];
    daysOverdue?: number;
    documentType?: string;
  };
}

export interface AutomationActions {
  createTaskBundle?: {
    bundleId: string;
    assignToRole?: string;
  };
  sendNotification?: {
    channels: NotificationChannel[];
    recipients: RecipientType[];
    template: string;
  };
  escalate?: {
    toRole: string;
    slaThreshold: number;
  };
  aiSuggestTasks?: {
    enabled: boolean;
    autoCreate: boolean;
  };
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  actions: AutomationActions;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
}

export interface AutomationEvent {
  type: AutomationTriggerEvent;
  timestamp: string;
  payload: {
    caseId?: string;
    taskId?: string;
    hearingId?: string;
    documentId?: string;
    stageFrom?: GSTStage;
    stageTo?: GSTStage;
    daysOverdue?: number;
    [key: string]: any;
  };
}

export interface EventContext {
  caseId?: string;
  taskId?: string;
  hearingId?: string;
  userId?: string;
  caseData?: any;
  taskData?: any;
  hearingData?: any;
}

export interface AutomationActionResult {
  type: string;
  status: 'success' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  duration_ms: number;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: string;
  trigger: {
    event: string;
    payload: any;
  };
  evaluation: {
    matched: boolean;
    conditionResults: Record<string, boolean>;
  };
  actions: AutomationActionResult[];
  metadata: {
    caseId?: string;
    taskIds?: string[];
    notificationIds?: string[];
  };
  status: 'success' | 'partial' | 'failed';
}

export interface AutomationStats {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  recentExecutions: AutomationLog[];
}

export interface NotificationConfig {
  type: string;
  recipients: string[];
  channels: NotificationChannel[];
  template: string;
  context: Record<string, any>;
}

export interface AutomationResult {
  success: boolean;
  rulesMatched: number;
  rulesExecuted: number;
  actionsExecuted: number;
  errors: string[];
  logs: AutomationLog[];
}
