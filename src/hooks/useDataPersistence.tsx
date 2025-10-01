import { useEffect, useCallback } from 'react';
import { AppState, useAppState, AppAction } from '@/contexts/AppStateContext';
import { setItem, getItem, removeItem } from '@/data/storageShim';

const STORAGE_KEY = 'lawfirm_app_data';
const BACKUP_INTERVAL = 30000; // 30 seconds

export const useDataPersistence = () => {
  const { state, dispatch } = useAppState();

  // Save state to storage
  const saveToStorage = useCallback(async (data: AppState) => {
    try {
      const dataToSave = {
        ...data,
        lastSaved: new Date().toISOString(),
      };
      await setItem(STORAGE_KEY, dataToSave);
    } catch (error) {
      console.error('Failed to save data to storage:', error);
    }
  }, []);

  // Load state from storage
  const loadFromStorage = useCallback(async (): Promise<Partial<AppState> | null> => {
    try {
      const data = await getItem<AppState>(STORAGE_KEY);
      return data;
    } catch (error) {
      console.error('Failed to load data from storage:', error);
      return null;
    }
  }, []);

  // Export data for backup
  const exportData = useCallback(() => {
    const dataToExport = {
      ...state,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lawfirm_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state]);

  // Import data from backup
  const importData = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          
          // Validate the structure
          if (importedData.cases && importedData.tasks && importedData.clients) {
            // Ensure userProfile exists in imported data
            if (!importedData.userProfile) {
              importedData.userProfile = state.userProfile;
            }
            dispatch({ type: 'RESTORE_STATE', payload: importedData });
            saveToStorage(importedData);
            resolve(true);
          } else {
            console.error('Invalid data structure in imported file');
            resolve(false);
          }
        } catch (error) {
          console.error('Failed to parse imported file:', error);
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }, [dispatch, saveToStorage]);

  // Clear all data
  const clearAllData = useCallback(async () => {
    await removeItem(STORAGE_KEY);
    dispatch({ type: 'CLEAR_ALL_DATA' });
  }, [dispatch]);

  // Initialize data on mount
  useEffect(() => {
    const initData = async () => {
      const savedData = await loadFromStorage();
      if (savedData) {
        // Only restore non-profile data to avoid conflicts
        const { userProfile, ...dataWithoutProfile } = savedData;
        dispatch({ type: 'RESTORE_STATE', payload: dataWithoutProfile });
      }
    };
    initData();
  }, [loadFromStorage, dispatch]);

  // Auto-save every 30 seconds (debounced)
  useEffect(() => {
    const interval = setInterval(() => {
      saveToStorage(state);
    }, BACKUP_INTERVAL);

    return () => clearInterval(interval);
  }, [state, saveToStorage]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToStorage(state);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state, saveToStorage]);

  return {
    exportData,
    importData,
    clearAllData,
    saveToStorage: () => saveToStorage(state),
  };
};