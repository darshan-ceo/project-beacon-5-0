/**
 * Unified Store - Single data source for DEMO mode
 * Provides async CRUD for all entities with IndexedDB persistence
 */

import { storageManager } from '@/data/StorageManager';
import { envConfig } from '@/utils/envConfig';
import type { Case, Task, Client, Hearing, Court, Judge, Document, Employee, Folder } from '@/contexts/AppStateContext';

// Entity type mapping for type safety
export type EntityKey = 
  | 'clients' | 'contacts' | 'cases' | 'hearings' | 'courts' 
  | 'judges' | 'employees' | 'tasks' | 'documents' | 'taskBundles' 
  | 'taskTemplates' | 'stageFootprints' | 'tags' | 'timeline' | 'folders'
  | 'roles' | 'permissions' | 'userRoles' | 'policyAudit';

export interface TimelineEntry {
  id: string;
  entity: EntityKey;
  refId: string;
  action: 'create' | 'update' | 'delete' | 'workflow';
  payload: any;
  actor: string;
  ts: string; // ISO timestamp
}

export interface StageFootprint {
  id: string;
  caseId: string;
  bundleId: string;
  stageKey: string;
  createdAt: string;
}

export interface TaskBundle {
  id: string;
  name: string;
  description: string;
  stageKey: string;
  triggerType: 'manual' | 'stage_entry' | 'stage_exit' | 'time_based';
  isActive: boolean;
  tasks: TaskTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimatedHours: number;
  dependencies?: string[];
  assigneeRule?: 'stage_owner' | 'case_owner' | 'specific' | 'auto';
  specificAssigneeId?: string;
}

// Contact interface for client contacts
export interface Contact {
  id: string;
  clientId: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  isSignatory: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// Advanced RBAC Entities
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

export interface FilterCondition {
  field: string;
  op: 'eq' | 'in' | 'ne' | 'lte' | 'gte';
  value?: any;
  ctx?: 'user' | 'org' | 'now';
}

export interface PermissionEntity {
  id: string;
  name: string;
  category: string;
  description: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  effect: 'allow' | 'deny';
  scope: PermissionScope;
  conditions?: FilterCondition[];
  tenantId?: string;
  isSystemPermission: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PermissionScope = 'own' | 'team' | 'department' | 'organization';

export interface PermissionEntity {
  id: string;
  name: string;
  category: string;
  description: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  effect: 'allow' | 'deny';
  scope: PermissionScope;
  conditions?: FilterCondition[];
  tenantId?: string;
  isSystemPermission: boolean;
  createdAt: string;
  updatedAt: string;
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
  before?: any;
  after?: any;
  timestamp: string;
  entityType: 'role' | 'permission' | 'user_role';
  entityId: string;
}

class UnifiedStore {
  private isReady = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Enforce DEMO mode
    envConfig.assertDemoMode();
    envConfig.assertIndexedDB();
  }

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing UnifiedStore in DEMO mode');
      
      // Initialize storage manager with IndexedDB
      await storageManager.initialize('indexeddb');
      
      // Perform one-time migration from legacy stores
      await this.migrateLegacyData();
      
      this.isReady = true;
      console.log('✅ UnifiedStore initialized successfully');
    } catch (error) {
      console.error('❌ UnifiedStore initialization failed:', error);
      throw error;
    }
  }

  private async migrateLegacyData(): Promise<void> {
    console.log('🔄 Checking for legacy data migration...');
    
    // Check if migration is needed by looking for legacy localStorage data
    const legacyKeys = ['cases', 'clients', 'tasks', 'hearings', 'courts', 'judges', 'documents', 'employees'];
    const storage = storageManager.getStorage();
    
    for (const key of legacyKeys) {
      const legacyData = localStorage.getItem(key);
      if (legacyData) {
        try {
          const parsedData = JSON.parse(legacyData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log(`📦 Migrating ${parsedData.length} ${key} records...`);
            await storage.bulkCreate(key as EntityKey, parsedData);
            // Keep legacy data for safety, don't remove yet
          }
        } catch (error) {
          console.warn(`⚠️ Failed to migrate ${key}:`, error);
        }
      }
    }
  }

  async waitUntilReady(): Promise<void> {
    if (this.isReady) return;
    await this.initialize();
  }

  private assertReady(): void {
    if (!this.isReady) {
      throw new Error('UnifiedStore not ready - call waitUntilReady() first');
    }
  }

  private async addTimeline(entity: EntityKey, refId: string, action: 'create' | 'update' | 'delete' | 'workflow', payload?: any): Promise<void> {
    const timelineEntry: TimelineEntry = {
      id: `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity,
      refId,
      action,
      payload: payload || {},
      actor: 'demo',
      ts: new Date().toISOString()
    };

    try {
      const storage = storageManager.getStorage();
      await storage.create('timeline', timelineEntry);
    } catch (error) {
      console.warn('⚠️ Failed to add timeline entry:', error);
    }
  }

  // Generic CRUD operations
  async create<T extends { id: string }>(entity: EntityKey, data: T): Promise<T> {
    this.assertReady();
    const storage = storageManager.getStorage();
    const result = await storage.create(entity, data);
    await this.addTimeline(entity, data.id, 'create', data);
    return result;
  }

  async update<T extends { id: string }>(entity: EntityKey, id: string, updates: Partial<T>): Promise<T> {
    this.assertReady();
    const storage = storageManager.getStorage();
    const result = await storage.update(entity, id, updates);
    await this.addTimeline(entity, id, 'update', updates);
    return result;
  }

  async delete(entity: EntityKey, id: string): Promise<void> {
    this.assertReady();
    const storage = storageManager.getStorage();
    await storage.delete(entity, id);
    await this.addTimeline(entity, id, 'delete');
  }

  async getById<T>(entity: EntityKey, id: string): Promise<T | null> {
    this.assertReady();
    const storage = storageManager.getStorage();
    return storage.getById<T>(entity, id);
  }

  async getAll<T>(entity: EntityKey): Promise<T[]> {
    this.assertReady();
    const storage = storageManager.getStorage();
    return storage.getAll<T>(entity);
  }

  async query<T>(entity: EntityKey, filter?: (item: T) => boolean): Promise<T[]> {
    this.assertReady();
    const storage = storageManager.getStorage();
    return storage.query<T>(entity, filter);
  }

  async bulkCreate<T extends { id: string }>(entity: EntityKey, items: T[]): Promise<T[]> {
    this.assertReady();
    const storage = storageManager.getStorage();
    const results = await storage.bulkCreate(entity, items);
    
    // Add timeline entries for bulk operations
    for (const item of results) {
      await this.addTimeline(entity, item.id, 'create', item);
    }
    
    return results;
  }

  async clear(entity: EntityKey): Promise<void> {
    this.assertReady();
    const storage = storageManager.getStorage();
    await storage.clear(entity);
  }

  async clearAll(): Promise<void> {
    this.assertReady();
    const storage = storageManager.getStorage();
    await storage.clearAll();
  }

  // Entity-specific convenience methods
  get clients() {
    return {
      create: (data: Client) => this.create<Client>('clients', data),
      update: (id: string, updates: Partial<Client>) => this.update<Client>('clients', id, updates),
      delete: (id: string) => this.delete('clients', id),
      getById: (id: string) => this.getById<Client>('clients', id),
      getAll: () => this.getAll<Client>('clients'),
      query: (filter?: (item: Client) => boolean) => this.query<Client>('clients', filter)
    };
  }

  get contacts() {
    return {
      create: (data: Contact) => this.create<Contact>('contacts', data),
      update: (id: string, updates: Partial<Contact>) => this.update<Contact>('contacts', id, updates),
      delete: (id: string) => this.delete('contacts', id),
      getById: (id: string) => this.getById<Contact>('contacts', id),
      getAll: () => this.getAll<Contact>('contacts'),
      query: (filter?: (item: Contact) => boolean) => this.query<Contact>('contacts', filter),
      getByClientId: (clientId: string) => this.query<Contact>('contacts', (c) => c.clientId === clientId)
    };
  }

  get cases() {
    return {
      create: (data: Case) => this.create<Case>('cases', data),
      update: (id: string, updates: Partial<Case>) => this.update<Case>('cases', id, updates),
      delete: (id: string) => this.delete('cases', id),
      getById: (id: string) => this.getById<Case>('cases', id),
      getAll: () => this.getAll<Case>('cases'),
      query: (filter?: (item: Case) => boolean) => this.query<Case>('cases', filter)
    };
  }

  get hearings() {
    return {
      create: (data: Hearing) => this.create<Hearing>('hearings', data),
      update: (id: string, updates: Partial<Hearing>) => this.update<Hearing>('hearings', id, updates),
      delete: (id: string) => this.delete('hearings', id),
      getById: (id: string) => this.getById<Hearing>('hearings', id),
      getAll: () => this.getAll<Hearing>('hearings'),
      query: (filter?: (item: Hearing) => boolean) => this.query<Hearing>('hearings', filter)
    };
  }

  get courts() {
    return {
      create: (data: Court) => this.create<Court>('courts', data),
      update: (id: string, updates: Partial<Court>) => this.update<Court>('courts', id, updates),
      delete: (id: string) => this.delete('courts', id),
      getById: (id: string) => this.getById<Court>('courts', id),
      getAll: () => this.getAll<Court>('courts'),
      query: (filter?: (item: Court) => boolean) => this.query<Court>('courts', filter)
    };
  }

  get judges() {
    return {
      create: (data: Judge) => this.create<Judge>('judges', data),
      update: (id: string, updates: Partial<Judge>) => this.update<Judge>('judges', id, updates),
      delete: (id: string) => this.delete('judges', id),
      getById: (id: string) => this.getById<Judge>('judges', id),
      getAll: () => this.getAll<Judge>('judges'),
      query: (filter?: (item: Judge) => boolean) => this.query<Judge>('judges', filter)
    };
  }

  get employees() {
    return {
      create: (data: Employee) => this.create<Employee>('employees', data),
      update: (id: string, updates: Partial<Employee>) => this.update<Employee>('employees', id, updates),
      delete: (id: string) => this.delete('employees', id),
      getById: (id: string) => this.getById<Employee>('employees', id),
      getAll: () => this.getAll<Employee>('employees'),
      query: (filter?: (item: Employee) => boolean) => this.query<Employee>('employees', filter)
    };
  }

  get tasks() {
    return {
      create: (data: Task) => this.create<Task>('tasks', data),
      update: (id: string, updates: Partial<Task>) => this.update<Task>('tasks', id, updates),
      delete: (id: string) => this.delete('tasks', id),
      getById: (id: string) => this.getById<Task>('tasks', id),
      getAll: () => this.getAll<Task>('tasks'),
      query: (filter?: (item: Task) => boolean) => this.query<Task>('tasks', filter)
    };
  }

  get documents() {
    return {
      create: (data: Document) => this.create<Document>('documents', data),
      update: (id: string, updates: Partial<Document>) => this.update<Document>('documents', id, updates),
      delete: (id: string) => this.delete('documents', id),
      getById: (id: string) => this.getById<Document>('documents', id),
      getAll: () => this.getAll<Document>('documents'),
      query: (filter?: (item: Document) => boolean) => this.query<Document>('documents', filter)
    };
  }

  get folders() {
    return {
      create: (data: Folder) => this.create<Folder>('folders', data),
      update: (id: string, updates: Partial<Folder>) => this.update<Folder>('folders', id, updates),
      delete: (id: string) => this.delete('folders', id),
      getById: (id: string) => this.getById<Folder>('folders', id),
      getAll: () => this.getAll<Folder>('folders'),
      query: (filter?: (item: Folder) => boolean) => this.query<Folder>('folders', filter)
    };
  }

  get taskBundles() {
    return {
      create: (data: TaskBundle) => this.create<TaskBundle>('taskBundles', data),
      update: (id: string, updates: Partial<TaskBundle>) => this.update<TaskBundle>('taskBundles', id, updates),
      delete: (id: string) => this.delete('taskBundles', id),
      getById: (id: string) => this.getById<TaskBundle>('taskBundles', id),
      getAll: () => this.getAll<TaskBundle>('taskBundles'),
      query: (filter?: (item: TaskBundle) => boolean) => this.query<TaskBundle>('taskBundles', filter)
    };
  }

  get stageFootprints() {
    return {
      create: (data: StageFootprint) => this.create<StageFootprint>('stageFootprints', data),
      update: (id: string, updates: Partial<StageFootprint>) => this.update<StageFootprint>('stageFootprints', id, updates),
      delete: (id: string) => this.delete('stageFootprints', id),
      getById: (id: string) => this.getById<StageFootprint>('stageFootprints', id),
      getAll: () => this.getAll<StageFootprint>('stageFootprints'),
      query: (filter?: (item: StageFootprint) => boolean) => this.query<StageFootprint>('stageFootprints', filter),
      exists: async (caseId: string, bundleId: string, stageKey: string) => {
        const footprints = await this.query<StageFootprint>('stageFootprints', 
          (fp) => fp.caseId === caseId && fp.bundleId === bundleId && fp.stageKey === stageKey
        );
        return footprints.length > 0;
      }
    };
  }

  get timeline() {
    return {
      create: (data: TimelineEntry) => this.create<TimelineEntry>('timeline', data),
      update: (id: string, updates: Partial<TimelineEntry>) => this.update<TimelineEntry>('timeline', id, updates),
      delete: (id: string) => this.delete('timeline', id),
      getById: (id: string) => this.getById<TimelineEntry>('timeline', id),
      getAll: () => this.getAll<TimelineEntry>('timeline'),
      query: (filter?: (item: TimelineEntry) => boolean) => this.query<TimelineEntry>('timeline', filter),
      getByCaseId: (caseId: string) => this.query<TimelineEntry>('timeline', (t) => t.refId === caseId && t.entity === 'cases')
    };
  }

  get tags() {
    return {
      create: (data: { id: string; name: string }) => this.create('tags', data),
      update: (id: string, updates: any) => this.update('tags', id, updates),
      delete: (id: string) => this.delete('tags', id),
      getById: (id: string) => this.getById('tags', id),
      getAll: () => this.getAll('tags'),
      query: (filter?: (item: any) => boolean) => this.query('tags', filter)
    };
  }

  // Advanced RBAC convenience methods
  get roles() {
    return {
      create: (data: RoleEntity) => this.create<RoleEntity>('roles', data),
      update: (id: string, updates: Partial<RoleEntity>) => this.update<RoleEntity>('roles', id, updates),
      delete: (id: string) => this.delete('roles', id),
      getById: (id: string) => this.getById<RoleEntity>('roles', id),
      getAll: () => this.getAll<RoleEntity>('roles'),
      query: (filter?: (item: RoleEntity) => boolean) => this.query<RoleEntity>('roles', filter),
      getByName: (name: string) => this.query<RoleEntity>('roles', (r) => r.name === name),
      getSystemRoles: () => this.query<RoleEntity>('roles', (r) => r.isSystemRole)
    };
  }

  get permissions() {
    return {
      create: (data: PermissionEntity) => this.create<PermissionEntity>('permissions', data),
      update: (id: string, updates: Partial<PermissionEntity>) => this.update<PermissionEntity>('permissions', id, updates),
      delete: (id: string) => this.delete('permissions', id),
      getById: (id: string) => this.getById<PermissionEntity>('permissions', id),
      getAll: () => this.getAll<PermissionEntity>('permissions'),
      query: (filter?: (item: PermissionEntity) => boolean) => this.query<PermissionEntity>('permissions', filter),
      getByResource: (resource: string) => this.query<PermissionEntity>('permissions', (p) => p.resource === resource),
      getByCategory: (category: string) => this.query<PermissionEntity>('permissions', (p) => p.category === category)
    };
  }

  get userRoles() {
    return {
      create: (data: UserRoleAssignment) => this.create<UserRoleAssignment>('userRoles', data),
      update: (id: string, updates: Partial<UserRoleAssignment>) => this.update<UserRoleAssignment>('userRoles', id, updates),
      delete: (id: string) => this.delete('userRoles', id),
      getById: (id: string) => this.getById<UserRoleAssignment>('userRoles', id),
      getAll: () => this.getAll<UserRoleAssignment>('userRoles'),
      query: (filter?: (item: UserRoleAssignment) => boolean) => this.query<UserRoleAssignment>('userRoles', filter),
      getByUserId: (userId: string) => this.query<UserRoleAssignment>('userRoles', (ur) => ur.userId === userId && ur.isActive),
      getByRoleId: (roleId: string) => this.query<UserRoleAssignment>('userRoles', (ur) => ur.roleId === roleId && ur.isActive)
    };
  }

  get policyAudit() {
    return {
      create: (data: PolicyAuditEntry) => this.create<PolicyAuditEntry>('policyAudit', data),
      update: (id: string, updates: Partial<PolicyAuditEntry>) => this.update<PolicyAuditEntry>('policyAudit', id, updates),
      delete: (id: string) => this.delete('policyAudit', id),
      getById: (id: string) => this.getById<PolicyAuditEntry>('policyAudit', id),
      getAll: () => this.getAll<PolicyAuditEntry>('policyAudit'),
      query: (filter?: (item: PolicyAuditEntry) => boolean) => this.query<PolicyAuditEntry>('policyAudit', filter),
      getByActor: (actorId: string) => this.query<PolicyAuditEntry>('policyAudit', (a) => a.actorId === actorId),
      getByAction: (action: PolicyAuditEntry['action']) => this.query<PolicyAuditEntry>('policyAudit', (a) => a.action === action)
    };
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; errors: string[]; info: any }> {
    try {
      if (!this.isReady) {
        return {
          healthy: false,
          errors: ['UnifiedStore not initialized'],
          info: null
        };
      }

      const storageHealth = await storageManager.healthCheck();
      return {
        healthy: storageHealth.healthy,
        errors: storageHealth.errors,
        info: {
          ...storageHealth.info,
          demoMode: envConfig.IS_DEMO_MODE,
          storageBackend: envConfig.STORAGE_BACKEND
        }
      };
    } catch (error) {
      return {
        healthy: false,
        errors: [`Health check failed: ${error}`],
        info: null
      };
    }
  }
}

// Singleton export
export const unifiedStore = new UnifiedStore();
