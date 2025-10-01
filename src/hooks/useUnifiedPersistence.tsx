/**
 * Unified Persistence Hook - FIXED VERSION
 * Uses repository-based storage with actual persistence to IndexedDB
 */

import { useEffect, useState, useRef } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import { storageManager } from '@/data/StorageManager';
import { toast } from 'sonner';
import JSZip from 'jszip';

export interface StorageHealth {
  healthy: boolean;
  errors: string[];
  info: any;
}

export const useUnifiedPersistence = () => {
  const { state, dispatch } = useAppState();
  const [initialized, setInitialized] = useState(false);
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({});
  const lastKnownEntityCounts = useRef<Record<string, number>>({});

  // Initialize storage and load data
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        console.log('🏗️ Initializing unified storage...');
        
        await storageManager.initialize();
        await validateDefaultFolders();
        await loadAllData();
        
        const health = await storageManager.healthCheck();
        setStorageHealth(health);
        
        if (!health.healthy) {
          toast.error('Storage health check failed', {
            description: health.errors.join(', ')
          });
        }
        
        setInitialized(true);
        console.log('✅ Unified storage initialized successfully');
        
      } catch (error) {
        console.error('❌ Failed to initialize storage:', error);
        toast.error('Storage initialization failed', {
          description: error.message
        });
      }
    };

    initializeStorage();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (!initialized) return;

    const interval = setInterval(async () => {
      await autoSave();
    }, 30000);

    return () => clearInterval(interval);
  }, [initialized, state]);

  const validateDefaultFolders = async (): Promise<void> => {
    const storage = storageManager.getStorage();
    const existingFolders = await storage.getAll<{ id: string; name: string; path: string; is_default: boolean }>('folders');
    
    const requiredFolders = [
      { id: 'litigation-docs', name: 'Litigation Docs', path: '/Litigation Docs', is_default: true },
      { id: 'client-uploads', name: 'Client Uploads', path: '/Client Uploads', is_default: true },
      { id: 'internal-docs', name: 'Internal Documents', path: '/Internal Documents', is_default: true }
    ];

    for (const folder of requiredFolders) {
      const exists = existingFolders.find((f: any) => f.id === folder.id);
      if (!exists) {
        await storage.create('folders', {
          ...folder,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
  };

  const loadAllData = async (): Promise<void> => {
    try {
      const storage = storageManager.getStorage();
      const [clients, cases, tasks, taskBundles, documents, rawHearings, judges, courts, employees, folders] = await Promise.all([
        storage.getAll<any>('clients'),
        storage.getAll<any>('cases'),
        storage.getAll<any>('tasks'),
        storage.getAll<any>('task_bundles'),
        storage.getAll<any>('documents'), 
        storage.getAll<any>('hearings'), 
        storage.getAll<any>('judges'), 
        storage.getAll<any>('courts'),
        storage.getAll<any>('employees'), 
        storage.getAll<any>('folders')
      ]);

      // Normalize hearings to ensure backward compatibility with both time and start_time fields
      const hearings = rawHearings.map((hearing: any) => ({
        ...hearing,
        time: hearing.time || hearing.start_time || '10:00',
        start_time: hearing.start_time || hearing.time || '10:00'
      }));

      // Restore loaded data to React state using RESTORE_STATE action
      dispatch({ 
        type: 'RESTORE_STATE', 
        payload: { 
          clients, 
          cases, 
          tasks, 
          documents, 
          hearings, 
          judges, 
          courts, 
          employees, 
          folders 
        } 
      });

      const counts = {
        clients: clients.length, cases: cases.length, tasks: tasks.length, task_bundles: taskBundles.length,
        documents: documents.length, hearings: hearings.length, judges: judges.length, courts: courts.length,
        employees: employees.length, folders: folders.length
      };
      
      setEntityCounts(counts);
      lastKnownEntityCounts.current = counts;
      mirrorToLocalStorage({ clients, cases, tasks, documents, hearings, judges, courts, employees, folders });
      
      console.log('✅ Loaded data from IndexedDB:', counts);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      toast.error('Failed to load data from storage');
      throw error;
    }
  };

  const autoSave = async (): Promise<void> => {
    if (!initialized || isAutoSaving) return;
    setIsAutoSaving(true);
    try {
      await saveAllData();
      setLastSaved(new Date());
    } finally {
      setIsAutoSaving(false);
    }
  };

  const saveAllData = async (): Promise<void> => {
    try {
      const storage = storageManager.getStorage();
      
      // Persist each entity type to IndexedDB using bulk operations
      // bulkCreate now uses bulkPut under the hood for safe upsert operations
      await Promise.all([
        state.clients.length > 0 && storage.bulkCreate('clients', state.clients),
        state.cases.length > 0 && storage.bulkCreate('cases', state.cases),
        state.tasks.length > 0 && storage.bulkCreate('tasks', state.tasks),
        state.documents.length > 0 && storage.bulkCreate('documents', state.documents),
        state.hearings.length > 0 && storage.bulkCreate('hearings', state.hearings),
        state.judges.length > 0 && storage.bulkCreate('judges', state.judges),
        state.courts.length > 0 && storage.bulkCreate('courts', state.courts),
        state.employees.length > 0 && storage.bulkCreate('employees', state.employees),
        state.folders.length > 0 && storage.bulkCreate('folders', state.folders)
      ]);
      
      const counts = {
        clients: state.clients.length,
        cases: state.cases.length,
        tasks: state.tasks.length,
        documents: state.documents.length,
        hearings: state.hearings.length,
        judges: state.judges.length,
        courts: state.courts.length,
        employees: state.employees.length,
        folders: state.folders.length,
      };
      
      setEntityCounts(counts);
      lastKnownEntityCounts.current = counts;
      
      // Mirror to localStorage for legacy compatibility
      mirrorToLocalStorage(state);
      
      console.log('📝 Saved data to IndexedDB:', counts);
    } catch (error) {
      console.error('❌ Failed to save data:', error);
      // Still try to mirror to localStorage as fallback
      mirrorToLocalStorage(state);
      throw error;
    }
  };

  const mirrorToLocalStorage = (data: any): void => {
    try {
      localStorage.setItem('lawfirm_app_data', JSON.stringify({ 
        ...data, 
        lastSaved: new Date().toISOString() 
      }));
    } catch (e) { 
      console.warn('localStorage mirror failed:', e); 
    }
  };

  const manualSave = async (): Promise<void> => {
    try {
      await saveAllData();
      toast.success('Data saved successfully');
    } catch (error) {
      console.error('Manual save failed:', error);
      toast.error('Failed to save data');
    }
  };

  const exportData = async (): Promise<void> => {
    try {
      const storage = storageManager.getStorage();
      const allData = await storage.exportAll();
      
      const exportData = {
        version: 4,
        exported_at: new Date().toISOString(),
        entities: allData,
        metadata: {
          entityCounts,
          storageHealth
        }
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beacon-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  const importData = async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.entities) {
        throw new Error('Invalid export file format');
      }

      const storage = storageManager.getStorage();
      await storage.importAll(importData.entities);
      await loadAllData();
      
      toast.success('Data imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import data');
    }
  };

  const clearAllData = async (): Promise<void> => {
    try {
      const storage = storageManager.getStorage();
      await storage.clearAll();
      
      // Clear local state
      dispatch({ type: 'CLEAR_ALL_DATA' });
      
      // Clear localStorage
      localStorage.removeItem('lawfirm_app_data');
      
      setEntityCounts({});
      setLastSaved(null);
      
      toast.success('All data cleared');
    } catch (error) {
      console.error('Clear data failed:', error);
      toast.error('Failed to clear data');
    }
  };

  const restoreFromBackup = async (): Promise<void> => {
    try {
      const backupData = localStorage.getItem('hoffice_emergency_backup');
      if (!backupData) {
        throw new Error('No backup found');
      }

      const data = JSON.parse(backupData);
      const storage = storageManager.getStorage();
      await storage.importAll(data);
      await loadAllData();
      
      toast.success('Data restored from backup');
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Failed to restore from backup');
    }
  };

  const rebuildLocalCache = async (): Promise<void> => {
    try {
      await loadAllData();
      toast.success('Local cache rebuilt');
    } catch (error) {
      console.error('Cache rebuild failed:', error);
      toast.error('Failed to rebuild cache');
    }
  };

  const checkHealth = async (): Promise<void> => {
    try {
      const health = await storageManager.healthCheck();
      setStorageHealth(health);
      
      if (health.healthy) {
        toast.success('Storage health check passed');
      } else {
        toast.error('Storage health issues detected');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Health check failed');
    }
  };

  return {
    initialized,
    storageHealth,
    lastSaved,
    isAutoSaving,
    entityCounts,
    manualSave,
    exportData,
    importData,
    clearAllData,
    restoreFromBackup,
    rebuildLocalCache,
    checkHealth
  };
};
