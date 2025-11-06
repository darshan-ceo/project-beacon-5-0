/**
 * Storage Consolidation Utilities
 * Migrates data from localStorage to Supabase
 */

import { generateId } from '@/data/db';
import { StorageManager } from '@/data/StorageManager';
import { toast } from '@/hooks/use-toast';

export type MigrationMode = 'legacy' | 'transitioning' | 'modern';

export interface MigrationStatus {
  mode: MigrationMode;
  completed: boolean;
  entitiesMigrated: number;
  totalEntities: number;
  errors: string[];
  startedAt?: Date;
  completedAt?: Date;
}

export interface MigrationResult {
  success: boolean;
  entitiesMigrated: number;
  errors: string[];
  duration: number;
}

export class StorageMigrator {
  private status: MigrationStatus = {
    mode: 'legacy',
    completed: false,
    entitiesMigrated: 0,
    totalEntities: 0,
    errors: [],
  };

  /**
   * Assess current storage state
   */
  async assessStorageState(): Promise<{
    localStorageItems: string[];
    indexedDBDatabases: string[];
    hofficeDBRecords: Record<string, number>;
  }> {
    const localStorageItems = Object.keys(localStorage);
    const storage = StorageManager.getInstance().getStorage();
    
    // Count records in storage
    const [clients, cases, notices, tasks, documents, hearings, employees, courts, judges] = await Promise.all([
      storage.getAll('clients'),
      storage.getAll('cases'),
      storage.getAll('notices'),
      storage.getAll('tasks'),
      storage.getAll('documents'),
      storage.getAll('hearings'),
      storage.getAll('employees'),
      storage.getAll('courts'),
      storage.getAll('judges')
    ]);
    
    const hofficeDBRecords: Record<string, number> = {
      clients: clients.length,
      cases: cases.length,
      notices: notices.length,
      tasks: tasks.length,
      documents: documents.length,
      hearings: hearings.length,
      employees: employees.length,
      courts: courts.length,
      judges: judges.length,
    };

    // Get list of IndexedDB databases
    const indexedDBDatabases: string[] = [];
    if ('databases' in indexedDB) {
      const dbs = await indexedDB.databases();
      indexedDBDatabases.push(...dbs.map(db => db.name || 'unknown'));
    }

    return { localStorageItems, indexedDBDatabases, hofficeDBRecords };
  }

  /**
   * Migrate all data from localStorage to Supabase
   */
  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const startTime = Date.now();
    this.status.startedAt = new Date();
    this.status.mode = 'transitioning';
    this.status.errors = [];
    let entitiesMigrated = 0;

    try {
      // Load legacy app state
      const legacyData = localStorage.getItem('lawfirm_app_data');
      if (!legacyData) {
        return {
          success: true,
          entitiesMigrated: 0,
          errors: ['No legacy data found'],
          duration: Date.now() - startTime,
        };
      }

      const appState = JSON.parse(legacyData);
      const storage = StorageManager.getInstance().getStorage();

      // Migrate in dependency order
      const migrationOrder = [
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

      for (const key of migrationOrder) {
        if (appState[key] && Array.isArray(appState[key])) {
          try {
            const items = appState[key];
            this.status.totalEntities += items.length;

            // Transform and validate each item
            const transformedItems = items.map((item: any) => ({
              ...item,
              id: item.id || generateId(),
              created_at: item.created_at || item.createdAt || new Date(),
              updated_at: item.updated_at || item.updatedAt || new Date(),
            }));

            // Bulk insert into storage
            await storage.bulkCreate(key, transformedItems);
            entitiesMigrated += items.length;
            this.status.entitiesMigrated = entitiesMigrated;
          } catch (error) {
            const errorMsg = `Failed to migrate ${key}: ${error}`;
            this.status.errors.push(errorMsg);
            console.error(errorMsg);
          }
        }
      }

      this.status.completed = true;
      this.status.mode = 'modern';
      this.status.completedAt = new Date();

      return {
        success: this.status.errors.length === 0,
        entitiesMigrated,
        errors: this.status.errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      this.status.errors.push(errorMsg);
      return {
        success: false,
        entitiesMigrated,
        errors: this.status.errors,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Create backup before migration
   */
  async createBackup(): Promise<string> {
    const legacyData = localStorage.getItem('lawfirm_app_data');
    if (!legacyData) {
      throw new Error('No data to backup');
    }

    const backup = {
      timestamp: new Date().toISOString(),
      data: legacyData,
    };

    const backupKey = `lawfirm_app_data_backup_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));
    return backupKey;
  }

  /**
   * Rollback to legacy storage
   */
  async rollbackToLegacy(backupKey: string): Promise<boolean> {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Backup not found');
      }

      const backup = JSON.parse(backupData);
      localStorage.setItem('lawfirm_app_data', backup.data);

      // Clear storage
      const storage = StorageManager.getInstance().getStorage();
      const entities = ['clients', 'cases', 'notices', 'replies', 'hearings', 'tasks', 'documents'];
      await Promise.all(entities.map(entity => storage.clear(entity)));

      this.status.mode = 'legacy';
      this.status.completed = false;

      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * Validate data integrity after migration
   */
  async validateIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const storage = StorageManager.getInstance().getStorage();
      
      // Check for orphaned references
      const cases = await storage.getAll('cases');
      const clients = await storage.getAll('clients');
      const clientIds = new Set(clients.map((c: any) => c.id));

      for (const case_ of cases) {
        if ((case_ as any).client_id && !clientIds.has((case_ as any).client_id)) {
          issues.push(`Case ${(case_ as any).id} references non-existent client ${(case_ as any).client_id}`);
        }
      }

      // Check for duplicate IDs
      const allTables = ['clients', 'cases', 'tasks'];

      for (const name of allTables) {
        const items = await storage.getAll(name);
        const ids = items.map((item: any) => item.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          issues.push(`Duplicate IDs found in ${name}`);
        }
      }

      return { valid: issues.length === 0, issues };
    } catch (error) {
      issues.push(`Validation error: ${error}`);
      return { valid: false, issues };
    }
  }

  getStatus(): MigrationStatus {
    return { ...this.status };
  }

  async getMigrationMode(): Promise<MigrationMode> {
    try {
      const storage = StorageManager.getInstance().getStorage();
      
      // Check if we have data in storage
      const clients = await storage.getAll('clients');
      if (clients.length > 0) {
        return 'modern';
      }

      return 'legacy';
    } catch {
      return 'legacy';
    }
  }
}

export const storageMigrator = new StorageMigrator();
