import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useDataPersistence } from '@/hooks/useDataPersistence';
import { useAppState } from '@/contexts/AppStateContext';
import { initializeDataService, DataService } from '@/services/dataService';
import { toast } from 'sonner';

interface DataPersistenceContextType {
  dataService: DataService;
  exportData: () => void;
  importData: (file: File) => Promise<boolean>;
  clearAllData: () => void;
  saveToStorage: () => void;
  resetDemoData: () => Promise<void>;
  generateSampleData: () => Promise<void>;
}

const DataPersistenceContext = createContext<DataPersistenceContextType | null>(null);

export const useDataPersistenceContext = () => {
  const context = useContext(DataPersistenceContext);
  if (!context) {
    throw new Error('useDataPersistenceContext must be used within DataPersistenceProvider');
  }
  return context;
};

interface DataPersistenceProviderProps {
  children: React.ReactNode;
}

export const DataPersistenceProvider: React.FC<DataPersistenceProviderProps> = ({ children }) => {
  const { dispatch } = useAppState();
  const { exportData, importData, clearAllData, saveToStorage } = useDataPersistence();
  const dataServiceRef = useRef<DataService | null>(null);

  // Initialize data service once
  useEffect(() => {
    if (!dataServiceRef.current) {
      dataServiceRef.current = initializeDataService(dispatch);
      console.log('✅ Data service initialized and persistence enabled');
    }
  }, [dispatch]);

  const resetDemoData = async () => {
    try {
      if (dataServiceRef.current) {
        await dataServiceRef.current.resetDemoData();
        clearAllData();
        toast.success('Demo data reset successfully');
      }
    } catch (error) {
      console.error('Failed to reset demo data:', error);
      toast.error('Failed to reset demo data');
    }
  };

  const generateSampleData = async () => {
    try {
      if (dataServiceRef.current) {
        await dataServiceRef.current.generateSampleData();
        toast.success('Sample data generated successfully');
      }
    } catch (error) {
      console.error('Failed to generate sample data:', error);
      toast.error('Failed to generate sample data');
    }
  };

  const contextValue: DataPersistenceContextType = {
    dataService: dataServiceRef.current!,
    exportData,
    importData,
    clearAllData,
    saveToStorage,
    resetDemoData,
    generateSampleData,
  };

  return (
    <DataPersistenceContext.Provider value={contextValue}>
      {children}
    </DataPersistenceContext.Provider>
  );
};