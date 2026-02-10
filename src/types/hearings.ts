/**
 * Hearings Module Types for Beacon Essential 5.0
 * Comprehensive hearing management with lifecycle integration
 */

export type HearingStatus = 'scheduled' | 'concluded' | 'adjourned' | 'no-board' | 'withdrawn';
export type HearingPurpose = 'PH' | 'mention' | 'final' | 'other';
export type HearingOutcome = 'Adjournment' | 'Submission Done' | 'Order Passed' | 'Closed' | 'Part-heard' | 'Allowed' | 'Dismissed' | 'Withdrawn' | 'Other';
export type HearingType = 'Personal Hearing' | 'Virtual Hearing' | 'Final Hearing' | 'Mention' | 'General';

export interface HearingAttendance {
  our_counsel_id?: string;
  opposite_counsel?: string;
  client_rep?: string;
}

export interface HearingReminders {
  created: string[];
  last_sent_at?: string;
}

export interface Hearing {
  id: string;
  case_id: string;
  stage_instance_id?: string;
  cycle_no?: number;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  court_id: string;
  courtroom?: string;
  judge_ids: string[];
  hearing_type?: string;
  purpose: HearingPurpose;
  status: HearingStatus;
  outcome?: HearingOutcome;
  outcome_text?: string;
  next_hearing_date?: string;
  order_file_id?: string;
  notes?: string;
  attendance?: HearingAttendance;
  reminders?: HearingReminders;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Phase 1: Authority & Forum Integration (Optional for backward compatibility)
  authority_id?: string;  // FK to Court.id where authorityLevel exists
  forum_id?: string;      // FK to Court.id (legal forum)
  authority_name?: string; // Derived from Court.name
  forum_name?: string;    // Derived from Court.name
  judge_name?: string;    // Derived from Judge.name
  bench_details?: string; // Judge.bench
  
  // Legacy support - maintain compatibility
  caseId?: string;  // Legacy alias for case_id, used in some filtering logic
  clientId?: string;
  judgeId?: string;
  time?: string;
  type?: 'Adjourned' | 'Final' | 'Argued' | 'Preliminary';
  agenda?: string;
  createdDate?: string;
  lastUpdated?: string;
  externalEventId?: string;
  syncStatus?: 'synced' | 'not_synced' | 'sync_failed' | 'sync_pending';
  syncError?: string;
  lastSyncAt?: string;
  syncAttempts?: number;
}

export interface HearingFormData {
  case_id: string;
  stage_instance_id?: string;
  cycle_no?: number;
  date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  court_id: string;
  courtroom?: string;
  judge_ids: string[];
  hearing_type?: string;
  purpose: HearingPurpose;
  notes?: string;
  attendance?: HearingAttendance;
  
  // Phase 1: Authority & Forum fields
  authority_id?: string;  // Required for new hearings
  forum_id?: string;      // Required for new hearings
}

export interface HearingFilters {
  dateFrom?: string;
  dateTo?: string;
  courts?: string[];
  judges?: string[];
  cities?: string[];
  advocates?: string[];
  clients?: string[];
  cases?: string[];
  status?: HearingStatus[];
  purpose?: HearingPurpose[];
}

export interface HearingConflict {
  id: string;
  hearing_id: string;
  conflicting_hearing_id: string;
  counsel_id: string;
  conflict_type: 'counsel_overlap' | 'court_overlap';
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  channels: ('email' | 'sms' | 'whatsapp')[];
}

export interface NotificationRecipient {
  type: 'client_signatory' | 'our_counsel' | 'opposite_counsel' | 'custom';
  email?: string;
  phone?: string;
  name?: string;
}

export interface HearingNotification {
  hearing_id: string;
  template_id: string;
  recipients: NotificationRecipient[];
  scheduled_for?: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
}

export interface HearingTaskTrigger {
  id: string;
  name: string;
  event: 'hearing_scheduled' | 'hearing_concluded' | 'hearing_rescheduled';
  task_template: {
    title: string;
    description: string;
    due_offset_hours: number;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    assignee_type: 'case_owner' | 'specific_user';
    assignee_id?: string;
  };
}

// Calendar integration types
export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  attendees?: string[];
  reminders?: {
    minutes_before: number;
    method: 'email' | 'popup';
  }[];
}

export interface HearingCalendarView {
  view: 'month' | 'week' | 'day';
  date: Date;
  events: (Hearing & { 
    resource?: {
      case_title: string;
      client_name: string;
      court_name: string;
      judge_names: string[];
    }
  })[];
}

export interface HearingListItem extends Hearing {
  case_number: string;
  case_title: string;
  client_name: string;
  court_name: string;
  judge_names: string[];
  conflicts?: HearingConflict[];
}