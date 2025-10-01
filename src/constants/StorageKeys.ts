/**
 * Centralized Storage Keys - Single source of truth for all storage keys
 * Prevents typos and ensures consistency across the codebase
 */

export const STORAGE_KEYS = {
  // Core Application Data
  APP_STATE: 'lawfirm_app_data',
  
  // Entity Tables (IndexedDB)
  CLIENTS: 'clients',
  CASES: 'cases',
  NOTICES: 'notices',
  REPLIES: 'replies',
  HEARINGS: 'hearings',
  TASKS: 'tasks',
  TASK_BUNDLES: 'task_bundles',
  TASK_BUNDLE_ITEMS: 'task_bundle_items',
  DOCUMENTS: 'documents',
  ATTACHMENTS: 'attachments',
  FOLDERS: 'folders',
  TAGS: 'tags',
  ENTITY_TAGS: 'entity_tags',
  COURTS: 'courts',
  JUDGES: 'judges',
  EMPLOYEES: 'employees',
  
  // DMS Specific
  DMS_FOLDERS: 'dms_folders',
  DMS_TAGS: 'dms_tags',
  
  // Metadata & System
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
  MIGRATION_META: 'migration_meta',
  
  // Backup & Recovery
  EMERGENCY_BACKUP: 'hoffice_emergency_backup',
  LAST_SAVED: 'hoffice_last_saved',
  
  // Configuration
  PERSISTENCE_CONFIG: 'hoffice_persistence_config',
  STORAGE_MODE: 'hoffice_storage_mode',
  
  // Change Tracking
  DIRTY_ENTITIES: 'hoffice_dirty_entities',
  ENTITY_VERSIONS: 'hoffice_entity_versions',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Database names for different storage backends
 */
export const DB_NAMES = {
  INDEXED_DB: 'hoffice_dev_local',
  LEGACY_IDB: 'beacon_case_management_db',
} as const;

/**
 * Entity type enumeration for type-safe operations
 */
export const ENTITY_TYPES = {
  CLIENT: 'clients',
  CASE: 'cases',
  NOTICE: 'notices',
  REPLY: 'replies',
  HEARING: 'hearings',
  TASK: 'tasks',
  TASK_BUNDLE: 'task_bundles',
  TASK_BUNDLE_ITEM: 'task_bundle_items',
  DOCUMENT: 'documents',
  ATTACHMENT: 'attachments',
  FOLDER: 'folders',
  TAG: 'tags',
  ENTITY_TAG: 'entity_tags',
  COURT: 'courts',
  JUDGE: 'judges',
  EMPLOYEE: 'employees',
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];
