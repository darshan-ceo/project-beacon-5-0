import React from 'react';
import { useDataPersistence } from '@/hooks/useDataPersistence';
import { useProfilePersistence } from '@/hooks/useProfilePersistence';

interface AppWithPersistenceProps {
  children: React.ReactNode;
}

export const AppWithPersistence: React.FC<AppWithPersistenceProps> = ({ children }) => {
  useDataPersistence();
  useProfilePersistence();

  return <>{children}</>;
};