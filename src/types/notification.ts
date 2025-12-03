/**
 * Notification Types for Beacon Essential 5.0
 */

export type NotificationType = 
  | 'hearing_reminder'
  | 'hearing_scheduled'
  | 'hearing_updated'
  | 'hearing_outcome'
  | 'task_assigned'
  | 'task_due'
  | 'document_shared'
  | 'case_update'
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
  type: NotificationType;
  title: string;
  message: string;
  user_id: string;
  related_entity_type?: 'hearing' | 'case' | 'task' | 'document';
  related_entity_id?: string;
  channels: NotificationChannel[];
  status: NotificationStatus;
  read: boolean;
  created_at: string;
  sent_at?: string;
  read_at?: string;
  metadata?: Record<string, any>;
}

export interface NotificationLog {
  id: string;
  hearing_id?: string;
  case_id?: string;
  type: NotificationType;
  reminder_type?: 't-1' | 'same-day';
  channels: NotificationChannel[];
  recipients: string[];
  sent_at: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  in_app_enabled: boolean;
  hearing_reminders: boolean;
  task_reminders: boolean;
  case_updates: boolean;
  document_shares: boolean;
  reminder_days: number[]; // Days before hearing to send reminder
}
