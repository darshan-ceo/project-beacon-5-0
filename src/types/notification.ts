/**
 * Notification Types for Beacon Essential 5.0
 * Updated for Supabase persistence
 */

export type NotificationType = 
  | 'hearing_reminder'
  | 'hearing_scheduled'
  | 'hearing_updated'
  | 'hearing_outcome'
  | 'task_assigned'
  | 'task_due'
  | 'task_completed'
  | 'task_overdue'
  | 'document_shared'
  | 'case_update'
  | 'case_created'
  | 'case_stage_changed'
  | 'case_reassigned'
  | 'client_message'
  | 'system'
  | 'statutory_deadline_approaching'
  | 'statutory_deadline_tomorrow'
  | 'statutory_deadline_today'
  | 'statutory_deadline_breached'
  | 'statutory_deadline_extended'
  | 'statutory_deadline_completed';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface Notification {
  id: string;
  tenant_id: string;
  type: NotificationType;
  title: string;
  message: string;
  user_id: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  channels: NotificationChannel[];
  status: NotificationStatus;
  read: boolean;
  created_at: string;
  updated_at?: string;
  sent_at?: string;
  read_at?: string | null;
  metadata?: any;
}

export interface NotificationLog {
  id: string;
  tenant_id: string;
  hearing_id?: string | null;
  case_id?: string | null;
  type: NotificationType;
  reminder_type?: string | null;
  channels: NotificationChannel[];
  recipients: string[];
  sent_at: string;
  success: boolean;
  error_message?: string | null;
  metadata?: any;
  created_at?: string;
}

export interface NotificationPreferences {
  id?: string;
  tenant_id?: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  hearing_reminders: boolean;
  task_reminders: boolean;
  case_updates: boolean;
  document_shares: boolean;
  reminder_days: number[];
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DataJob {
  id: string;
  tenant_id: string;
  user_id: string;
  job_type: 'import' | 'export';
  entity_type: string;
  file_name?: string | null;
  file_size?: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  counts?: any;
  mapping?: any;
  errors?: any;
  file_url?: string | null;
  format?: string | null;
  filters?: any;
  record_count: number;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}
