/**
 * Migration Mapping Configuration
 * Defines how legacy data maps to HofficeDB schema
 */

import { generateId } from '@/data/db';

export interface EntityMapping {
  legacyKey: string;
  targetTable: string;
  transform: (item: any) => any;
  validate: (item: any) => boolean;
}

/**
 * Ensure item has valid ID
 */
function ensureId(item: any): any {
  return {
    ...item,
    id: item.id || generateId(),
  };
}

/**
 * Ensure timestamps
 */
function ensureTimestamps(item: any): any {
  const now = new Date().toISOString();
  return {
    ...item,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
  };
}

/**
 * Entity transformation mappings
 */
export const ENTITY_MAPPINGS: EntityMapping[] = [
  // Employees (no dependencies)
  {
    legacyKey: 'employees',
    targetTable: 'employees',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      name: item.name || 'Unknown',
      email: item.email || '',
      role: item.role || 'Associate',
      active: item.active !== false,
    })),
    validate: (item) => !!item.name,
  },

  // Courts (no dependencies)
  {
    legacyKey: 'courts',
    targetTable: 'courts',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      name: item.name || 'Unknown Court',
      type: item.type || 'Other',
      location: item.location || '',
    })),
    validate: (item) => !!item.name,
  },

  // Judges (no dependencies)
  {
    legacyKey: 'judges',
    targetTable: 'judges',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      name: item.name || 'Unknown Judge',
      courtId: item.courtId || null,
    })),
    validate: (item) => !!item.name,
  },

  // Clients (no dependencies)
  {
    legacyKey: 'clients',
    targetTable: 'clients',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      name: item.name || 'Unknown Client',
      gstin: item.gstin || item.gstNumber || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || {},
      type: item.type || 'individual',
      status: item.status || 'active',
    })),
    validate: (item) => !!item.name,
  },

  // Cases (depends on clients)
  {
    legacyKey: 'cases',
    targetTable: 'cases',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      caseNumber: item.caseNumber || item.case_number || '',
      title: item.title || 'Untitled Case',
      clientId: item.clientId || item.client_id || '',
      status: item.status || 'active',
      priority: item.priority || 'medium',
      courtId: item.courtId || null,
      assignedTo: item.assignedTo || [],
    })),
    validate: (item) => !!item.clientId && !!item.title,
  },

  // Notices (depends on cases)
  {
    legacyKey: 'notices',
    targetTable: 'notices',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      caseId: item.caseId || item.case_id || '',
      noticeType: item.noticeType || item.notice_type || 'General',
      issueDate: item.issueDate || item.issue_date || new Date().toISOString(),
      replyDueDate: item.replyDueDate || item.reply_due_date || null,
      status: item.status || 'pending',
    })),
    validate: (item) => !!item.caseId,
  },

  // Replies (depends on notices)
  {
    legacyKey: 'replies',
    targetTable: 'replies',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      noticeId: item.noticeId || item.notice_id || '',
      caseId: item.caseId || item.case_id || '',
      status: item.status || 'draft',
      filedDate: item.filedDate || item.filed_date || null,
    })),
    validate: (item) => !!item.noticeId,
  },

  // Hearings (depends on cases)
  {
    legacyKey: 'hearings',
    targetTable: 'hearings',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      caseId: item.caseId || item.case_id || '',
      date: item.date || item.hearing_date || new Date().toISOString(),
      time: item.time || '10:00',
      courtId: item.courtId || null,
      status: item.status || 'scheduled',
      type: item.type || 'regular',
    })),
    validate: (item) => !!item.caseId && !!item.date,
  },

  // Tasks (depends on cases)
  {
    legacyKey: 'tasks',
    targetTable: 'tasks',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      title: item.title || 'Untitled Task',
      description: item.description || '',
      status: item.status || 'pending',
      priority: item.priority || 'medium',
      dueDate: item.dueDate || item.due_date || null,
      caseId: item.caseId || item.case_id || null,
      assignedTo: item.assignedTo || item.assigned_to || null,
    })),
    validate: (item) => !!item.title,
  },

  // Documents (depends on cases/tasks)
  {
    legacyKey: 'documents',
    targetTable: 'documents',
    transform: (item) => ensureTimestamps(ensureId({
      ...item,
      name: item.name || item.fileName || 'Untitled Document',
      type: item.type || item.fileType || 'document',
      size: item.size || 0,
      path: item.path || item.url || '',
      caseId: item.caseId || item.case_id || null,
      folderId: item.folderId || item.folder_id || null,
      tags: item.tags || [],
    })),
    validate: (item) => !!item.name,
  },
];

/**
 * Migration order (dependency-first)
 */
export const MIGRATION_ORDER = [
  'employees',
  'courts',
  'judges',
  'clients',
  'cases',
  'notices',
  'replies',
  'hearings',
  'tasks',
  'documents',
];

/**
 * Field mappings for common legacy->modern transformations
 */
export const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  cases: {
    case_number: 'caseNumber',
    client_id: 'clientId',
    court_id: 'courtId',
    assigned_to: 'assignedTo',
  },
  notices: {
    case_id: 'caseId',
    notice_type: 'noticeType',
    issue_date: 'issueDate',
    reply_due_date: 'replyDueDate',
  },
  replies: {
    notice_id: 'noticeId',
    case_id: 'caseId',
    filed_date: 'filedDate',
  },
  hearings: {
    case_id: 'caseId',
    hearing_date: 'date',
    court_id: 'courtId',
  },
  tasks: {
    case_id: 'caseId',
    due_date: 'dueDate',
    assigned_to: 'assignedTo',
  },
  documents: {
    case_id: 'caseId',
    folder_id: 'folderId',
    file_name: 'name',
    file_type: 'type',
  },
};

/**
 * Get mapping for entity type
 */
export function getMappingForEntity(entityType: string): EntityMapping | undefined {
  return ENTITY_MAPPINGS.find(m => m.legacyKey === entityType);
}
