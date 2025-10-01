/**
 * ID Normalization Migration (Version 4)
 * Converts legacy timestamp-based IDs to UUIDs and updates foreign key references
 * 
 * This migration is idempotent - safe to run multiple times
 */

import { db, generateId } from '@/data/db';
import { MigrationResult } from '@/types/persistence';

interface EntityWithId {
  id: string;
  [key: string]: any;
}

interface ForeignKeyMap {
  table: string;
  field: string;
}

/**
 * Detect if an ID is a legacy timestamp-based ID
 */
function isLegacyId(id: string): boolean {
  // Patterns to detect:
  // - Pure timestamps: "1706789123456"
  // - Prefixed timestamps: "case-1706789123456", "client-1706789123456"
  // - Date.now().toString(): typically 13 digits
  
  const timestampPattern = /^\d{13,}$/;
  const prefixedTimestampPattern = /^[a-z]+-\d{13,}$/;
  
  return timestampPattern.test(id) || prefixedTimestampPattern.test(id);
}

/**
 * Foreign key relationships map
 * Maps entity types to their foreign key dependencies
 */
const FOREIGN_KEYS: Record<string, ForeignKeyMap[]> = {
  clients: [],
  cases: [
    { table: 'cases', field: 'client_id' }
  ],
  tasks: [
    { table: 'tasks', field: 'case_id' },
    { table: 'tasks', field: 'assigned_to' },
    { table: 'tasks', field: 'assigned_by' }
  ],
  documents: [
    { table: 'documents', field: 'case_id' },
    { table: 'documents', field: 'client_id' },
    { table: 'documents', field: 'uploaded_by_id' }
  ],
  hearings: [
    { table: 'hearings', field: 'case_id' },
    { table: 'hearings', field: 'judge_id' },
    { table: 'hearings', field: 'court_id' }
  ],
  notices: [
    { table: 'notices', field: 'case_id' }
  ],
  replies: [
    { table: 'replies', field: 'notice_id' }
  ]
};

/**
 * Main migration function
 */
export async function migrateIdsToUUID(): Promise<MigrationResult> {
  const startTime = Date.now();
  const migratedIds: Record<string, string> = {}; // old ID -> new UUID
  const errors: string[] = [];

  console.log('🔄 Starting ID normalization migration...');

  try {
    // Check if migration already completed
    const migrationRecord = await db.migration_meta
      .where('description')
      .equals('ID normalization to UUID')
      .first();

    if (migrationRecord) {
      console.log('✅ Migration already completed');
      return {
        success: true,
        migratedIds: {},
        errors: ['Migration already completed'],
        duration: Date.now() - startTime,
      };
    }

    // Phase 1: Build ID mapping for all entities
    console.log('📋 Phase 1: Building ID mapping...');
    
    const entityTables = [
      'clients', 'cases', 'tasks', 'documents', 'hearings',
      'notices', 'replies', 'judges', 'courts', 'employees',
      'folders', 'task_bundles', 'task_bundle_items'
    ];

    for (const tableName of entityTables) {
      try {
        const table = (db as any)[tableName];
        if (!table) {
          console.warn(`⚠️ Table ${tableName} not found, skipping`);
          continue;
        }

        const entities: EntityWithId[] = await table.toArray();
        
        for (const entity of entities) {
          if (isLegacyId(entity.id)) {
            // Generate new UUID for this legacy ID
            const newId = generateId();
            migratedIds[entity.id] = newId;
            console.log(`  ${tableName}: ${entity.id} -> ${newId}`);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to scan table ${tableName}: ${error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`✅ Phase 1 complete: ${Object.keys(migratedIds).length} IDs to migrate`);

    // Phase 2: Update primary keys and foreign keys
    console.log('🔄 Phase 2: Updating entities...');

    await db.transaction('rw', entityTables.map(t => (db as any)[t]), async () => {
      for (const tableName of entityTables) {
        try {
          const table = (db as any)[tableName];
          if (!table) continue;

          const entities: EntityWithId[] = await table.toArray();
          
          for (const entity of entities) {
            const updates: any = {};
            let needsUpdate = false;

            // Update primary key if it's a legacy ID
            if (isLegacyId(entity.id)) {
              const newId = migratedIds[entity.id];
              if (newId) {
                // Delete old entity
                await table.delete(entity.id);
                
                // Create new entity with UUID
                entity.id = newId;
                updates.id = newId;
                needsUpdate = true;
              }
            }

            // Update foreign keys
            const foreignKeys = FOREIGN_KEYS[tableName] || [];
            for (const fk of foreignKeys) {
              const oldFkValue = entity[fk.field];
              if (oldFkValue && migratedIds[oldFkValue]) {
                entity[fk.field] = migratedIds[oldFkValue];
                updates[fk.field] = migratedIds[oldFkValue];
                needsUpdate = true;
              }
            }

            // Update entity if needed
            if (needsUpdate) {
              await table.put(entity);
              console.log(`  Updated ${tableName}: ${entity.id}`);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to update table ${tableName}: ${error}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    });

    console.log('✅ Phase 2 complete: All entities updated');

    // Record migration
    await db.migration_meta.add({
      schema_version: 4,
      applied_at: new Date(),
      description: 'ID normalization to UUID',
      rollback_data: { migratedIds }
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Migration completed in ${duration}ms`);
    console.log(`   Migrated ${Object.keys(migratedIds).length} IDs`);
    console.log(`   Errors: ${errors.length}`);

    return {
      success: errors.length === 0,
      migratedIds,
      errors,
      duration,
    };
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`;
    errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);

    return {
      success: false,
      migratedIds,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Check if ID normalization migration is needed
 */
export async function needsIdNormalization(): Promise<boolean> {
  try {
    // Check if migration already completed
    const migrationRecord = await db.migration_meta
      .where('description')
      .equals('ID normalization to UUID')
      .first();

    if (migrationRecord) {
      return false;
    }

    // Check if any legacy IDs exist
    const tables = ['clients', 'cases', 'tasks'];
    
    for (const tableName of tables) {
      const table = (db as any)[tableName];
      if (!table) continue;

      const sample = await table.limit(10).toArray();
      
      for (const entity of sample) {
        if (isLegacyId(entity.id)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return false;
  }
}
