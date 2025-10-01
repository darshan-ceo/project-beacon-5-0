/**
 * Dexie Database Schema and Configuration
 * Single database with all entities and proper versioning
 */

import Dexie, { Table } from 'dexie';
import { v4 as uuid } from 'uuid';

// Entity Interfaces
export interface Client {
  id: string;
  display_name: string;
  gstin?: string;
  city?: string;
  state?: string;
  created_at: Date;
  updated_at?: Date;
  address_json?: any;
  contact_json?: any;
  status?: string;
}

export interface Case {
  id: string;
  client_id: string;
  stage_code?: string;
  status: string;
  opened_on: Date;
  updated_at?: Date;
  case_number?: string;
  title?: string;
  description?: string;
  assigned_to_id?: string;
  priority?: string;
  metadata_json?: any;
}

export interface Notice {
  id: string;
  case_id: string;
  type_code: string;
  notice_no?: string;
  notice_date: Date;
  due_date?: Date;
  status: string;
  created_at: Date;
  content_json?: any;
}

export interface Reply {
  id: string;
  notice_id: string;
  reply_date?: Date;
  status: string;
  created_at: Date;
  content_json?: any;
}

export interface Hearing {
  id: string;
  case_id: string;
  hearing_date: Date;
  judge_id?: string;
  outcome_code?: string;
  next_hearing_date?: Date;
  status: string;
  created_at: Date;
  notes?: string;
  location?: string;
}

export interface Task {
  id: string;
  case_id?: string;
  assigned_to: string;
  due_date?: Date;
  status: string;
  priority: string;
  title: string;
  description?: string;
  created_at: Date;
  updated_at?: Date;
  related_entity_type?: string;
  related_entity_id?: string;
  is_auto_generated?: boolean;
  bundle_id?: string;
  estimated_hours?: number;
}

export interface TaskBundle {
  id: string;
  name: string;
  stage_code?: string;
  stages?: string[];             // NEW - multi-stage support
  trigger: string;
  active: boolean;
  created_at: Date;
  updated_at?: Date;
  description?: string;
  is_default?: boolean;
  execution_mode?: string;       // NEW - Sequential/Parallel
  version?: number;              // NEW - versioning
  usage_count?: number;          // NEW - usage tracking
  created_by?: string;           // NEW - creator tracking
  automation_flags?: any;        // NEW - JSON field for automation settings
  conditions?: any;              // NEW - JSON field for conditions
}

export interface TaskBundleItem {
  id: string;
  bundle_id: string;
  title: string;
  description?: string;
  priority: string;
  estimated_hours?: number;
  assigned_role?: string;        // NEW - role assignment
  category?: string;             // NEW - categorization
  dependencies?: string[];
  order_index: number;
  created_at: Date;
  template_id?: string;
  due_offset?: string;           // NEW - e.g., "+2d", "+1w"
  automation_flags?: any;        // NEW - JSON field for automation settings
  conditions?: any;              // NEW - JSON field for conditional logic
}

export interface Document {
  id: string;
  case_id?: string;
  client_id?: string;
  doc_type_code?: string;
  version: number;
  status: string;
  added_on: Date;
  name: string;
  mime?: string;
  size: number;
  content?: string;
  uploaded_by_id?: string;
  uploaded_by_name?: string;
  uploaded_at?: Date;
  created_at: Date;
  updated_at?: Date;
  file_refs_json?: string[];
  folder_id?: string;
  is_shared?: boolean;
  path?: string;
  metadata_json?: any;
}

export interface Attachment {
  id: string;
  owner_type: string;
  owner_id?: string;
  document_id?: string;
  filename: string;
  mime: string;
  size: number;
  content?: string;
  hash?: string;
  created_at: Date;
  updated_at?: Date;
  blob?: Blob;
  url?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: Date;
}

export interface EntityTag {
  id: string;
  entity_type: string;
  entity_id: string;
  tag_id: string;
  created_at: Date;
}

export interface Court {
  id: string;
  name: string;
  level?: string;
  city?: string;
  state?: string;
  jurisdiction?: string;
  address?: string;
  established_year?: number;
  created_at: Date;
}

export interface Judge {
  id: string;
  name: string;
  court_id?: string;
  designation?: string;
  phone?: string;
  email?: string;
  created_at: Date;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role_id?: string;
  active: boolean;
  created_at: Date;
  updated_at?: Date;
  phone?: string;
  department?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  at: Date;
  actor_user_id?: string;
  diff_json?: any;
  metadata_json?: any;
}

export interface Setting {
  id: string;
  key: string;
  value: any;
  created_at: Date;
  updated_at?: Date;
}

export interface SyncQueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  queued_at: Date;
  attempts: number;
  max_attempts: number;
  last_error?: string;
  scheduled_for?: string;
  data_json?: any;
}

export interface MigrationMeta {
  id?: number;
  schema_version: number;
  applied_at: Date;
  description?: string;
  rollback_data?: any;
}

export interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  path: string;
  is_default: boolean;
  created_at: Date;
  updated_at?: Date;
  color?: string;
  description?: string;
}

// RBAC Entity Interfaces
export interface RoleEntity {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  isSystemRole: boolean;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PermissionEntity {
  id: string;
  name: string;
  category: string;
  description: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  effect: 'allow' | 'deny';
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: string;
  assignedBy: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface PolicyAuditEntry {
  id: string;
  actorId: string;
  action: 'create_role' | 'update_role' | 'delete_role' | 'assign_role' | 'revoke_role' | 'create_permission' | 'update_permission' | 'delete_permission';
  entityType: 'role' | 'permission' | 'user_role';
  entityId: string;
  before?: any;
  after?: any;
  timestamp: string;
}

// Database Class
export class HofficeDB extends Dexie {
  // Entity Tables
  clients!: Table<Client>;
  cases!: Table<Case>;
  notices!: Table<Notice>;
  replies!: Table<Reply>;
  hearings!: Table<Hearing>;
  tasks!: Table<Task>;
  task_bundles!: Table<TaskBundle>;
  task_bundle_items!: Table<TaskBundleItem>;
  documents!: Table<Document>;
  attachments!: Table<Attachment>;
  folders!: Table<Folder>;
  
  // RBAC Tables
  roles!: Table<RoleEntity>;
  permissions!: Table<PermissionEntity>;
  user_roles!: Table<UserRoleAssignment>;
  policy_audit!: Table<PolicyAuditEntry>;
  
  // Metadata Tables
  tags!: Table<Tag>;
  entity_tags!: Table<EntityTag>;
  courts!: Table<Court>;
  judges!: Table<Judge>;
  employees!: Table<Employee>;
  audit_logs!: Table<AuditLog>;
  settings!: Table<Setting>;
  sync_queue!: Table<SyncQueueItem>;
  migration_meta!: Table<MigrationMeta>;

  constructor() {
    super('hoffice_dev_local');
    
    this.version(1).stores({
      clients: 'id, display_name, gstin, city, state, created_at',
      cases: 'id, client_id, stage_code, status, opened_on, updated_at, case_number',
      notices: 'id, case_id, type_code, notice_no, notice_date, due_date, status',
      replies: 'id, notice_id, reply_date, status',
      hearings: 'id, case_id, hearing_date, judge_id, outcome_code, next_hearing_date, status',
      tasks: 'id, case_id, assigned_to, due_date, status, priority, [related_entity_type+related_entity_id], bundle_id',
      task_bundles: 'id, stage_code, trigger, active, name',
      task_bundle_items: 'id, bundle_id, order_index',
      documents: 'id, case_id, doc_type_code, version, status, added_on, folder_id',
      attachments: 'id, owner_type, owner_id, filename, mime, size, hash, created_at',
      folders: 'id, name, parent_id, path, is_default',
      tags: 'id, name',
      entity_tags: 'id, entity_type, entity_id, tag_id, [entity_type+entity_id]',
      courts: 'id, name, level, city, state',
      judges: 'id, name, court_id',
      employees: 'id, name, email, role_id, active',
      audit_logs: 'id, entity_type, entity_id, at, actor_user_id',
      settings: 'id, key',
      sync_queue: 'id, entity_type, entity_id, operation, queued_at',
      migration_meta: '++id, schema_version, applied_at'
    });

    // Migration for v2 - example of how to handle schema changes
    this.version(2).stores({
      // Add any new indexes or schema changes here
      tasks: 'id, case_id, assigned_to, due_date, status, priority, [related_entity_type+related_entity_id], bundle_id, is_auto_generated',
      task_bundles: 'id, stage_code, trigger, active, name, stages, execution_mode, version, usage_count',
      task_bundle_items: 'id, bundle_id, order_index, assigned_role, category, due_offset'
    }).upgrade(tx => {
      // Handle data migration if needed
      return tx.table('tasks').toCollection().modify(task => {
        if (task.isAutoGenerated !== undefined) {
          task.is_auto_generated = task.isAutoGenerated;
          delete task.isAutoGenerated;
        }
      });
    });

    // Migration for v3 - Add RBAC tables
    this.version(3).stores({
      clients: 'id, display_name, gstin, city, state, created_at',
      cases: 'id, client_id, stage_code, status, opened_on, updated_at, case_number',
      notices: 'id, case_id, type_code, notice_no, notice_date, due_date, status',
      replies: 'id, notice_id, reply_date, status',
      hearings: 'id, case_id, hearing_date, judge_id, outcome_code, next_hearing_date, status',
      tasks: 'id, case_id, assigned_to, due_date, status, priority, [related_entity_type+related_entity_id], bundle_id, is_auto_generated',
      task_bundles: 'id, stage_code, trigger, active, name, stages, execution_mode, version, usage_count',
      task_bundle_items: 'id, bundle_id, order_index, assigned_role, category, due_offset',
      documents: 'id, case_id, doc_type_code, version, status, added_on, folder_id',
      attachments: 'id, owner_type, owner_id, filename, mime, size, hash, created_at',
      folders: 'id, name, parent_id, path, is_default',
      tags: 'id, name',
      entity_tags: 'id, entity_type, entity_id, tag_id, [entity_type+entity_id]',
      courts: 'id, name, level, city, state',
      judges: 'id, name, court_id',
      employees: 'id, name, email, role_id, active',
      audit_logs: 'id, entity_type, entity_id, at, actor_user_id',
      settings: 'id, key',
      sync_queue: 'id, entity_type, entity_id, operation, queued_at',
      migration_meta: '++id, schema_version, applied_at',
      // RBAC Tables
      roles: 'id, name, isActive, isSystemRole, createdAt',
      permissions: 'id, name, category, resource, action, effect, createdAt',
      user_roles: 'id, userId, roleId, isActive, assignedAt',
      policy_audit: 'id, actorId, action, entityType, entityId, timestamp'
    });
  }
}

// Singleton database instance
export const db = new HofficeDB();

// Helper function to ensure UUID generation
export const generateId = () => uuid();

// Initialize database and handle migrations
export const initializeDatabase = async (): Promise<void> => {
  try {
    await db.open();
    
    // Record current schema version
    const currentVersion = db.verno;
    const existing = await db.migration_meta
      .where('schema_version')
      .equals(currentVersion)
      .first();
    
    if (!existing) {
      await db.migration_meta.add({
        schema_version: currentVersion,
        applied_at: new Date(),
        description: `Schema version ${currentVersion} applied`
      });
    }
    
    console.log(`✅ Database initialized at version ${currentVersion}`);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// Get current schema version
export const getCurrentSchemaVersion = async (): Promise<number> => {
  return db.verno;
};

// Export current database schema version for validation
export const CURRENT_SCHEMA_VERSION = 3;