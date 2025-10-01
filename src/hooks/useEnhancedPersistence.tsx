import { useEffect, useCallback, useState, useRef } from 'react';
import { AppState, useAppState, AppAction } from '@/contexts/AppStateContext';
import { persistenceService, StorageHealth } from '@/services/persistenceService';
import { idbStorage } from '@/utils/idb';
import { toast } from '@/hooks/use-toast';

const AUTO_SAVE_INTERVAL = 3000; // 3 seconds for better persistence

export const useEnhancedPersistence = () => {
  const { state, dispatch } = useAppState();
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const lastNonZeroEntityCount = useRef(0);

  // Enhanced storage health checking with recovery options
  const checkHealth = useCallback(async () => {
    try {
      const health = await persistenceService.checkStorageHealth();
      setStorageHealth(health);
      
      if (!health.isHealthy) {
        console.error('[Enhanced Persistence] Storage health issues:', health.errors);
        
        // Provide specific error messages and recovery options
        const errorDetails = health.errors.join('\n');
        toast({
          title: 'Storage Issue Detected',
          description: `${errorDetails}\n\nTry refreshing the page or clearing browser cache.`,
          variant: 'destructive',
          duration: 10000, // Longer duration for important errors
        });
        
        // Attempt automatic recovery for common issues
        if (health.errors.some(err => err.includes('Read/write test failed'))) {
          console.log('[Enhanced Persistence] Attempting automatic storage recovery...');
          await attemptStorageRecovery();
        }
      }
      
      if (health.quotaWarning) {
        toast({
          title: 'Storage Space Warning',
          description: `Storage space is running low (${Math.round(health.available / 1024 / 1024)}MB remaining). Consider clearing old data.`,
          variant: 'destructive',
          duration: 8000,
        });
      }
      
      return health;
    } catch (error) {
      console.error('[Enhanced Persistence] Health check failed:', error);
      const fallbackHealth = {
        isHealthy: false,
        used: 0,
        available: 0,
        errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        quotaWarning: true
      };
      setStorageHealth(fallbackHealth);
      return fallbackHealth;
    }
  }, []);

  // Automatic storage recovery
  const attemptStorageRecovery = useCallback(async () => {
    try {
      console.log('[Enhanced Persistence] Starting storage recovery...');
      
      // Step 1: Try to clear old test data
      const testKeys = ['health-check-test', 'health-check-recovery'];
      for (const key of testKeys) {
        try {
          await idbStorage.delete(key);
        } catch (error) {
          console.warn(`[Recovery] Failed to clear test key ${key}:`, error);
        }
      }
      
      // Step 2: Verify storage is working with a simple test
      const recoveryTest = { recoveryAttempt: Date.now() };
      await idbStorage.set('health-check-recovery', recoveryTest);
      const retrieved = await idbStorage.get('health-check-recovery');
      await idbStorage.delete('health-check-recovery');
      
      if (retrieved && retrieved.recoveryAttempt === recoveryTest.recoveryAttempt) {
        console.log('[Enhanced Persistence] Storage recovery successful');
        toast({
          title: 'Storage Recovered',
          description: 'Storage issues have been automatically resolved.',
        });
        
        // Re-check health
        setTimeout(() => checkHealth(), 1000);
      } else {
        throw new Error('Recovery test failed');
      }
      
    } catch (error) {
      console.error('[Enhanced Persistence] Storage recovery failed:', error);
      toast({
        title: 'Recovery Failed',
        description: 'Automatic storage recovery failed. Please refresh the page or contact support.',
        variant: 'destructive',
      });
    }
  }, [checkHealth]);

  // Mirror current state to storageShim for modules that rely on it
  const mirrorLocalCache = useCallback(async (stateToMirror: AppState) => {
    try {
      const { setItem } = await import('@/data/storageShim');
      await setItem('lawfirm_app_data', stateToMirror);
      await setItem('dms_folders', stateToMirror.folders || []);
      console.log('🪞 Cache mirrored from IndexedDB', {
        cases: stateToMirror.cases.length,
        documents: stateToMirror.documents.length,
        folders: stateToMirror.folders.length,
      });
    } catch (error) {
      console.warn('Failed to mirror cache:', error);
    }
  }, []);

  // Save all state to IndexedDB
  const saveAllToStorage = useCallback(async (stateToSave: AppState) => {
    try {
      setIsAutoSaving(true);

      // Mass-drop guard: prevent overwriting IDB with empty state after boot glitches
      const totalEntities =
        (stateToSave.cases?.length || 0) +
        (stateToSave.clients?.length || 0) +
        (stateToSave.courts?.length || 0) +
        (stateToSave.judges?.length || 0) +
        (stateToSave.employees?.length || 0) +
        (stateToSave.hearings?.length || 0) +
        (stateToSave.tasks?.length || 0) +
        (stateToSave.documents?.length || 0) +
        (stateToSave.folders?.length || 0);

      if (totalEntities === 0 && lastNonZeroEntityCount.current > 0) {
        console.warn('🛑 Mass-drop guard: skipping autosave of empty state');
        return;
      }
      
      // Save each entity type separately for better performance
      const savePromises = [
        idbStorage.set('cases', stateToSave.cases),
        idbStorage.set('clients', stateToSave.clients),
        idbStorage.set('courts', stateToSave.courts),
        idbStorage.set('judges', stateToSave.judges),
        idbStorage.set('employees', stateToSave.employees),
        idbStorage.set('hearings', stateToSave.hearings),
        idbStorage.set('tasks', stateToSave.tasks),
        idbStorage.set('documents', stateToSave.documents),
        idbStorage.set('folders', stateToSave.folders),
        idbStorage.set('userProfile', stateToSave.userProfile),
      ];
      
      await Promise.all(savePromises);
      
      // Save metadata
      await idbStorage.set('metadata', {
        lastSaved: new Date().toISOString(),
        version: '1.0.0',
        entityCounts: {
          cases: stateToSave.cases.length,
          clients: stateToSave.clients.length,
          courts: stateToSave.courts.length,
          judges: stateToSave.judges.length,
          employees: stateToSave.employees.length,
          hearings: stateToSave.hearings.length,
          tasks: stateToSave.tasks.length,
          documents: stateToSave.documents.length,
          folders: stateToSave.folders.length,
        }
      });

      // Mirror to storageShim for modules depending on it
      await mirrorLocalCache(stateToSave);

      if (totalEntities > 0) {
        lastNonZeroEntityCount.current = totalEntities;
      }
      
      setLastSaved(new Date());
      console.log('📦 All data saved to IndexedDB');
      
    } catch (error) {
      console.error('💥 Save to IndexedDB failed:', error);
      toast({
        title: 'Auto-save Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsAutoSaving(false);
    }
  }, [mirrorLocalCache]);

  // Load all state from IndexedDB
  const loadFromStorage = useCallback(async (): Promise<Partial<AppState> | null> => {
    try {
      const [cases, clients, courts, judges, employees, hearings, tasks, documents, folders, userProfile, metadata] = await Promise.all([
        idbStorage.get('cases'),
        idbStorage.get('clients'),
        idbStorage.get('courts'),
        idbStorage.get('judges'),
        idbStorage.get('employees'),
        idbStorage.get('hearings'),
        idbStorage.get('tasks'),
        idbStorage.get('documents'),
        idbStorage.get('folders'),
        idbStorage.get('userProfile'),
        idbStorage.get('metadata')
      ]);

      // Only return data if we have meaningful content
      if (!cases && !clients && !courts && !judges && !metadata) {
        return null;
      }

      const loadedState: Partial<AppState> = {
        cases: Array.isArray(cases) ? cases : [],
        clients: Array.isArray(clients) ? clients : [],
        courts: Array.isArray(courts) ? courts : [],
        judges: Array.isArray(judges) ? judges : [],
        employees: Array.isArray(employees) ? employees : [],
        hearings: Array.isArray(hearings) ? hearings : [],
        tasks: Array.isArray(tasks) ? tasks : [],
        documents: Array.isArray(documents) ? documents : [],
        folders: Array.isArray(folders) ? folders : [],
        userProfile: userProfile || undefined
      };

      if (metadata?.lastSaved) {
        setLastSaved(new Date(metadata.lastSaved));
      }

      console.log('📦 Data loaded from IndexedDB:', {
        cases: loadedState.cases?.length || 0,
        clients: loadedState.clients?.length || 0,
        courts: loadedState.courts?.length || 0,
        judges: loadedState.judges?.length || 0,
        employees: loadedState.employees?.length || 0,
        hearings: loadedState.hearings?.length || 0,
        tasks: loadedState.tasks?.length || 0,
        documents: loadedState.documents?.length || 0,
        folders: loadedState.folders?.length || 0,
      });

      return loadedState;
    } catch (error) {
      console.error('💥 Load from IndexedDB failed:', error);
      return null;
    }
  }, []);

  // Export data for backup
  const exportData = useCallback(async () => {
    try {
      const exportData = await persistenceService.exportAllData();
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `beacon_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: 'Data exported successfully',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  }, []);

  // Import data from backup with validation
  const importData = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          
          // Enhanced validation
          if (typeof importedData === 'object' && importedData !== null) {
            // Check if the imported data has meaningful content
            const hasValidEntities = (importedData.documents && Array.isArray(importedData.documents)) ||
                                   (importedData.cases && Array.isArray(importedData.cases)) ||
                                   (importedData.clients && Array.isArray(importedData.clients));
            
            if (!hasValidEntities) {
              toast({
                title: 'Import Failed',
                description: 'Backup file contains no valid entity data',
                variant: 'destructive'
              });
              resolve(false);
              return;
            }
            
            await persistenceService.importAllData(importedData);
            
            // Reload the data into app state
            const loadedData = await loadFromStorage();
            if (loadedData) {
              dispatch({ type: 'RESTORE_STATE', payload: loadedData });
              
              toast({
                title: 'Import Successful',
                description: `Restored ${Object.values(importedData.metadata?.entityCounts || {}).reduce((a: number, b: number) => a + b, 0)} records`,
              });
            }
            
            resolve(true);
          } else {
            toast({
              title: 'Import Failed',
              description: 'Invalid file format',
              variant: 'destructive'
            });
            resolve(false);
          }
        } catch (error) {
          console.error('Import failed:', error);
          toast({
            title: 'Import Failed',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive'
          });
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }, [dispatch, loadFromStorage]);

  // Restore from backup (manual recovery option)
  const restoreFromBackup = useCallback(async (): Promise<boolean> => {
    try {
      const { getItem } = await import('@/data/storageShim');
      const parsedBackup = await getItem<any>('lawfirm_app_data_backup');
      if (!parsedBackup) {
        toast({
          title: 'No Backup Found',
          description: 'No backup available to restore',
          variant: 'destructive'
        });
        return false;
      }
      const entityCount = Object.values(parsedBackup.metadata?.entityCounts || {}).reduce((a: number, b: number) => a + b, 0);
      
      if (entityCount === 0) {
        toast({
          title: 'Empty Backup',
          description: 'Backup contains no data to restore',
          variant: 'destructive'
        });
        return false;
      }

      await persistenceService.importAllData(parsedBackup);
      const loadedData = await loadFromStorage();
      
      if (loadedData) {
        dispatch({ type: 'RESTORE_STATE', payload: loadedData });
        await mirrorLocalCache({
          ...state,
          ...loadedData,
          userProfile: loadedData.userProfile || state.userProfile,
        } as AppState);
        setInitialized(true);
        
        toast({
          title: 'Backup Restored',
          description: `Successfully restored ${entityCount} records from backup`,
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Backup restore failed:', error);
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      return false;
    }
  }, [dispatch, loadFromStorage]);

  // Clear all data
  const clearAllData = useCallback(async () => {
    try {
      await persistenceService.clearAllData();
      dispatch({ type: 'CLEAR_ALL_DATA' });
      setLastSaved(null);
    } catch (error) {
      console.error('Clear failed:', error);
      toast({
        title: 'Clear Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  }, [dispatch]);

  // Initialize on mount
  useEffect(() => {
    const initializePersistence = async () => {
      // Check health first
      await checkHealth();
      
      // Load existing data from IndexedDB first
      const savedData = await loadFromStorage();
      
      // Enhanced smart migration with better validation
      try {
        const { getItem: getStorageItem } = await import('@/data/storageShim');
        const legacyData = await getStorageItem<any>('lawfirm_app_data');
        const backupData = await getStorageItem<any>('lawfirm_app_data_backup');
        
        if (legacyData || backupData) {
          // Choose the most recent and complete data source
          let selectedData = null;
          let selectedSource = '';
          
          if (legacyData) {
            selectedData = legacyData;
            selectedSource = 'storage';
          }
          
          if (backupData) {
            const parsedBackup = backupData;
            // Use backup if it's newer or has more complete data
            if (!selectedData || 
                (parsedBackup.metadata?.timestamp > (selectedData.metadata?.timestamp || selectedData.metadata?.lastSaved)) ||
                (parsedBackup.metadata?.entityCounts && 
                 Object.values(parsedBackup.metadata.entityCounts).reduce((a: number, b: number) => a + b, 0) > 
                 Object.values(selectedData.metadata?.entityCounts || {}).reduce((a: number, b: number) => a + b, 0))) {
              selectedData = parsedBackup;
              selectedSource = 'localStorage backup';
            }
          }
          
          if (selectedData) {
            // Validate backup data structure
            const isValidBackup = selectedData && 
              typeof selectedData === 'object' &&
              selectedData.metadata &&
              selectedData.metadata.entityCounts;
            
            if (!isValidBackup) {
              console.warn('📦 Invalid backup structure, skipping migration');
              return;
            }
            
            // Get IndexedDB metadata and count existing entities
            const indexedDBMetadata = await idbStorage.get('metadata');
            const indexedDBDocuments = await idbStorage.get('documents');
            const indexedDBCases = await idbStorage.get('cases');
            
            const indexedDBEntityCount = (Array.isArray(indexedDBDocuments) ? indexedDBDocuments.length : 0) +
                                        (Array.isArray(indexedDBCases) ? indexedDBCases.length : 0);
            
            const backupEntityCount: number = Object.values(selectedData.metadata.entityCounts as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
            
            const localStorageTimestamp = selectedData.metadata?.timestamp || selectedData.metadata?.lastSaved || '0';
            const indexedDBTimestamp = indexedDBMetadata?.lastSaved || '0';
            const localStorageTime = new Date(localStorageTimestamp).getTime();
            const indexedDBTime = new Date(indexedDBTimestamp).getTime();
            
            // Enhanced migration logic: Only migrate if backup has meaningful data and either:
            // 1. IndexedDB is empty/corrupted, OR
            // 2. Backup is significantly newer AND has more entities
            const shouldMigrate = backupEntityCount > 0 && (
              indexedDBEntityCount === 0 ||
              (!savedData && backupEntityCount > 0) ||
              (localStorageTime > indexedDBTime && backupEntityCount >= indexedDBEntityCount)
            );
            
            if (shouldMigrate) {
              console.log(`📦 Migrating data from ${selectedSource} to IndexedDB`);
              console.log(`   Backup timestamp: ${new Date(localStorageTimestamp).toLocaleString()}`);
              console.log(`   IndexedDB timestamp: ${new Date(indexedDBTimestamp).toLocaleString()}`);
              console.log(`   Backup entities: ${backupEntityCount}, IndexedDB entities: ${indexedDBEntityCount}`);
              console.log('   Entity counts:', selectedData.metadata.entityCounts);
              
              await persistenceService.importAllData(selectedData);
              
              // Clean up after successful migration
              localStorage.removeItem('lawfirm_app_data');
              localStorage.removeItem('lawfirm_app_data_backup');
              
              // Reload data after migration
              const migratedData = await loadFromStorage();
              if (migratedData) {
                // Validate migrated data before restoring
                const hasValidData = (migratedData.documents && migratedData.documents.length > 0) ||
                                   (migratedData.cases && migratedData.cases.length > 0) ||
                                   (migratedData.clients && migratedData.clients.length > 0);
                
                if (hasValidData) {
                  dispatch({ type: 'RESTORE_STATE', payload: migratedData });
                  mirrorLocalCache({
                    ...state,
                    ...migratedData,
                    userProfile: migratedData.userProfile || state.userProfile,
                  } as AppState);
                  setInitialized(true);
                  console.log(`✅ Successfully migrated and restored data:`, {
                    cases: migratedData.cases?.length || 0,
                    documents: migratedData.documents?.length || 0,
                    clients: migratedData.clients?.length || 0
                  });
                } else {
                  console.warn('📦 Migrated data appears empty, skipping restore');
                  setInitialized(true);
                }
              }
              return;
            } else {
              console.log('📦 Keeping existing IndexedDB data (backup not suitable for migration)');
              console.log(`   Backup timestamp: ${new Date(localStorageTimestamp).toLocaleString()}`);
              console.log(`   IndexedDB timestamp: ${new Date(indexedDBTimestamp).toLocaleString()}`);
              console.log(`   Backup entities: ${backupEntityCount}, IndexedDB entities: ${indexedDBEntityCount}`);
              
              // Clean up old localStorage data to prevent future confusion
              if (indexedDBEntityCount > (backupEntityCount as number)) {
                localStorage.removeItem('lawfirm_app_data');
                localStorage.removeItem('lawfirm_app_data_backup');
                console.log('📦 Cleaned up inferior localStorage backup');
              }
            }
          }
        }
      } catch (error) {
        console.warn('Smart migration from localStorage failed:', error);
      }
      
      // Use existing IndexedDB data if no migration occurred
      if (savedData) {
        dispatch({ type: 'RESTORE_STATE', payload: savedData });
        mirrorLocalCache({
          ...state,
          ...savedData,
          userProfile: savedData.userProfile || state.userProfile,
        } as AppState);
        setInitialized(true);
        console.log(`📚 Loaded ${savedData.cases?.length || 0} cases from IndexedDB`);
      } else {
        // Nothing to load, but mark initialized to allow normal operation
        setInitialized(true);
      }
    };

    initializePersistence();
  }, [loadFromStorage, dispatch, checkHealth]);

  // Auto-save mechanism (gated until initialized)
  useEffect(() => {
    if (!initialized) return;
    const interval = setInterval(async () => {
      if (!isAutoSaving) {
        await saveAllToStorage(state);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [state, saveAllToStorage, isAutoSaving, initialized]);

  // Enhanced save on page unload with complete backup
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use synchronous localStorage as fallback for ALL critical data
      try {
        const completeBackup = {
          cases: state.cases,
          clients: state.clients,
          courts: state.courts,
          judges: state.judges,
          employees: state.employees,
          hearings: state.hearings,
          tasks: state.tasks,
          documents: state.documents,
          folders: state.folders,
          userProfile: state.userProfile,
          metadata: {
            backupType: 'beforeunload',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            entityCounts: {
              cases: state.cases.length,
              clients: state.clients.length,
              courts: state.courts.length,
              judges: state.judges.length,
              employees: state.employees.length,
              hearings: state.hearings.length,
              tasks: state.tasks.length,
              documents: state.documents.length,
              folders: state.folders.length,
            }
          }
        };
        
        localStorage.setItem('lawfirm_app_data_backup', JSON.stringify(completeBackup));
        console.log('💾 Complete backup created on unload:', completeBackup.metadata.entityCounts);
      } catch (error) {
        console.warn('Failed to create complete backup on unload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  // Health check interval
  useEffect(() => {
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    storageHealth,
    lastSaved,
    isAutoSaving,
    exportData,
    importData,
    clearAllData,
    saveToStorage: () => saveAllToStorage(state),
    checkHealth,
    manualSave: () => saveAllToStorage(state),
    restoreFromBackup
  };
};