/**
 * Write-Through Services Hook - Connects mock services to AppState dispatch
 * Implements the write-through pattern: UnifiedStore -> AppState
 */

import { useContext } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import { unifiedStore } from '@/persistence/unifiedStore';
import { serviceRegistry } from '@/mock/services';
import { useToast } from '@/hooks/use-toast';
import { demoConfig } from '@/config/demoConfig';

export function useWriteThroughServices() {
  const { dispatch } = useAppState();
  const { toast } = useToast();

  // Initialize unified store
  const initializeStore = async () => {
    try {
      await unifiedStore.waitUntilReady();
      console.log('✅ UnifiedStore ready');
    } catch (error) {
      console.error('❌ UnifiedStore initialization failed:', error);
      toast({
        title: 'Storage Error',
        description: 'Failed to initialize storage system',
        variant: 'destructive'
      });
    }
  };

  // Load all data from unifiedStore into AppState
  const loadAllData = async () => {
    try {
      await unifiedStore.waitUntilReady();

      // Load all entities in parallel
      const [clients, cases, tasks, courts, judges, employees, hearings, documents, folders] = await Promise.all([
        unifiedStore.clients.getAll(),
        unifiedStore.cases.getAll(),
        unifiedStore.tasks.getAll(),
        unifiedStore.courts.getAll(),
        unifiedStore.judges.getAll(),
        unifiedStore.employees.getAll(),
        unifiedStore.hearings.getAll(),
        unifiedStore.documents.getAll(),
        unifiedStore.folders.getAll()
      ]);

      // Dispatch to AppState
      dispatch({ type: 'RESTORE_STATE', payload: {
        clients,
        cases,
        tasks,
        courts,
        judges,
        employees,
        hearings,
        documents,
        folders
      }});

      console.log('✅ All data loaded from UnifiedStore to AppState');
    } catch (error) {
      console.error('❌ Failed to load data from UnifiedStore:', error);
      toast({
        title: 'Data Loading Error',
        description: 'Failed to load data from storage',
        variant: 'destructive'
      });
    }
  };

  // Enhanced service wrappers with write-through dispatch
  const services = {
    clients: {
      ...serviceRegistry.client,
      create: async (data: any) => {
        const result = await serviceRegistry.client.create(data);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_CLIENT', payload: result.data });
        }
        return result;
      },
      update: async (id: string, data: any) => {
        const result = await serviceRegistry.client.update(id, data);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_CLIENT', payload: result.data });
        }
        return result;
      },
      delete: async (id: string) => {
        const result = await serviceRegistry.client.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_CLIENT', payload: id });
        }
        return result;
      }
    },

    cases: {
      ...serviceRegistry.case,
      create: async (data: any) => {
        const result = await serviceRegistry.case.create(data);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_CASE', payload: result.data });
        }
        return result;
      },
      update: async (id: string, data: any) => {
        const result = await serviceRegistry.case.update(id, data);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_CASE', payload: { ...result.data, id } });
        }
        return result;
      },
      delete: async (id: string) => {
        const result = await serviceRegistry.case.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_CASE', payload: id });
        }
        return result;
      }
    },

    tasks: {
      ...serviceRegistry.task,
      create: async (data: any) => {
        const result = await serviceRegistry.task.create(data);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_TASK', payload: result.data });
        }
        return result;
      },
      update: async (id: string, data: any) => {
        const result = await serviceRegistry.task.update(id, data);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_TASK', payload: result.data });
        }
        return result;
      },
      delete: async (id: string) => {
        const result = await serviceRegistry.task.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_TASK', payload: id });
        }
        return result;
      },
      bulkCreate: async (tasksData: any[]) => {
        const result = await serviceRegistry.task.bulkCreate(tasksData);
        if (result.success && result.data) {
          result.data.forEach(task => {
            dispatch({ type: 'ADD_TASK', payload: task });
          });
        }
        return result;
      }
    },

    courts: {
      ...serviceRegistry.court,
      create: async (data: any) => {
        const result = await serviceRegistry.court.create(data);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_COURT', payload: result.data });
        }
        return result;
      },
      update: async (id: string, data: any) => {
        const result = await serviceRegistry.court.update(id, data);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_COURT', payload: result.data });
        }
        return result;
      },
      delete: async (id: string) => {
        const result = await serviceRegistry.court.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_COURT', payload: id });
        }
        return result;
      }
    },

    judges: {
      ...serviceRegistry.judge,
      create: async (data: any) => {
        const result = await serviceRegistry.judge.create(data);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_JUDGE', payload: result.data });
        }
        return result;
      },
      update: async (id: string, data: any) => {
        const result = await serviceRegistry.judge.update(id, data);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_JUDGE', payload: result.data });
        }
        return result;
      },
      delete: async (id: string) => {
        const result = await serviceRegistry.judge.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_JUDGE', payload: id });
        }
        return result;
      }
    },

    employees: {
      ...serviceRegistry.employee,
      create: async (data: any) => {
        const result = await serviceRegistry.employee.create(data);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_EMPLOYEE', payload: result.data });
        }
        return result;
      },
      update: async (id: string, data: any) => {
        const result = await serviceRegistry.employee.update(id, data);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_EMPLOYEE', payload: { id, updates: result.data } });
        }
        return result;
      },
      delete: async (id: string) => {
        const result = await serviceRegistry.employee.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
        }
        return result;
      }
    },

    hearings: {
      ...serviceRegistry.hearing,
      create: async (data: any) => {
        const result = await serviceRegistry.hearing.create(data);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_HEARING', payload: result.data });
        }
        return result;
      },
      update: async (id: string, data: any) => {
        const result = await serviceRegistry.hearing.update(id, data);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_HEARING', payload: { ...result.data, id } });
        }
        return result;
      },
      delete: async (id: string) => {
        const result = await serviceRegistry.hearing.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_HEARING', payload: id });
        }
        return result;
      }
    },

    documents: {
      ...serviceRegistry.document,
      create: async (data: any) => {
        const result = await serviceRegistry.document.create(data);
        if (result.success && result.data) {
          dispatch({ type: 'ADD_DOCUMENT', payload: result.data });
        }
        return result;
      },
      update: async (id: string, data: any) => {
        const result = await serviceRegistry.document.update(id, data);
        if (result.success && result.data) {
          dispatch({ type: 'UPDATE_DOCUMENT', payload: { ...result.data, id } });
        }
        return result;
      },
      delete: async (id: string) => {
        const result = await serviceRegistry.document.delete(id);
        if (result.success) {
          dispatch({ type: 'DELETE_DOCUMENT', payload: id });
        }
        return result;
      },
      bulkUpload: async (documentsData: any[]) => {
        const result = await serviceRegistry.document.bulkUpload(documentsData);
        if (result.success && result.data) {
          result.data.forEach(document => {
            dispatch({ type: 'ADD_DOCUMENT', payload: document });
          });
        }
        return result;
      }
    },

    taskBundles: serviceRegistry.taskBundle
  };

  return {
    initializeStore,
    loadAllData,
    services,
    unifiedStore,
    isReady: () => unifiedStore ? true : false
  };
}