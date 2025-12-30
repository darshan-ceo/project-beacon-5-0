/**
 * Unified Persistence Hook - Supabase Integration
 * Uses repository-based storage with persistence to Supabase
 */

import { useEffect, useState, useRef } from 'react';
import { useAppState, TaskFollowUp } from '@/contexts/AppStateContext';
import { storageManager } from '@/data/StorageManager';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { v4 as uuid } from 'uuid';

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
        
        // Phase 4: Initialize with Supabase as default (already configured in StorageManager)
        await storageManager.initialize(); // Defaults to 'supabase'
        
        // Supabase-only mode - no legacy migration needed
        console.log('✅ Using Supabase cloud storage exclusively');
        
        await validateDefaultFolders();
        await loadAllData();
        
        const health = await storageManager.healthCheck();
        setStorageHealth(health);
        
        if (!health.healthy) {
          toast.error('Storage health check failed', {
            description: health.errors.join(', ')
          });
        }
        
        // Initialize RBAC service after storage is ready
        try {
          const { advancedRbacService } = await import('@/services/advancedRbacService');
          await advancedRbacService.ensureInitialized();
          console.log('✅ RBAC service initialized');
        } catch (rbacError) {
          console.error('⚠️ RBAC initialization failed (non-critical):', rbacError);
          // Non-blocking - app can continue without RBAC
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

  // Migration function to convert legacy follow-up notes to TaskFollowUp records
  const migrateFollowUpNotes = async (
    tasks: any[], 
    taskNotes: any[]
  ): Promise<{ tasks: any[], taskFollowUps: TaskFollowUp[] }> => {
    console.log('🔄 Starting follow-up migration...');
    
    const followUpNotes = taskNotes.filter((note: any) => note.type === 'follow_up');
    
    if (followUpNotes.length === 0) {
      console.log('✅ No follow-up notes to migrate');
      return { tasks, taskFollowUps: [] };
    }
    
    const taskFollowUps: TaskFollowUp[] = [];
    const updatedTasks = tasks.map(task => {
      const taskFollowUpNotes = followUpNotes.filter((note: any) => note.taskId === task.id);
      
      if (taskFollowUpNotes.length === 0) {
        return task;
      }
      
      // Sort by creation date (oldest first)
      taskFollowUpNotes.sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      // Convert each follow-up note to TaskFollowUp
      taskFollowUpNotes.forEach((note: any) => {
        const followUp: TaskFollowUp = {
          id: uuid(),
          taskId: task.id,
          remarks: note.note || 'Follow-up logged (migrated from legacy system)',
          outcome: 'Progressing',
          status: task.status,
          workDate: note.createdAt.split('T')[0],
          nextFollowUpDate: note.metadata?.followUpDate,
          createdBy: note.createdBy,
          createdByName: note.createdByName,
          createdAt: note.createdAt,
          clientInteraction: false,
          internalReview: false
        };
        
        taskFollowUps.push(followUp);
      });
      
      // Lock the task if it has follow-ups
      const firstFollowUp = taskFollowUpNotes[0];
      return {
        ...task,
        isLocked: true,
        lockedAt: firstFollowUp.createdAt,
        lockedBy: firstFollowUp.createdBy,
        currentFollowUpDate: task.followUpDate || task.currentFollowUpDate
      };
    });
    
    console.log(`✅ Migrated ${taskFollowUps.length} follow-up notes across ${updatedTasks.filter((t: any) => t.isLocked).length} tasks`);
    
    return { tasks: updatedTasks, taskFollowUps };
  };

  const loadAllData = async (): Promise<void> => {
    try {
      const storage = storageManager.getStorage();
      let [clients, cases, tasks, taskBundles, taskNotes, taskFollowUps, documents, rawHearings, judges, courts, employees, folders, timelineEntries] = await Promise.all([
        storage.getAll<any>('clients'),
        storage.getAll<any>('cases'),
        storage.getAll<any>('tasks'),
        storage.getAll<any>('task_bundles'),
        storage.getAll<any>('task_notes'),
        storage.getAll<any>('task_followups'),
        storage.getAll<any>('documents'), 
        storage.getAll<any>('hearings'), 
        storage.getAll<any>('judges'), 
        storage.getAll<any>('courts'),
        storage.getAll<any>('employees'), 
        storage.getAll<any>('folders'),
        storage.getAll<any>('timeline_entries')
      ]);

      // Compute currentFollowUpDate for tasks from latest follow-up
      tasks = tasks.map((task: any) => {
        const taskFollowUpsForTask = taskFollowUps
          .filter((f: any) => (f.task_id || f.taskId) === task.id)
          .sort((a: any, b: any) => 
            new Date(b.created_at || b.createdAt).getTime() - 
            new Date(a.created_at || a.createdAt).getTime()
          );
        
        const latestFollowUp = taskFollowUpsForTask[0];
        
        return {
          ...task,
          currentFollowUpDate: latestFollowUp?.next_follow_up_date || 
                               latestFollowUp?.nextFollowUpDate ||
                               task.followUpDate ||
                               task.currentFollowUpDate
        };
      });

      // Migrate cases: ensure timelineBreachStatus exists + migrate stage names + add new fields
      const migratedCases = cases.map((caseItem: any) => {
        let migrated = { ...caseItem };
        
        // Migrate timelineBreachStatus (existing)
        if (!migrated.timelineBreachStatus && migrated.slaStatus) {
          migrated.timelineBreachStatus = migrated.slaStatus;
        }
        if (!migrated.timelineBreachStatus) {
          migrated.timelineBreachStatus = 'Green';
        }
        
        // Migrate stage names to new taxonomy
        const legacyStageMap: Record<string, string> = {
          'Demand': 'Adjudication',
          'Appeals': 'First Appeal',
          'GSTAT': 'Tribunal',
          'HC': 'High Court',
          'SC': 'Supreme Court'
        };
        
        if (migrated.currentStage && legacyStageMap[migrated.currentStage]) {
          migrated.currentStage = legacyStageMap[migrated.currentStage];
        }
        
        // Add new fields with defaults if missing
        if (!migrated.caseType) {
          migrated.caseType = 'GST'; // Default to GST
        }
        
        if (!migrated.issueType && migrated.title) {
          // Extract issue type from title if it follows "Client – Issue" format
          const parts = migrated.title.split(' – ');
          migrated.issueType = parts.length > 1 ? parts[1] : migrated.title;
        }
        
        // Set default values for new fields
        if (!migrated.matterType && migrated.currentStage === 'Assessment') {
          migrated.matterType = 'Scrutiny';
        }
        
        if (!migrated.tribunalBench && migrated.currentStage === 'Tribunal') {
          migrated.tribunalBench = 'State Bench';
        }
        
        return migrated;
      });

      const migratedCount = migratedCases.filter((c: any, i: number) => 
        JSON.stringify(c) !== JSON.stringify(cases[i])
      ).length;
      
      if (migratedCount > 0) {
        console.log(`🔄 Migrated ${migratedCount} cases with new schema (stages, fields, etc.)`);
      }

      // NEW: Follow-up migration logic
      let finalTasks = tasks;
      let finalTaskFollowUps = taskFollowUps;
      
      // Run migration if we have follow-up notes but no TaskFollowUp records
      const hasLegacyFollowUps = taskNotes.some((note: any) => note.type === 'follow_up');
      const hasNewFollowUps = taskFollowUps.length > 0;
      
      if (hasLegacyFollowUps && !hasNewFollowUps) {
        console.log('🔄 Detected legacy follow-up notes, running migration...');
        const migrated = await migrateFollowUpNotes(tasks, taskNotes);
        finalTasks = migrated.tasks;
        finalTaskFollowUps = migrated.taskFollowUps;
        
        // Persist migrated data
        await Promise.all([
          storage.bulkCreate('tasks', finalTasks),
          storage.bulkCreate('task_followups', finalTaskFollowUps)
        ]);
        
        toast.success(`Migrated ${finalTaskFollowUps.length} follow-up records`, {
          description: 'Your task follow-ups have been upgraded to the new system'
        });
      }

      // Supabase is single source of truth - always restore from storage (even if empty)
      console.log('📦 Loading data from Supabase storage');

      // Normalize hearings to ensure backward compatibility with both time and start_time fields
      const hearings = rawHearings.map((hearing: any) => ({
        ...hearing,
        time: hearing.time || hearing.start_time || '10:00',
        start_time: hearing.start_time || hearing.time || '10:00'
      }));

      // Normalize tasks to ensure assignedTo property exists for TaskList/TaskBoard compatibility
      const normalizedTasks = finalTasks.map((task: any) => ({
        ...task,
        assignedTo: task.assignedTo || task.assignedToName || 'Unassigned'
      }));

      // Only restore data from storage if we actually have data
      dispatch({ 
        type: 'RESTORE_STATE', 
        payload: { 
          clients,
          cases: migratedCases,
          tasks: normalizedTasks,
          taskNotes,
          taskFollowUps: finalTaskFollowUps,
          documents, 
          hearings, 
          judges, 
          courts, 
          employees, 
          folders,
          timelineEntries 
        } 
      });

      // Sync client group counts after all data is loaded
      dispatch({ type: 'SYNC_CLIENT_GROUP_COUNTS' });

      const counts = {
        clients: clients.length, 
        cases: migratedCases.length, 
        tasks: finalTasks.length, 
        task_notes: taskNotes.length,
        task_followups: finalTaskFollowUps.length,
        task_bundles: taskBundles.length,
        documents: documents.length, 
        hearings: hearings.length, 
        judges: judges.length, 
        courts: courts.length,
        employees: employees.length, 
        folders: folders.length, 
        timeline_entries: timelineEntries.length
      };
      
      setEntityCounts(counts);
      lastKnownEntityCounts.current = counts;
      mirrorToLocalStorage({ clients, cases: migratedCases, tasks, documents, hearings, judges, courts, employees, folders, timelineEntries });
      
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
        state.taskNotes.length > 0 && storage.bulkCreate('task_notes', state.taskNotes),
        state.taskFollowUps.length > 0 && storage.bulkCreate('task_followups', state.taskFollowUps),
        state.documents.length > 0 && storage.bulkCreate('documents', state.documents),
        state.hearings.length > 0 && storage.bulkCreate('hearings', state.hearings),
        state.judges.length > 0 && storage.bulkCreate('judges', state.judges),
        state.courts.length > 0 && storage.bulkCreate('courts', state.courts),
        state.employees.length > 0 && storage.bulkCreate('employees', state.employees),
        state.folders.length > 0 && storage.bulkCreate('folders', state.folders),
        state.timelineEntries && state.timelineEntries.length > 0 && storage.bulkCreate('timeline_entries', state.timelineEntries)
      ]);
      
      const counts = {
        clients: state.clients.length,
        cases: state.cases.length,
        tasks: state.tasks.length,
        task_notes: state.taskNotes.length,
        task_followups: state.taskFollowUps.length,
        documents: state.documents.length,
        hearings: state.hearings.length,
        judges: state.judges.length,
        courts: state.courts.length,
        employees: state.employees.length,
        folders: state.folders.length,
        timeline_entries: state.timelineEntries?.length || 0
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
