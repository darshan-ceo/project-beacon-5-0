import React, { useEffect } from 'react';
import { useDataPersistence } from '@/hooks/useDataPersistence';
import { useProfilePersistence } from '@/hooks/useProfilePersistence';
import { searchService } from '@/services/searchService';

interface AppWithPersistenceProps {
  children: React.ReactNode;
}

export const AppWithPersistence: React.FC<AppWithPersistenceProps> = ({ children }) => {
  useDataPersistence();
  useProfilePersistence();

  // Initialize search provider on app boot
  useEffect(() => {
    // Initialize search provider - this is async but we don't need to wait
    searchService.initProvider?.().catch(error => {
      console.warn('🔍 Failed to initialize search provider:', error);
    });
  }, []);

  return <>{children}</>;
};