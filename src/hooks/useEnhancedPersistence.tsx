import { useEffect, useCallback, useState } from 'react';
import { AppState, useAppState, AppAction } from '@/contexts/AppStateContext';
import { persistenceService, StorageHealth } from '@/services/persistenceService';
import { idbStorage } from '@/utils/idb';
import { toast } from '@/hooks/use-toast';

const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

export const useEnhancedPersistence = () => {
  const { state, dispatch } = useAppState();
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Check storage health
  const checkHealth = useCallback(async () => {
    const health = await persistenceService.checkStorageHealth();
    setStorageHealth(health);
    
    if (!health.isHealthy) {
      toast({
        title: 'Storage Issue',
        description: health.errors.join(', '),
        variant: 'destructive'
      });
    }
    
    if (health.quotaWarning) {
      toast({
        title: 'Storage Warning',
        description: 'Storage space is running low',
        variant: 'destructive'
      });
    }
    
    return health;
  }, []);

  // Save all state to IndexedDB
  const saveAllToStorage = useCallback(async (stateToSave: AppState) => {
    try {
      setIsAutoSaving(true);
      
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
  }, []);

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

  // Import data from backup
  const importData = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          
          // Validate structure
          if (typeof importedData === 'object' && importedData !== null) {
            await persistenceService.importAllData(importedData);
            
            // Reload the data into app state
            const loadedData = await loadFromStorage();
            if (loadedData) {
              dispatch({ type: 'RESTORE_STATE', payload: loadedData });
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
      
      // Smart migration from localStorage - only if IndexedDB is empty or localStorage has newer data
      try {
        const legacyData = localStorage.getItem('lawfirm_app_data');
        const backupData = localStorage.getItem('lawfirm_app_data_backup');
        
        if (legacyData || backupData) {
          // Choose the most recent data source
          let selectedData = null;
          let selectedSource = '';
          
          if (legacyData) {
            const parsed = JSON.parse(legacyData);
            selectedData = parsed;
            selectedSource = 'localStorage';
          }
          
          if (backupData) {
            const parsedBackup = JSON.parse(backupData);
            // Use backup if it's newer or if main data doesn't exist
            if (!selectedData || (parsedBackup.metadata?.lastSaved > selectedData.metadata?.lastSaved)) {
              selectedData = parsedBackup;
              selectedSource = 'localStorage backup';
            }
          }
          
          if (selectedData) {
            // Get IndexedDB metadata separately
            const indexedDBMetadata = await idbStorage.get('metadata');
            const localStorageTimestamp = selectedData.metadata?.lastSaved || 0;
            const indexedDBTimestamp = indexedDBMetadata?.lastSaved || 0;
            
            // Only migrate if localStorage data is newer or IndexedDB is empty
            if (!savedData || localStorageTimestamp > indexedDBTimestamp) {
              console.log(`📦 Migrating newer data from ${selectedSource} to IndexedDB`);
              console.log(`   LocalStorage timestamp: ${new Date(localStorageTimestamp).toLocaleString()}`);
              console.log(`   IndexedDB timestamp: ${new Date(indexedDBTimestamp).toLocaleString()}`);
              
              await persistenceService.importAllData(selectedData);
              
              // Clean up after successful migration
              localStorage.removeItem('lawfirm_app_data');
              localStorage.removeItem('lawfirm_app_data_backup');
              
              // Reload data after migration
              const migratedData = await loadFromStorage();
              if (migratedData) {
                dispatch({ type: 'RESTORE_STATE', payload: migratedData });
                console.log(`✅ Successfully migrated ${migratedData.cases?.length || 0} cases from ${selectedSource}`);
              }
              return;
            } else {
              console.log('📦 IndexedDB data is newer, keeping existing data');
              console.log(`   LocalStorage timestamp: ${new Date(localStorageTimestamp).toLocaleString()}`);
              console.log(`   IndexedDB timestamp: ${new Date(indexedDBTimestamp).toLocaleString()}`);
            }
          }
        }
      } catch (error) {
        console.warn('Smart migration from localStorage failed:', error);
      }
      
      // Use existing IndexedDB data if no migration occurred
      if (savedData) {
        dispatch({ type: 'RESTORE_STATE', payload: savedData });
        console.log(`📚 Loaded ${savedData.cases?.length || 0} cases from IndexedDB`);
      }
    };

    initializePersistence();
  }, [loadFromStorage, dispatch, checkHealth]);

  // Auto-save mechanism
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isAutoSaving) {
        await saveAllToStorage(state);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [state, saveAllToStorage, isAutoSaving]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use synchronous localStorage as fallback for critical data
      try {
        localStorage.setItem('lawfirm_app_data_backup', JSON.stringify({
          cases: state.cases,
          clients: state.clients,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('Failed to create backup on unload:', error);
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
    manualSave: () => saveAllToStorage(state)
  };
};