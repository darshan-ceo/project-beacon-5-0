/**
 * Storage Information Utilities
 * Provides information about the current storage configuration
 */

export const getStorageMode = (): 'supabase' | 'indexeddb' | 'hybrid' => {
  // Check if migration is complete - if so, we're using Supabase
  const migrationComplete = localStorage.getItem('SUPABASE_MIGRATION_COMPLETE');
  
  if (migrationComplete === 'true') {
    return 'supabase';
  }
  
  // Default to supabase as per Phase 4
  return 'supabase';
};

export const isMigrationComplete = (): boolean => {
  return localStorage.getItem('SUPABASE_MIGRATION_COMPLETE') === 'true';
};

export const getStorageInfo = () => {
  const mode = getStorageMode();
  const migrated = isMigrationComplete();
  
  return {
    mode,
    migrated,
    displayName: mode === 'supabase' ? 'Cloud Storage (Supabase)' : 'Local Storage',
    description: mode === 'supabase' 
      ? 'Your data is securely stored in the cloud with real-time sync'
      : 'Your data is stored locally on this device',
    isPersistent: true,
    supportsRealtime: mode === 'supabase',
    supportsMultiDevice: mode === 'supabase'
  };
};

export const resetMigrationFlag = () => {
  localStorage.removeItem('SUPABASE_MIGRATION_COMPLETE');
  console.warn('⚠️ Migration flag reset. App will re-check for data to migrate on next load.');
};
