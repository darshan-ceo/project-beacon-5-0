/**
 * Storage Consolidation Utilities
 * Migrates data from localStorage and legacy IndexedDB to HofficeDB
 */

import { db, generateId } from '@/data/db';
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
    
    // Count records in HofficeDB
    const hofficeDBRecords: Record<string, number> = {
      clients: await db.clients.count(),
      cases: await db.cases.count(),
      notices: await db.notices.count(),
      tasks: await db.tasks.count(),
      documents: await db.documents.count(),
      hearings: await db.hearings.count(),
      employees: await db.employees.count(),
      courts: await db.courts.count(),
      judges: await db.judges.count(),
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
   * Migrate all data from localStorage to HofficeDB
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

      // Migrate in dependency order
      const migrationOrder = [
        { key: 'employees', table: db.employees },
        { key: 'courts', table: db.courts },
        { key: 'judges', table: db.judges },
        { key: 'clients', table: db.clients },
        { key: 'cases', table: db.cases },
        { key: 'notices', table: db.notices },
        { key: 'replies', table: db.replies },
        { key: 'hearings', table: db.hearings },
        { key: 'tasks', table: db.tasks },
        { key: 'documents', table: db.documents },
      ];

      for (const { key, table } of migrationOrder) {
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

            // Bulk insert into HofficeDB
            await (table as any).bulkPut(transformedItems);
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

      // Store migration status
      await db.migration_meta.put({
        schema_version: 1,
        applied_at: new Date(),
        description: 'Migrated from localStorage to HofficeDB',
      });

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

      // Clear HofficeDB
      await db.clients.clear();
      await db.cases.clear();
      await db.notices.clear();
      await db.replies.clear();
      await db.hearings.clear();
      await db.tasks.clear();
      await db.documents.clear();

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
      // Check for orphaned references
      const cases = await db.cases.toArray();
      const clients = await db.clients.toArray();
      const clientIds = new Set(clients.map(c => c.id));

      for (const case_ of cases) {
        if (case_.client_id && !clientIds.has(case_.client_id)) {
          issues.push(`Case ${case_.id} references non-existent client ${case_.client_id}`);
        }
      }

      // Check for duplicate IDs
      const allTables = [
        { name: 'clients', table: db.clients },
        { name: 'cases', table: db.cases },
        { name: 'tasks', table: db.tasks },
      ];

      for (const { name, table } of allTables) {
        const items = await table.toArray();
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
    // Check if migration has been completed
    const migrationRecords = await db.migration_meta.toArray();
    const migrationRecord = migrationRecords.find(r => r.description?.includes('localStorage'));
    if (migrationRecord) {
      return 'modern';
    }

    // Check if we have data in HofficeDB
    const clientCount = await db.clients.count();
    if (clientCount > 0) {
      return 'transitioning';
    }

    return 'legacy';
  }
}

export const storageMigrator = new StorageMigrator();
