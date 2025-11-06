/**
 * Enhanced Persistence Hook - Supabase-Only Implementation
 * Phase 2: All IndexedDB/Dexie calls removed, using SupabaseAdapter exclusively
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { AppState, useAppState } from '@/contexts/AppStateContext';
import { StorageManager } from '@/data/StorageManager';
import { toast } from '@/hooks/use-toast';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds - less frequent for cloud saves

export interface StorageHealth {
  healthy: boolean;
  errors: string[];
  info: any;
  // Legacy compatibility fields
  isHealthy: boolean;
  used: number;
  available: number;
  quotaWarning: boolean;
}

export const useEnhancedPersistence = () => {
  const { state, dispatch } = useAppState();
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [entityCounts, setEntityCounts] = useState({
    clients: 0,
    cases: 0,
    tasks: 0,
    documents: 0,
    hearings: 0,
    employees: 0,
    courts: 0,
    judges: 0,
  });

  // Check Supabase storage health
  const checkHealth = useCallback(async () => {
    try {
      const health = await StorageManager.getInstance().healthCheck();
      
      // Add legacy compatibility fields
      const compatHealth: StorageHealth = {
        ...health,
        isHealthy: health.healthy,
        used: 0,
        available: 0,
        quotaWarning: false
      };
      
      setStorageHealth(compatHealth);
      
      if (!health.healthy) {
        console.error('[Supabase Persistence] Storage health issues:', health.errors);
        
        toast({
          title: 'Backend Connection Issue',
          description: 'Unable to connect to cloud storage. Please check your connection.',
          variant: 'destructive',
          duration: 8000,
        });
      }
      
      return compatHealth;
    } catch (error) {
      console.error('[Supabase Persistence] Health check failed:', error);
      const fallbackHealth: StorageHealth = {
        healthy: false,
        isHealthy: false,
        errors: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        info: {},
        used: 0,
        available: 0,
        quotaWarning: false
      };
      setStorageHealth(fallbackHealth);
      return fallbackHealth;
    }
  }, []);

  // Save all state to Supabase
  const saveAllToStorage = useCallback(async (stateToSave: AppState) => {
    try {
      setIsAutoSaving(true);
      const storage = StorageManager.getInstance().getStorage();

      // Calculate entity counts
      const counts = {
        cases: stateToSave.cases?.length || 0,
        clients: stateToSave.clients?.length || 0,
        courts: stateToSave.courts?.length || 0,
        judges: stateToSave.judges?.length || 0,
        employees: stateToSave.employees?.length || 0,
        hearings: stateToSave.hearings?.length || 0,
        tasks: stateToSave.tasks?.length || 0,
        documents: stateToSave.documents?.length || 0,
      };

      const totalEntities = Object.values(counts).reduce((a, b) => a + b, 0);

      // Mass-drop guard: prevent saving empty state
      if (totalEntities === 0 && entityCounts.cases + entityCounts.clients > 0) {
        console.warn('🛑 Mass-drop guard: skipping autosave of empty state');
        return;
      }
      
      // Save each entity type to Supabase in parallel using bulk operations
      const savePromises: Promise<any>[] = [];
      
      if (stateToSave.cases?.length > 0) {
        savePromises.push(
          storage.bulkUpdate('cases', stateToSave.cases.map(c => ({ id: c.id, data: c })))
            .catch(err => {
              console.warn('Cases bulk update failed, trying bulk create:', err);
              return storage.bulkCreate('cases', stateToSave.cases);
            })
        );
      }
      
      if (stateToSave.clients?.length > 0) {
        savePromises.push(
          storage.bulkUpdate('clients', stateToSave.clients.map(c => ({ id: c.id, data: c })))
            .catch(err => {
              console.warn('Clients bulk update failed, trying bulk create:', err);
              return storage.bulkCreate('clients', stateToSave.clients);
            })
        );
      }
      
      if (stateToSave.tasks?.length > 0) {
        savePromises.push(
          storage.bulkUpdate('tasks', stateToSave.tasks.map(t => ({ id: t.id, data: t })))
            .catch(err => {
              console.warn('Tasks bulk update failed, trying bulk create:', err);
              return storage.bulkCreate('tasks', stateToSave.tasks);
            })
        );
      }
      
      if (stateToSave.documents?.length > 0) {
        savePromises.push(
          storage.bulkUpdate('documents', stateToSave.documents.map(d => ({ id: d.id, data: d })))
            .catch(err => {
              console.warn('Documents bulk update failed, trying bulk create:', err);
              return storage.bulkCreate('documents', stateToSave.documents);
            })
        );
      }
      
      if (stateToSave.hearings?.length > 0) {
        savePromises.push(
          storage.bulkUpdate('hearings', stateToSave.hearings.map(h => ({ id: h.id, data: h })))
            .catch(err => {
              console.warn('Hearings bulk update failed, trying bulk create:', err);
              return storage.bulkCreate('hearings', stateToSave.hearings);
            })
        );
      }
      
      if (stateToSave.employees?.length > 0) {
        savePromises.push(
          storage.bulkUpdate('employees', stateToSave.employees.map(e => ({ id: e.id, data: e })))
            .catch(err => {
              console.warn('Employees bulk update failed, trying bulk create:', err);
              return storage.bulkCreate('employees', stateToSave.employees);
            })
        );
      }
      
      if (stateToSave.courts?.length > 0) {
        savePromises.push(
          storage.bulkUpdate('courts', stateToSave.courts.map(c => ({ id: c.id, data: c })))
            .catch(err => {
              console.warn('Courts bulk update failed, trying bulk create:', err);
              return storage.bulkCreate('courts', stateToSave.courts);
            })
        );
      }
      
      if (stateToSave.judges?.length > 0) {
        savePromises.push(
          storage.bulkUpdate('judges', stateToSave.judges.map(j => ({ id: j.id, data: j })))
            .catch(err => {
              console.warn('Judges bulk update failed, trying bulk create:', err);
              return storage.bulkCreate('judges', stateToSave.judges);
            })
        );
      }
      
      await Promise.all(savePromises);
      
      setEntityCounts(counts);
      setLastSaved(new Date());
      console.log('☁️ All data saved to Supabase:', counts);
      
    } catch (error) {
      console.error('💥 Save to Supabase failed:', error);
      toast({
        title: 'Auto-save Failed',
        description: error instanceof Error ? error.message : 'Cloud save failed',
        variant: 'destructive'
      });
    } finally {
      setIsAutoSaving(false);
    }
  }, [entityCounts]);

  // Load all state from Supabase
  const loadFromStorage = useCallback(async (): Promise<Partial<AppState> | null> => {
    try {
      const storage = StorageManager.getInstance().getStorage();
      
      const [cases, clients, courts, judges, employees, hearings, tasks, documents] = await Promise.all([
        storage.getAll('cases'),
        storage.getAll('clients'),
        storage.getAll('courts'),
        storage.getAll('judges'),
        storage.getAll('employees'),
        storage.getAll('hearings'),
        storage.getAll('tasks'),
        storage.getAll('documents')
      ]);

      // Check if we have meaningful content
      if (!cases && !clients && !courts && !judges) {
        return null;
      }

      const loadedState: Partial<AppState> = {
        cases: (Array.isArray(cases) ? cases : []) as any,
        clients: (Array.isArray(clients) ? clients : []) as any,
        courts: (Array.isArray(courts) ? courts : []) as any,
        judges: (Array.isArray(judges) ? judges : []) as any,
        employees: (Array.isArray(employees) ? employees : []) as any,
        hearings: (Array.isArray(hearings) ? hearings : []) as any,
        tasks: (Array.isArray(tasks) ? tasks : []) as any,
        documents: (Array.isArray(documents) ? documents : []) as any,
        folders: [], // Folders will be handled separately if needed
      };

      console.log('☁️ Data loaded from Supabase:', {
        cases: loadedState.cases?.length || 0,
        clients: loadedState.clients?.length || 0,
        courts: loadedState.courts?.length || 0,
        judges: loadedState.judges?.length || 0,
        employees: loadedState.employees?.length || 0,
        hearings: loadedState.hearings?.length || 0,
        tasks: loadedState.tasks?.length || 0,
        documents: loadedState.documents?.length || 0,
      });

      return loadedState;
    } catch (error) {
      console.error('💥 Load from Supabase failed:', error);
      toast({
        title: 'Data Load Failed',
        description: 'Failed to load data from cloud storage',
        variant: 'destructive'
      });
      return null;
    }
  }, []);

  // Export data for backup
  const exportData = useCallback(async () => {
    try {
      const storage = StorageManager.getInstance().getStorage();
      const exportData = await storage.exportAll();
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hoffice_backup_${new Date().toISOString().split('T')[0]}.json`;
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
          
          // Validate imported data
          if (typeof importedData === 'object' && importedData !== null) {
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
            
            const storage = StorageManager.getInstance().getStorage();
            await storage.importAll(importedData);
            
            // Reload the data into app state
            const loadedData = await loadFromStorage();
            if (loadedData) {
              dispatch({ type: 'RESTORE_STATE', payload: loadedData });
              
              toast({
                title: 'Import Successful',
                description: `Data imported successfully`,
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

  // Restore from emergency backup (localStorage fallback)
  const restoreFromBackup = useCallback(async (): Promise<boolean> => {
    try {
      const backupData = localStorage.getItem('hoffice_emergency_backup');
      if (!backupData) {
        toast({
          title: 'No Backup Found',
          description: 'No emergency backup available to restore',
          variant: 'destructive'
        });
        return false;
      }
      
      const parsedBackup = JSON.parse(backupData);
      const entityCount = Object.values(parsedBackup.metadata?.entityCounts || {}).reduce((a: number, b: number) => a + b, 0);
      
      if (entityCount === 0) {
        toast({
          title: 'Empty Backup',
          description: 'Backup contains no data to restore',
          variant: 'destructive'
        });
        return false;
      }

      const storage = StorageManager.getInstance().getStorage();
      await storage.importAll(parsedBackup);
      
      const loadedData = await loadFromStorage();
      
      if (loadedData) {
        dispatch({ type: 'RESTORE_STATE', payload: loadedData });
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
      const storage = StorageManager.getInstance().getStorage();
      await storage.clearAll();
      dispatch({ type: 'CLEAR_ALL_DATA' });
      setLastSaved(null);
      setEntityCounts({
        clients: 0,
        cases: 0,
        tasks: 0,
        documents: 0,
        hearings: 0,
        employees: 0,
        courts: 0,
        judges: 0,
      });
      
      toast({
        title: 'Data Cleared',
        description: 'All data has been cleared from cloud storage',
      });
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
      try {
        // Initialize StorageManager with Supabase mode
        await StorageManager.getInstance().initialize('supabase');
        
        // Check health
        await checkHealth();
        
        // Load existing data from Supabase
        const savedData = await loadFromStorage();
        
        if (savedData) {
          dispatch({ type: 'RESTORE_STATE', payload: savedData });
          setInitialized(true);
          console.log(`☁️ Loaded data from Supabase`);
        } else {
          // No data yet, but mark as initialized
          setInitialized(true);
          console.log('☁️ No existing data in Supabase, starting fresh');
        }
      } catch (error) {
        console.error('Initialization failed:', error);
        toast({
          title: 'Initialization Failed',
          description: 'Failed to connect to cloud storage',
          variant: 'destructive'
        });
        setInitialized(true); // Still mark as initialized to allow app to function
      }
    };

    initializePersistence();
  }, [dispatch, checkHealth, loadFromStorage]);

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

  // Emergency backup on page unload (localStorage fallback)
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const emergencyBackup = {
          cases: state.cases,
          clients: state.clients,
          courts: state.courts,
          judges: state.judges,
          employees: state.employees,
          hearings: state.hearings,
          tasks: state.tasks,
          documents: state.documents,
          folders: state.folders,
          metadata: {
            backupType: 'emergency',
            timestamp: new Date().toISOString(),
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
        
        localStorage.setItem('hoffice_emergency_backup', JSON.stringify(emergencyBackup));
        console.log('💾 Emergency backup created on unload');
      } catch (error) {
        console.warn('Failed to create emergency backup:', error);
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
    initialized,
    entityCounts,
    exportData,
    importData,
    clearAllData,
    saveToStorage: () => saveAllToStorage(state),
    checkHealth,
    manualSave: () => saveAllToStorage(state),
    restoreFromBackup
  };
};
