/**
 * Storage Information Utilities
 * Provides information about the current storage configuration
 */

export const getStorageMode = (): 'supabase' => {
  // Always use Supabase - migration complete
  return 'supabase';
};

export const isMigrationComplete = (): boolean => {
  // Migration always complete - using Supabase
  return true;
};

export const getStorageInfo = () => {
  return {
    mode: 'supabase' as const,
    migrated: true,
    displayName: 'Cloud Storage (Lovable Cloud)',
    description: 'Your data is securely stored in the cloud with real-time sync',
    isPersistent: true,
    supportsRealtime: true,
    supportsMultiDevice: true
  };
};

export const resetMigrationFlag = () => {
  // No-op: Migration permanently complete, using Supabase only
  console.info('ℹ️ Storage mode is locked to Supabase.');
};
