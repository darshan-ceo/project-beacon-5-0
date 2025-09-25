/**
 * Enhanced Client Masters with Initialization Guard and Write-Through Services
 */

import React, { useEffect, useState } from 'react';
import { InitializationGuard } from '@/components/common/InitializationGuard';
import { useWriteThroughServices } from '@/hooks/useWriteThroughServices';
import { ClientMasters } from './ClientMasters';
import { useToast } from '@/hooks/use-toast';

export function EnhancedClientMasters() {
  const { initializeStore, loadAllData, services } = useWriteThroughServices();
  const { toast } = useToast();
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeStore();
        await loadAllData();
        setIsDataLoaded(true);
      } catch (error) {
        console.error('Failed to initialize client masters:', error);
        toast({
          title: 'Initialization Error',
          description: 'Failed to initialize client management system',
          variant: 'destructive'
        });
      }
    };

    initialize();
  }, [initializeStore, loadAllData, toast]);

  return (
    <InitializationGuard>
      {isDataLoaded ? (
        <ClientMasters />
      ) : (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">Loading client data...</div>
            <div className="w-64 h-2 bg-muted rounded-full overflow-full">
              <div className="h-full bg-primary animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}
    </InitializationGuard>
  );
}