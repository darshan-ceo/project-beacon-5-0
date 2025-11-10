/**
 * Persistent Dispatch Hook
 * Intercepts dispatch actions and immediately persists changes to Supabase
 * Ensures data integrity and prevents data loss on refresh
 */

import { useCallback } from 'react';
import { AppAction } from '@/contexts/AppStateContext';
import { storageManager } from '@/data/StorageManager';
import { toast } from '@/hooks/use-toast';

type PersistCallback = () => Promise<void>;

export const usePersistentDispatch = (
  originalDispatch: React.Dispatch<AppAction>,
  onPersistSuccess?: PersistCallback
) => {
  
  const persistentDispatch = useCallback(async (action: AppAction) => {
    try {
      // Check if storage is initialized
      let storage;
      try {
        storage = storageManager.getStorage();
      } catch (initError) {
        console.warn('⚠️ Storage not initialized, skipping persistence for:', action.type);
        // If storage is not ready, just update local state
        originalDispatch(action);
        return;
      }
      
      console.log(`💾 Persisting action: ${action.type}`);
      
      // Persist to Supabase BEFORE updating local state
      switch (action.type) {
        // Cases
        case 'ADD_CASE':
          await storage.create('cases', action.payload);
          break;
        case 'UPDATE_CASE':
          await storage.update('cases', action.payload.id, action.payload);
          break;
        case 'DELETE_CASE':
          await storage.delete('cases', action.payload);
          break;
          
        // Clients
        case 'ADD_CLIENT':
          await storage.create('clients', action.payload);
          break;
        case 'UPDATE_CLIENT':
          await storage.update('clients', action.payload.id, action.payload);
          break;
        case 'DELETE_CLIENT':
          await storage.delete('clients', action.payload);
          break;
          
        // Tasks
        case 'ADD_TASK':
          await storage.create('tasks', action.payload);
          break;
        case 'UPDATE_TASK':
          await storage.update('tasks', action.payload.id, action.payload);
          break;
        case 'DELETE_TASK':
          await storage.delete('tasks', action.payload);
          break;
          
        // Hearings
        case 'ADD_HEARING':
          await storage.create('hearings', action.payload);
          break;
        case 'UPDATE_HEARING':
          await storage.update('hearings', action.payload.id, action.payload);
          break;
        case 'DELETE_HEARING':
          await storage.delete('hearings', action.payload);
          break;
          
        // Employees
        case 'ADD_EMPLOYEE':
          await storage.create('employees', action.payload);
          break;
        case 'UPDATE_EMPLOYEE':
          await storage.update('employees', action.payload.id, action.payload);
          break;
        case 'DELETE_EMPLOYEE':
          await storage.delete('employees', action.payload);
          break;
          
        // Documents
        case 'ADD_DOCUMENT':
          await storage.create('documents', action.payload);
          break;
        case 'UPDATE_DOCUMENT':
          await storage.update('documents', action.payload.id, action.payload);
          break;
        case 'DELETE_DOCUMENT':
          await storage.delete('documents', action.payload);
          break;
          
        // Courts
        case 'ADD_COURT':
          await storage.create('courts', action.payload);
          break;
        case 'UPDATE_COURT':
          await storage.update('courts', action.payload.id, action.payload);
          break;
        case 'DELETE_COURT':
          await storage.delete('courts', action.payload);
          break;
          
        // Judges
        case 'ADD_JUDGE':
          await storage.create('judges', action.payload);
          break;
        case 'UPDATE_JUDGE':
          await storage.update('judges', action.payload.id, action.payload);
          break;
        case 'DELETE_JUDGE':
          await storage.delete('judges', action.payload);
          break;
          
        // Client Groups
        case 'ADD_CLIENT_GROUP':
          await storage.create('client_groups', action.payload);
          break;
        case 'UPDATE_CLIENT_GROUP':
          await storage.update('client_groups', action.payload.id, action.payload);
          break;
        case 'DELETE_CLIENT_GROUP':
          await storage.delete('client_groups', action.payload);
          break;
          
        // Folders
        case 'ADD_FOLDER':
          await storage.create('folders', action.payload);
          break;
        case 'UPDATE_FOLDER':
          await storage.update('folders', action.payload.id, action.payload);
          break;
        case 'DELETE_FOLDER':
          await storage.delete('folders', action.payload);
          break;
          
        // For other actions that don't need immediate persistence
        default:
          // No persistence needed for these actions (e.g., UI state changes)
          break;
      }
      
      // After successful persistence, update local state
      originalDispatch(action);
      
      // Call success callback if provided
      if (onPersistSuccess) {
        await onPersistSuccess();
      }
      
    } catch (error) {
      console.error('❌ Persistence failed for action:', action.type, error);
      
      // Show user-friendly error message
      const errorMessage = error?.message || 'Unknown error';
      
      // Don't show error toasts for non-critical UI actions
      const criticalActions = ['ADD_', 'UPDATE_', 'DELETE_'];
      const isCriticalAction = criticalActions.some(prefix => action.type.startsWith(prefix));
      
      if (isCriticalAction) {
        toast({
          title: "Failed to save changes",
          description: `${errorMessage}. Please try again or contact support if the problem persists.`,
          variant: "destructive"
        });
      }
      
      // Don't update local state if persistence failed
      // This ensures UI stays consistent with database
      throw error;
    }
  }, [originalDispatch, onPersistSuccess]);
  
  return persistentDispatch;
};

/**
 * Synchronous version that wraps async dispatch for compatibility
 * Use this when you need a synchronous dispatch signature
 */
export const useSyncPersistentDispatch = (
  originalDispatch: React.Dispatch<AppAction>,
  onPersistSuccess?: PersistCallback
): React.Dispatch<AppAction> => {
  const persistentDispatch = usePersistentDispatch(originalDispatch, onPersistSuccess);
  
  return useCallback((action: AppAction) => {
    // Fire and forget - async operations happen in background
    persistentDispatch(action).catch(error => {
      console.error('Background persistence failed:', error);
    });
  }, [persistentDispatch]);
};
