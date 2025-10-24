/**
 * Report Export Column Configurations
 * Defines column mappings for all report types
 */

export interface ReportColumn {
  key: string;
  header: string;
  type: 'string' | 'date' | 'currency' | 'number' | 'boolean';
  format?: string;
  get?: (row: any) => any;
}

export const CASE_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'caseNumber', header: 'Case Number', type: 'string' },
  { key: 'caseType', header: 'Case Type', type: 'string' },
  { key: 'title', header: 'Case Title', type: 'string' },
  { key: 'client', header: 'Client', type: 'string' },
  { key: 'stage', header: 'Stage', type: 'string' },
  { key: 'taxDemand', header: 'Tax Demand (₹)', type: 'currency' },
  { key: 'owner', header: 'Owner', type: 'string' },
  { key: 'timelineBreachStatus', header: 'Timeline Status', type: 'string' },
  { key: 'priority', header: 'Priority', type: 'string' },
  { key: 'agingDays', header: 'Aging (Days)', type: 'number' },
  { key: 'createdDate', header: 'Created Date', type: 'date', format: 'dd-MM-yyyy' },
];

export const HEARING_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'date', header: 'Date', type: 'date', format: 'dd-MM-yyyy' },
  { key: 'time', header: 'Time', type: 'string' },
  { key: 'caseId', header: 'Case ID', type: 'string' },
  { key: 'caseTitle', header: 'Case Title', type: 'string' },
  { key: 'client', header: 'Client', type: 'string' },
  { key: 'court', header: 'Legal Forum', type: 'string' },
  { key: 'judge', header: 'Judge', type: 'string' },
  { key: 'status', header: 'Status', type: 'string' },
];

export const TASK_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'title', header: 'Task Title', type: 'string' },
  { key: 'caseId', header: 'Case ID', type: 'string' },
  { key: 'caseTitle', header: 'Case Title', type: 'string' },
  { key: 'assignee', header: 'Assignee', type: 'string' },
  { key: 'dueDate', header: 'Due Date', type: 'date', format: 'dd-MM-yyyy' },
  { key: 'status', header: 'Status', type: 'string' },
  { key: 'priority', header: 'Priority', type: 'string' },
  { key: 'agingDays', header: 'Aging (Days)', type: 'number' },
  { key: 'escalated', header: 'Escalated', type: 'boolean' },
];

export const TIMELINE_BREACH_COLUMNS: ReportColumn[] = [
  { key: 'caseId', header: 'Case ID', type: 'string' },
  { key: 'caseTitle', header: 'Case Title', type: 'string' },
  { key: 'client', header: 'Client', type: 'string' },
  { key: 'stage', header: 'Stage', type: 'string' },
  { key: 'timelineDue', header: 'Timeline Due', type: 'date', format: 'dd-MM-yyyy' },
  { key: 'agingDays', header: 'Aging (Days)', type: 'number' },
  { key: 'ragStatus', header: 'RAG Status', type: 'string' },
  { key: 'owner', header: 'Owner', type: 'string' },
  { key: 'breached', header: 'Breached', type: 'boolean' },
];

export const CLIENT_SUMMARY_COLUMNS: ReportColumn[] = [
  { key: 'name', header: 'Client Name', type: 'string' },
  { key: 'totalCases', header: 'Total Cases', type: 'number' },
  { key: 'activeCases', header: 'Active Cases', type: 'number' },
  { key: 'slaBreaches', header: 'SLA Breaches', type: 'number' },
  { key: 'nextHearing', header: 'Next Hearing', type: 'date', format: 'dd-MM-yyyy' },
  { key: 'totalValue', header: 'Total Value (₹)', type: 'currency' },
];

export const COMMUNICATION_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'date', header: 'Date', type: 'date', format: 'dd-MM-yyyy' },
  { key: 'caseId', header: 'Case ID', type: 'string' },
  { key: 'client', header: 'Client', type: 'string' },
  { key: 'channel', header: 'Channel', type: 'string' },
  { key: 'to', header: 'To', type: 'string' },
  { key: 'status', header: 'Status', type: 'string' },
  { key: 'template', header: 'Template', type: 'string' },
];

export const FORM_TIMELINE_COLUMNS: ReportColumn[] = [
  { key: 'formCode', header: 'Form Code', type: 'string' },
  { key: 'formTitle', header: 'Form Title', type: 'string' },
  { key: 'caseId', header: 'Case ID', type: 'string' },
  { key: 'caseNumber', header: 'Case Number', type: 'string' },
  { key: 'client', header: 'Client', type: 'string' },
  { key: 'stage', header: 'Stage', type: 'string' },
  { key: 'submissionDate', header: 'Submission Date', type: 'date', format: 'dd-MM-yyyy' },
  { key: 'dueDate', header: 'Due Date', type: 'date', format: 'dd-MM-yyyy' },
  { key: 'status', header: 'Status', type: 'string' },
  { key: 'daysElapsed', header: 'Days Elapsed', type: 'number' },
  { key: 'ragStatus', header: 'RAG Status', type: 'string' },
];
