// Reports Module Types - Project Beacon 5.0
export interface ReportFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  clientId?: string;
  caseId?: string;
  stage?: string;
  priority?: string;
  ragStatus?: 'Green' | 'Amber' | 'Red';
  courtId?: string;
  judgeId?: string;
  ownerId?: string;
  assigneeId?: string;
  status?: string;
  channel?: 'Email' | 'SMS' | 'WhatsApp';
}

export interface SavedView {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  filters: ReportFilter;
  userId: string;
  isDefault?: boolean;
  createdAt: string;
}

export type ReportType = 
  | 'case-reports'
  | 'hearings'
  | 'sla-compliance'
  | 'timeline-breach-compliance'
  | 'tasks'
  | 'client-summary'
  | 'communications'
  | 'form-timeline';

export interface CaseReportData {
  id: string;
  caseNumber?: string;
  caseType?: string;
  title: string;
  client: string;
  stage: string;
  owner: string;
  createdDate: string;
  updatedDate: string;
  timelineBreachStatus: 'Green' | 'Amber' | 'Red';
  priority: string;
  value?: number;
  taxDemand?: number;
  outcome?: 'Won' | 'Lost' | 'Settled' | 'Ongoing';
  agingDays: number;
  status?: 'Active' | 'Completed';
  reviewDate?: string;
  period?: string;
  authority?: string;
  officeFileNo?: string;
  noticeNo?: string;
}

export interface HearingReportData {
  id: string;
  caseId: string;
  caseTitle: string;
  client: string;
  owner: string;
  date: string;
  time: string;
  court: string;
  bench: string;
  judge: string;
  type: string;
  status: 'Scheduled' | 'Completed' | 'Adjourned' | 'Cancelled';
  authority?: string;
  advocate?: string;
  outcome?: string;
}

export interface TimelineBreachReportData {
  caseId: string;
  caseTitle: string;
  client: string;
  stage: string;
  timelineDue: string;
  agingDays: number;
  ragStatus: 'Green' | 'Amber' | 'Red';
  owner: string;
  breached: boolean;
}

// Backward compatibility alias
export type SLAReportData = TimelineBreachReportData;

export interface TaskReportData {
  id: string;
  title: string;
  caseId: string;
  caseTitle: string;
  client: string;
  owner: string;
  assignee: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Overdue';
  agingDays: number;
  escalated: boolean;
  priority: string;
}

export interface ClientReportData {
  id: string;
  name: string;
  totalCases: number;
  activeCases: number;
  stageMix: { [key: string]: number };
  slaBreaches: number;
  nextHearing?: string;
  totalValue?: number;
  satisfaction?: number;
}

export interface CommunicationReportData {
  id: string;
  date: string;
  caseId: string;
  client: string;
  channel: 'Email' | 'SMS' | 'WhatsApp';
  to: string;
  status: 'Sent' | 'Delivered' | 'Failed' | 'Pending';
  template?: string;
  subject?: string;
}

export interface ExportOptions {
  format: 'excel' | 'pdf';
  includeCharts?: boolean;
  letterhead?: boolean;
  filters?: ReportFilter;
}

export interface FormTimelineReportData {
  id: string;
  formCode: string;
  formTitle: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  client: string;
  stage: string;
  submissionDate: string;
  dueDate?: string;
  status: 'On Time' | 'Delayed' | 'Pending';
  daysElapsed: number;
  ragStatus: 'Green' | 'Amber' | 'Red';
}

export interface ScheduleConfig {
  id: string;
  savedViewId: string;
  rrule: string; // RRULE format for recurring schedules
  recipients: string[];
  format: 'excel' | 'pdf';
  enabled: boolean;
  nextRun?: string;
  lastRun?: string;
}