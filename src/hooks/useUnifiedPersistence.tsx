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
    const storage = storageManager.getStorage();
    const [clients, cases, tasks, taskBundles, documents, hearings, judges, courts, employees, folders] = await Promise.all([
      storage.getAll('clients'), storage.getAll('cases'), storage.getAll('tasks'), storage.getAll('task_bundles'),
      storage.getAll('documents'), storage.getAll('hearings'), storage.getAll('judges'), storage.getAll('courts'),
      storage.getAll('employees'), storage.getAll('folders')
    ]);

    const counts = {
      clients: clients.length, cases: cases.length, tasks: tasks.length, task_bundles: taskBundles.length,
      documents: documents.length, hearings: hearings.length, judges: judges.length, courts: courts.length,
      employees: employees.length, folders: folders.length
    };
    
    setEntityCounts(counts);
    lastKnownEntityCounts.current = counts;
    mirrorToLocalStorage({ clients, cases, tasks, documents, hearings, judges, courts, employees, folders });
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

  // FIXED: Actually persist to IndexedDB
  const saveAllData = async (): Promise<void> => {
    const storage = storageManager.getStorage();
    
    // Save clients
    for (const client of state.clients) {
      try {
        const exists = await storage.getById('clients', client.id);
        if (exists) {
          await storage.update('clients', client.id, { 
            display_name: client.name, 
            updated_at: new Date() 
          });
        } else {
          await storage.create('clients', { 
            id: client.id, 
            display_name: client.name, 
            created_at: new Date(), 
            updated_at: new Date() 
          });
        }
      } catch (e) { 
        console.warn('Failed to save client:', e); 
      }
    }

    // Save cases
    for (const caseItem of state.cases) {
      try {
        const exists = await storage.getById('cases', caseItem.id);
        if (exists) {
          await storage.update('cases', caseItem.id, {
            client_id: caseItem.clientId,
            stage_code: caseItem.currentStage,
            status: caseItem.slaStatus,
            case_number: caseItem.caseNumber,
            title: caseItem.title,
            assigned_to_id: caseItem.assignedToId,
            priority: caseItem.priority,
            updated_at: new Date()
          });
        } else {
          await storage.create('cases', {
            id: caseItem.id,
            client_id: caseItem.clientId,
            stage_code: caseItem.currentStage,
            status: caseItem.slaStatus,
            opened_on: new Date(caseItem.createdDate),
            case_number: caseItem.caseNumber,
            title: caseItem.title,
            assigned_to_id: caseItem.assignedToId,
            priority: caseItem.priority,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      } catch (e) {
        console.warn('Failed to save case:', e);
      }
    }

    // Save tasks
    for (const task of state.tasks) {
      try {
        const exists = await storage.getById('tasks', task.id);
        if (exists) {
          await storage.update('tasks', task.id, {
            case_id: task.caseId,
            assigned_to: task.assignedToId,
            due_date: task.dueDate ? new Date(task.dueDate) : undefined,
            status: task.status,
            priority: task.priority,
            title: task.title,
            description: task.description,
            updated_at: new Date()
          });
        } else {
          await storage.create('tasks', {
            id: task.id,
            case_id: task.caseId,
            assigned_to: task.assignedToId,
            due_date: task.dueDate ? new Date(task.dueDate) : undefined,
            status: task.status,
            priority: task.priority,
            title: task.title,
            description: task.description,
            is_auto_generated: task.isAutoGenerated,
            estimated_hours: task.estimatedHours,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      } catch (e) {
        console.warn('Failed to save task:', e);
      }
    }

    // Save documents
    for (const document of state.documents) {
      try {
        const exists = await storage.getById('documents', document.id);
        if (exists) {
          await storage.update('documents', document.id, {
            case_id: document.caseId,
            client_id: document.clientId,
            title: document.title,
            file_name: document.fileName,
            file_size: document.fileSize,
            file_type: document.fileType,
            updated_at: new Date()
          });
        } else {
          await storage.create('documents', {
            id: document.id,
            case_id: document.caseId,
            client_id: document.clientId,
            title: document.title,
            file_name: document.fileName,
            file_size: document.fileSize,
            file_type: document.fileType,
            uploaded_at: new Date(document.uploadedAt),
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      } catch (e) {
        console.warn('Failed to save document:', e);
      }
    }

    // Save hearings
    for (const hearing of state.hearings) {
      try {
        const exists = await storage.getById('hearings', hearing.id);
        if (exists) {
          await storage.update('hearings', hearing.id, {
            case_id: hearing.caseId,
            judge_id: hearing.judgeId,
            court_id: hearing.courtId,
            hearing_date: new Date(hearing.date),
            hearing_time: hearing.time,
            status: hearing.status,
            updated_at: new Date()
          });
        } else {
          await storage.create('hearings', {
            id: hearing.id,
            case_id: hearing.caseId,
            judge_id: hearing.judgeId,
            court_id: hearing.courtId,
            hearing_date: new Date(hearing.date),
            hearing_time: hearing.time,
            status: hearing.status,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      } catch (e) {
        console.warn('Failed to save hearing:', e);
      }
    }
    
    const counts = {
      clients: state.clients.length, 
      cases: state.cases.length, 
      tasks: state.tasks.length,
      documents: state.documents.length, 
      hearings: state.hearings.length
    };
    setEntityCounts(counts);
    mirrorToLocalStorage(state);
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
