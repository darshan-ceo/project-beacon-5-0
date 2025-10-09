/**
 * Case Export Configuration
 * Defines column schemas for case data exports with relational lookups
 */

import { Case, Client, Employee } from '@/contexts/AppStateContext';
import { ExportColumn } from './client';

export interface ExportContext {
  clients?: Client[];
  employees?: Employee[];
  cases?: Case[];
}

export const CASE_EXPORT_COLUMNS: ExportColumn<Case>[] = [
  { key: 'id', label: 'Case ID', type: 'string' },
  { key: 'caseNumber', label: 'Case Number', type: 'string' },
  { key: 'title', label: 'Title', type: 'string' },
  { 
    key: 'caseType', 
    label: 'Case Type', 
    type: 'string',
    get: (caseItem) => caseItem.caseType || 'N/A'
  },
  { 
    key: 'clientName', 
    label: 'Client Name', 
    type: 'string',
    get: (caseItem, context: ExportContext) => {
      const client = context.clients?.find(c => c.id === caseItem.clientId);
      return client?.name || 'Unknown';
    }
  },
  { 
    key: 'clientGSTIN', 
    label: 'Client GSTIN', 
    type: 'string',
    get: (caseItem, context: ExportContext) => {
      const client = context.clients?.find(c => c.id === caseItem.clientId);
      return client?.gstin || client?.gstNumber || 'N/A';
    }
  },
  { key: 'currentStage', label: 'Current Stage', type: 'string' },
  { 
    key: 'status', 
    label: 'Status', 
    type: 'string',
    get: (caseItem) => caseItem.status || 'Active'
  },
  { key: 'priority', label: 'Priority', type: 'string' },
  { 
    key: 'timelineBreachStatus', 
    label: 'Timeline Status', 
    type: 'string',
    get: (caseItem) => caseItem.timelineBreachStatus || caseItem.slaStatus || 'Green'
  },
  { 
    key: 'assignedToName', 
    label: 'Assigned To', 
    type: 'string',
    get: (caseItem, context: ExportContext) => {
      if (caseItem.assignedToName) return caseItem.assignedToName;
      const employee = context.employees?.find(e => e.id === caseItem.assignedToId);
      return employee?.full_name || 'Unassigned';
    }
  },
  { 
    key: 'assignedToEmail', 
    label: 'Assigned To Email', 
    type: 'email',
    get: (caseItem, context: ExportContext) => {
      const employee = context.employees?.find(e => e.id === caseItem.assignedToId);
      return employee?.email || 'N/A';
    }
  },
  
  // Financial Information
  { 
    key: 'taxDemand', 
    label: 'Tax Demand', 
    type: 'currency',
    get: (caseItem) => caseItem.taxDemand || caseItem.amountInDispute || 0
  },
  { 
    key: 'amountInDispute', 
    label: 'Amount in Dispute', 
    type: 'currency',
    get: (caseItem) => caseItem.amountInDispute || caseItem.taxDemand || 0
  },
  
  // Case Details
  { 
    key: 'period', 
    label: 'Period', 
    type: 'string',
    get: (caseItem) => caseItem.period || 'N/A'
  },
  { 
    key: 'authority', 
    label: 'Authority', 
    type: 'string',
    get: (caseItem) => caseItem.authority || 'N/A'
  },
  { 
    key: 'officeFileNo', 
    label: 'Office File No', 
    type: 'string',
    get: (caseItem) => caseItem.officeFileNo || 'N/A'
  },
  { 
    key: 'noticeNo', 
    label: 'Notice No', 
    type: 'string',
    get: (caseItem) => caseItem.noticeNo || 'N/A'
  },
  { 
    key: 'issueType', 
    label: 'Issue Type', 
    type: 'string',
    get: (caseItem) => caseItem.issueType || 'N/A'
  },
  { 
    key: 'matterType', 
    label: 'Matter Type', 
    type: 'string',
    get: (caseItem) => caseItem.matterType || 'N/A'
  },
  { 
    key: 'jurisdictionalCommissionerate', 
    label: 'Jurisdictional Commissionerate', 
    type: 'string',
    get: (caseItem) => caseItem.jurisdictionalCommissionerate || 'N/A'
  },
  { 
    key: 'departmentLocation', 
    label: 'Department Location', 
    type: 'string',
    get: (caseItem) => caseItem.departmentLocation || 'N/A'
  },
  { 
    key: 'tribunalBench', 
    label: 'Tribunal Bench', 
    type: 'string',
    get: (caseItem) => caseItem.tribunalBench || 'N/A'
  },
  
  // Dates
  { 
    key: 'createdDate', 
    label: 'Created Date', 
    type: 'date', 
    format: 'dd-MM-yyyy',
    get: (caseItem) => caseItem.createdDate || ''
  },
  { 
    key: 'reviewDate', 
    label: 'Review Date', 
    type: 'date', 
    format: 'dd-MM-yyyy',
    get: (caseItem) => caseItem.reviewDate || ''
  },
  { 
    key: 'lastUpdated', 
    label: 'Last Updated', 
    type: 'date', 
    format: 'dd-MM-yyyy',
    get: (caseItem) => caseItem.lastUpdated || ''
  },
  { 
    key: 'completedDate', 
    label: 'Completed Date', 
    type: 'date', 
    format: 'dd-MM-yyyy',
    get: (caseItem) => caseItem.completedDate || ''
  },
  
  // Progress & Metadata
  { 
    key: 'progress', 
    label: 'Progress (%)', 
    type: 'number',
    get: (caseItem) => caseItem.progress || 0
  },
  { 
    key: 'documents', 
    label: 'Documents Count', 
    type: 'number',
    get: (caseItem) => caseItem.documents || 0
  },
  { 
    key: 'description', 
    label: 'Description', 
    type: 'string',
    get: (caseItem) => caseItem.description || ''
  },
];

// Define default visible columns (for "Export visible only" feature)
export const CASE_VISIBLE_COLUMNS = [
  'caseNumber', 
  'title', 
  'clientName',
  'currentStage', 
  'status', 
  'timelineBreachStatus', 
  'assignedToName',
  'taxDemand',
  'reviewDate'
];
