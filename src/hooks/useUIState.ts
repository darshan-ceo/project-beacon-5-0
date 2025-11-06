/**
 * React hook for UI state management
 * Provides a simple interface to store/retrieve UI preferences in Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { uiStateService, type UIStateCategory } from '@/services/UIStateService';

export function useUIState<T = any>(
  key: string,
  defaultValue: T,
  options?: {
    category?: UIStateCategory;
    description?: string;
  }
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      setIsLoading(true);
      try {
        const stored = await uiStateService.get<T>(key);
        if (stored !== null) {
          setValue(stored);
        }
      } catch (error) {
        console.error('Failed to load UI state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [key]);

  // Update value
  const updateValue = useCallback(async (newValue: T) => {
    setValue(newValue);
    
    try {
      await uiStateService.set(key, newValue, {
        category: options?.category,
        description: options?.description
      });
    } catch (error) {
      console.error('Failed to save UI state:', error);
    }
  }, [key, options?.category, options?.description]);

  return [value, updateValue, isLoading];
}

/**
 * Hook for managing multiple UI state values by category
 */
export function useUIStateCategory(
  category: UIStateCategory
): [Record<string, any>, (key: string, value: any) => Promise<void>, boolean] {
  const [values, setValues] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load all values for category
  useEffect(() => {
    const loadValues = async () => {
      setIsLoading(true);
      try {
        const stored = await uiStateService.getByCategory(category);
        setValues(stored);
      } catch (error) {
        console.error('Failed to load UI state category:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadValues();
  }, [category]);

  // Update individual value
  const updateValue = useCallback(async (key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }));
    
    try {
      await uiStateService.set(key, value, { category });
    } catch (error) {
      console.error('Failed to save UI state:', error);
    }
  }, [category]);

  return [values, updateValue, isLoading];
}

/**
 * Hook for migrating localStorage to Supabase
 */
export function useUIStateMigration() {
  const [isMigrated, setIsMigrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkMigration = () => {
      const migrated = localStorage.getItem('ui_state_migrated');
      setIsMigrated(migrated === 'true');
    };

    checkMigration();
  }, []);

  const migrate = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await uiStateService.migrateFromLocalStorage();
      
      if (result.errors.length === 0) {
        localStorage.setItem('ui_state_migrated', 'true');
        setIsMigrated(true);
        return { success: true, ...result };
      } else {
        return { success: false, ...result };
      }
    } catch (error) {
      return {
        success: false,
        migrated: 0,
        errors: [String(error)]
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isMigrated, isLoading, migrate };
}
