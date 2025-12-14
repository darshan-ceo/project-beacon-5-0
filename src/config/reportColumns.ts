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
  { key: 'caseNumber', header: 'Case Number', type: 'string', get: (row) => row.caseNumber || row.id || 'N/A' },
  { key: 'caseType', header: 'Case Type', type: 'string', get: (row) => row.caseType || 'GST' },
  { key: 'title', header: 'Case Title', type: 'string', get: (row) => row.title || row.caseTitle || '' },
  { key: 'client', header: 'Client', type: 'string', get: (row) => row.client || row.clientName || '' },
  { key: 'stage', header: 'Stage', type: 'string', get: (row) => row.stage || row.currentStage || '' },
  { key: 'taxDemand', header: 'Tax Demand (₹)', type: 'currency', get: (row) => row.taxDemand || row.tax_demand || 0 },
  { key: 'owner', header: 'Owner', type: 'string', get: (row) => row.owner || row.caseOwner || '' },
  { key: 'timelineBreachStatus', header: 'Timeline Status', type: 'string', get: (row) => row.timelineBreachStatus || row.timeline_breach_status || row.ragStatus || '' },
  { key: 'priority', header: 'Priority', type: 'string', get: (row) => row.priority || '' },
  { 
    key: 'agingDays', 
    header: 'Aging (Days)', 
    type: 'number', 
    get: (row) => {
      if (row.agingDays) return row.agingDays;
      if (row.aging_days) return row.aging_days;
      
      // Calculate from created_at or createdDate
      const createdDate = row.createdDate || row.created_at || row.createdAt;
      if (!createdDate) return 0;
      
      return Math.floor(
        (new Date().getTime() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  },
  { key: 'createdDate', header: 'Created Date', type: 'date', format: 'dd-MM-yyyy', get: (row) => row.createdDate || row.created_at || row.createdAt || new Date() },
];

export const HEARING_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'date', header: 'Date', type: 'date', format: 'dd-MM-yyyy', get: (row) => row.date || row.hearingDate || new Date() },
  { key: 'time', header: 'Time', type: 'string', get: (row) => row.time || row.hearingTime || '' },
  { key: 'caseId', header: 'Case ID', type: 'string', get: (row) => row.caseId || row.case_id || row.id || '' },
  { key: 'caseTitle', header: 'Case Title', type: 'string', get: (row) => row.caseTitle || row.case_title || row.title || '' },
  { key: 'client', header: 'Client', type: 'string', get: (row) => row.client || row.clientName || '' },
  { key: 'court', header: 'Legal Forum', type: 'string', get: (row) => row.court || row.legalForum || row.forum || '' },
  { key: 'taxJurisdiction', header: 'Tax Jurisdiction', type: 'string', get: (row) => row.taxJurisdiction || '' },
  { key: 'officerDesignation', header: 'Officer Designation', type: 'string', get: (row) => row.officerDesignation || '' },
  { key: 'judge', header: 'Judge', type: 'string', get: (row) => row.judge || row.judgeName || '' },
  { key: 'status', header: 'Status', type: 'string', get: (row) => row.status || row.hearingStatus || '' },
];

export const TASK_REPORT_COLUMNS: ReportColumn[] = [
  { key: 'title', header: 'Task Title', type: 'string', get: (row) => row.title || row.taskTitle || '' },
  { key: 'caseId', header: 'Case ID', type: 'string', get: (row) => row.caseId || row.case_id || '' },
  { key: 'caseTitle', header: 'Case Title', type: 'string', get: (row) => row.caseTitle || row.case_title || '' },
  { key: 'assignee', header: 'Assignee', type: 'string', get: (row) => row.assignee || row.assignedTo || '' },
  { key: 'dueDate', header: 'Due Date', type: 'date', format: 'dd-MM-yyyy', get: (row) => row.dueDate || row.due_date || new Date() },
  { key: 'status', header: 'Status', type: 'string', get: (row) => row.status || row.taskStatus || '' },
  { key: 'priority', header: 'Priority', type: 'string', get: (row) => row.priority || '' },
  { 
    key: 'agingDays', 
    header: 'Aging (Days)', 
    type: 'number', 
    get: (row) => {
      if (row.agingDays) return row.agingDays;
      if (row.aging_days) return row.aging_days;
      
      // Calculate from created_at or createdDate
      const createdDate = row.createdDate || row.created_at || row.createdAt;
      if (!createdDate) return 0;
      
      return Math.floor(
        (new Date().getTime() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  },
  { key: 'escalated', header: 'Escalated', type: 'boolean', get: (row) => row.escalated || row.is_escalated || false },
];

export const TIMELINE_BREACH_COLUMNS: ReportColumn[] = [
  { key: 'caseId', header: 'Case ID', type: 'string', get: (row) => row.caseId || row.case_id || row.id || '' },
  { key: 'caseTitle', header: 'Case Title', type: 'string', get: (row) => row.caseTitle || row.case_title || row.title || '' },
  { key: 'client', header: 'Client', type: 'string', get: (row) => row.client || row.clientName || '' },
  { key: 'stage', header: 'Stage', type: 'string', get: (row) => row.stage || row.currentStage || '' },
  { key: 'timelineDue', header: 'Timeline Due', type: 'date', format: 'dd-MM-yyyy', get: (row) => row.timelineDue || row.timeline_due || row.dueDate || new Date() },
  { 
    key: 'agingDays', 
    header: 'Aging (Days)', 
    type: 'number', 
    get: (row) => {
      if (row.agingDays) return row.agingDays;
      if (row.aging_days) return row.aging_days;
      
      // Calculate from created_at or createdDate  
      const createdDate = row.createdDate || row.created_at || row.createdAt;
      if (!createdDate) return 0;
      
      return Math.floor(
        (new Date().getTime() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  },
  { key: 'ragStatus', header: 'RAG Status', type: 'string', get: (row) => row.ragStatus || row.rag_status || row.timelineBreachStatus || '' },
  { key: 'owner', header: 'Owner', type: 'string', get: (row) => row.owner || row.caseOwner || '' },
  { key: 'breached', header: 'Breached', type: 'boolean', get: (row) => row.breached || row.is_breached || false },
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

export const STATUTORY_DEADLINE_COLUMNS: ReportColumn[] = [
  { key: 'caseNumber', header: 'Case Number', type: 'string', get: (row) => row.caseNumber || row.case_number || '' },
  { key: 'caseTitle', header: 'Case Title', type: 'string', get: (row) => row.caseTitle || row.case_title || '' },
  { key: 'client', header: 'Client', type: 'string', get: (row) => row.client || row.clientName || '' },
  { key: 'eventType', header: 'Event Type', type: 'string', get: (row) => row.eventType || row.event_type || '' },
  { key: 'actName', header: 'Act', type: 'string', get: (row) => row.actName || row.act_name || '' },
  { key: 'baseDate', header: 'Base Date', type: 'date', format: 'dd-MM-yyyy', get: (row) => row.baseDate || row.base_date || '' },
  { key: 'dueDate', header: 'Due Date', type: 'date', format: 'dd-MM-yyyy', get: (row) => row.dueDate || row.due_date || row.calculated_deadline || '' },
  { key: 'daysRemaining', header: 'Days Remaining', type: 'number', get: (row) => row.daysRemaining || row.days_remaining || 0 },
  { key: 'status', header: 'Status', type: 'string', get: (row) => row.status || 'Pending' },
  { key: 'ragStatus', header: 'RAG Status', type: 'string', get: (row) => row.ragStatus || row.rag_status || '' },
  { key: 'owner', header: 'Owner', type: 'string', get: (row) => row.owner || row.caseOwner || '' },
  { key: 'extensionCount', header: 'Extensions', type: 'number', get: (row) => row.extensionCount || row.extension_count || 0 },
];
