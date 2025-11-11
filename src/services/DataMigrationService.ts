/**
 * Data Migration Service
 * Safely migrates data from IndexedDB to Supabase with validation and rollback
 */

import { StorageManager } from '@/data/StorageManager';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface MigrationProgress {
  status: 'idle' | 'validating' | 'backing-up' | 'migrating' | 'verifying' | 'completed' | 'failed' | 'rolled-back';
  currentEntity?: string;
  entitiesMigrated: number;
  totalEntities: number;
  percentage: number;
  errors: string[];
  warnings: string[];
  startTime?: Date;
  endTime?: Date;
}

export interface MigrationResult {
  success: boolean;
  entitiesMigrated: number;
  entitiesSkipped: number;
  errors: string[];
  warnings: string[];
  duration: number;
  backupKey?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: Array<{
    severity: 'error' | 'warning';
    entity: string;
    message: string;
  }>;
  stats: {
    totalRecords: number;
    entitiesFound: string[];
  };
}

export class DataMigrationService {
  private progress: MigrationProgress = {
    status: 'idle',
    entitiesMigrated: 0,
    totalEntities: 0,
    percentage: 0,
    errors: [],
    warnings: [],
  };

  private progressCallbacks: Array<(progress: MigrationProgress) => void> = [];
  private backupData: Record<string, any> = {};

  /**
   * Subscribe to migration progress updates
   */
  onProgress(callback: (progress: MigrationProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  private updateProgress(updates: Partial<MigrationProgress>) {
    this.progress = { ...this.progress, ...updates };
    this.progressCallbacks.forEach(cb => cb(this.progress));
  }

  /**
   * Pre-migration validation
   */
  async validateSourceData(): Promise<ValidationResult> {
    this.updateProgress({ status: 'validating', errors: [], warnings: [] });
    
    const issues: ValidationResult['issues'] = [];
    const entitiesFound: string[] = [];
    let totalRecords = 0;

    try {
      // Initialize Supabase storage
      await StorageManager.getInstance().initialize('supabase');
      const storage = StorageManager.getInstance().getStorage();

      const entities = [
        'clients', 'cases', 'tasks', 'documents', 
        'hearings', 'employees', 'courts', 'judges'
      ];

      for (const entity of entities) {
        try {
          const records = await storage.getAll(entity);
          if (records.length > 0) {
            entitiesFound.push(entity);
            totalRecords += records.length;

            // Validate data structure
            records.forEach((record: any, index: number) => {
              if (!record.id) {
                issues.push({
                  severity: 'error',
                  entity,
                  message: `Record at index ${index} missing required 'id' field`
                });
              }
            });

            // Check for orphaned relationships
            if (entity === 'cases') {
              const clients = await storage.getAll('clients');
              const clientIds = new Set(clients.map((c: any) => c.id));
              records.forEach((record: any) => {
                if (record.client_id && !clientIds.has(record.client_id)) {
                  issues.push({
                    severity: 'warning',
                    entity,
                    message: `Case ${record.id} references non-existent client ${record.client_id}`
                  });
                }
              });
            }
          }
        } catch (error) {
          issues.push({
            severity: 'error',
            entity,
            message: `Failed to read ${entity}: ${error}`
          });
        }
      }

      const hasErrors = issues.some(i => i.severity === 'error');
      return {
        valid: !hasErrors,
        issues,
        stats: { totalRecords, entitiesFound }
      };
    } catch (error) {
      return {
        valid: false,
        issues: [{
          severity: 'error',
          entity: 'system',
          message: `Validation failed: ${error}`
        }],
        stats: { totalRecords: 0, entitiesFound: [] }
      };
    }
  }

  /**
   * Create backup of IndexedDB data
   */
  async createBackup(): Promise<string> {
    this.updateProgress({ status: 'backing-up' });

    try {
      const storage = StorageManager.getInstance().getStorage();
      const entities = [
        'clients', 'cases', 'tasks', 'documents',
        'hearings', 'employees', 'courts', 'judges'
      ];

      const backup: Record<string, any[]> = {};
      
      for (const entity of entities) {
        backup[entity] = await storage.getAll(entity);
      }

      const backupKey = `migration_backup_${Date.now()}`;
      const backupData = {
        timestamp: new Date().toISOString(),
        entities: backup,
        version: '1.0'
      };

      // Store in localStorage (temporary backup)
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      this.backupData = backup;

      return backupKey;
    } catch (error) {
      throw new Error(`Backup failed: ${error}`);
    }
  }

  /**
   * Migrate data from IndexedDB to Supabase
   */
  async migrateToSupabase(tenantId: string): Promise<MigrationResult> {
    const startTime = Date.now();
    this.updateProgress({
      status: 'migrating',
      startTime: new Date(),
      entitiesMigrated: 0,
      errors: [],
      warnings: []
    });

    let entitiesMigrated = 0;
    let entitiesSkipped = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    let backupKey: string | undefined;

    try {
      // Create backup first
      backupKey = await this.createBackup();

      // Get user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Migration order (respecting dependencies)
      const migrationOrder: Array<{
        entity: string;
        table: keyof Database['public']['Tables'];
        transform?: (record: any) => any;
      }> = [
        { entity: 'employees', table: 'employees' },
        { entity: 'courts', table: 'courts' },
        { entity: 'judges', table: 'judges' },
        { entity: 'clients', table: 'clients' },
        { 
          entity: 'cases', 
          table: 'cases',
          transform: (record) => ({
            ...record,
            notice_date: record.notice_date ? new Date(record.notice_date).toISOString() : null,
            next_hearing_date: record.next_hearing_date ? new Date(record.next_hearing_date).toISOString() : null,
          })
        },
        { 
          entity: 'hearings', 
          table: 'hearings',
          transform: (record) => ({
            ...record,
            hearing_date: record.hearing_date ? new Date(record.hearing_date).toISOString() : null,
            next_hearing_date: record.next_hearing_date ? new Date(record.next_hearing_date).toISOString() : null,
          })
        },
        { entity: 'tasks', table: 'tasks' },
        { entity: 'documents', table: 'documents' },
      ];

      this.updateProgress({ totalEntities: migrationOrder.length });

      for (const { entity, table, transform } of migrationOrder) {
        this.updateProgress({ currentEntity: entity });

        try {
          const records = this.backupData[entity] || [];
          
          if (records.length === 0) {
            entitiesSkipped++;
            warnings.push(`No ${entity} found to migrate`);
            continue;
          }

          // Transform and add tenant_id
          const transformedRecords = records.map(record => {
            const base = transform ? transform(record) : record;
            return {
              ...base,
              tenant_id: tenantId,
              created_at: record.created_at || new Date().toISOString(),
              updated_at: record.updated_at || new Date().toISOString(),
            };
          });

          // Batch insert (50 records at a time to avoid timeout)
          const batchSize = 50;
          for (let i = 0; i < transformedRecords.length; i += batchSize) {
            const batch = transformedRecords.slice(i, i + batchSize);
            
            const { error } = await supabase
              .from(table)
              .upsert(batch, { onConflict: 'id' });

            if (error) {
              errors.push(`${entity} batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
            }
          }

          entitiesMigrated++;
          this.updateProgress({
            entitiesMigrated,
            percentage: Math.round((entitiesMigrated / migrationOrder.length) * 100)
          });

        } catch (error) {
          errors.push(`Failed to migrate ${entity}: ${error}`);
        }
      }

      // Verify migration
      this.updateProgress({ status: 'verifying' });
      const verification = await this.verifyMigration(tenantId);
      
      if (!verification.valid) {
        warnings.push(...verification.issues.map(i => i.message));
      }

      const success = errors.length === 0;
      this.updateProgress({
        status: success ? 'completed' : 'failed',
        endTime: new Date(),
        errors,
        warnings
      });

      return {
        success,
        entitiesMigrated,
        entitiesSkipped,
        errors,
        warnings,
        duration: Date.now() - startTime,
        backupKey
      };

    } catch (error) {
      const errorMessage = `Migration failed: ${error}`;
      errors.push(errorMessage);
      
      this.updateProgress({
        status: 'failed',
        endTime: new Date(),
        errors
      });

      return {
        success: false,
        entitiesMigrated,
        entitiesSkipped,
        errors,
        warnings,
        duration: Date.now() - startTime,
        backupKey
      };
    }
  }

  /**
   * Verify migrated data
   */
  private async verifyMigration(tenantId: string): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = [];
    let totalRecords = 0;
    const entitiesFound: string[] = [];

    try {
      const tables = ['clients', 'cases', 'tasks', 'documents', 'hearings'];

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table as any)
          .select('id', { count: 'exact' })
          .eq('tenant_id', tenantId);

        if (error) {
          issues.push({
            severity: 'error',
            entity: table,
            message: `Failed to verify ${table}: ${error.message}`
          });
        } else if (data) {
          totalRecords += data.length;
          if (data.length > 0) {
            entitiesFound.push(table);
          }
        }
      }

      return {
        valid: issues.length === 0,
        issues,
        stats: { totalRecords, entitiesFound }
      };
    } catch (error) {
      return {
        valid: false,
        issues: [{
          severity: 'error',
          entity: 'system',
          message: `Verification failed: ${error}`
        }],
        stats: { totalRecords: 0, entitiesFound: [] }
      };
    }
  }

  /**
   * Rollback migration
   */
  async rollback(backupKey: string): Promise<boolean> {
    this.updateProgress({ status: 'validating' });

    try {
      const backupJson = localStorage.getItem(backupKey);
      if (!backupJson) {
        throw new Error('Backup not found');
      }

      const backup = JSON.parse(backupJson);
      
      // Restore to Supabase
      await StorageManager.getInstance().initialize('supabase');
      const storage = StorageManager.getInstance().getStorage();

      for (const [entity, records] of Object.entries(backup.entities)) {
        if (Array.isArray(records) && records.length > 0) {
          await storage.bulkCreate(entity, records);
        }
      }

      this.updateProgress({ status: 'rolled-back' });
      return true;
    } catch (error) {
      this.updateProgress({
        status: 'failed',
        errors: [`Rollback failed: ${error}`]
      });
      return false;
    }
  }

  /**
   * Clean up after successful migration
   */
  async cleanupAfterMigration(): Promise<void> {
    try {
      console.log('⚠️ cleanupAfterMigration is deprecated - Supabase is the only storage mode');
      
      // Mark migration as complete
      localStorage.setItem('MIGRATION_COMPLETE', new Date().toISOString());
      localStorage.setItem('STORAGE_MODE', 'supabase');
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  }

  getProgress(): MigrationProgress {
    return { ...this.progress };
  }
}

export const dataMigrationService = new DataMigrationService();
