/**
 * IndexedDB to Supabase Migration Utility
 * One-time migration script for existing local data
 */

import { supabase } from '@/integrations/supabase/client';

interface MigrationStats {
  clients: number;
  cases: number;
  hearings: number;
  tasks: number;
  documents: number;
  errors: string[];
}

export async function migrateLocalDataToSupabase(tenantId: string): Promise<MigrationStats> {
  if (!tenantId) {
    throw new Error('Tenant ID is required for migration');
  }

  const stats: MigrationStats = {
    clients: 0,
    cases: 0,
    hearings: 0,
    tasks: 0,
    documents: 0,
    errors: [],
  };

  try {
    console.log('🚀 Starting IndexedDB → Supabase migration for tenant:', tenantId);

    // Check if migration was already completed
    const migrationComplete = localStorage.getItem('MIGRATION_COMPLETE');
    if (migrationComplete) {
      console.log('⚠️ Migration already completed at:', migrationComplete);
      return stats;
    }

    // Note: This is a template - actual implementation would need to:
    // 1. Access IndexedDB (Dexie) to export data
    // 2. Transform data to match Supabase schema
    // 3. Batch insert into Supabase tables
    // 4. Handle foreign key relationships (clients → cases → hearings)

    console.warn('⚠️ Migration utility template - needs implementation based on actual IndexedDB schema');

    // Example migration flow (commented out - needs actual implementation):
    /*
    // 1. Export from IndexedDB
    const db = await import('@/data/db').then(m => m.db);
    const localClients = await db.clients.toArray();
    const localCases = await db.cases.toArray();
    
    // 2. Migrate clients first (no dependencies)
    if (localClients.length > 0) {
      const { error } = await supabase
        .from('clients')
        .insert(localClients.map(c => ({ ...c, tenant_id: tenantId })));
      
      if (error) {
        stats.errors.push(`Clients: ${error.message}`);
      } else {
        stats.clients = localClients.length;
      }
    }
    
    // 3. Migrate cases (depends on clients)
    if (localCases.length > 0) {
      const { error } = await supabase
        .from('cases')
        .insert(localCases.map(c => ({ ...c, tenant_id: tenantId })));
      
      if (error) {
        stats.errors.push(`Cases: ${error.message}`);
      } else {
        stats.cases = localCases.length;
      }
    }
    
    // 4. Migrate hearings, tasks, documents...
    
    // 5. Clear IndexedDB only if migration succeeded
    if (stats.errors.length === 0) {
      await db.delete();
      localStorage.setItem('MIGRATION_COMPLETE', new Date().toISOString());
    }
    */

    console.log('✅ Migration complete:', stats);
    return stats;
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    stats.errors.push(`Critical error: ${error.message}`);
    throw error;
  }
}

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  const migrationComplete = localStorage.getItem('MIGRATION_COMPLETE');
  const storageMode = import.meta.env.VITE_STORAGE_BACKEND;
  
  return storageMode === 'supabase' && !migrationComplete;
}

/**
 * Check if local data exists
 */
export async function hasLocalData(): Promise<boolean> {
  try {
    // Check for IndexedDB databases
    const databases = await indexedDB.databases();
    return databases.some(db => db.name === 'hoffice-db' || db.name === 'beacon-db');
  } catch {
    return false;
  }
}
