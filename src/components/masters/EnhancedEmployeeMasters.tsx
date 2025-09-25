/**
 * Enhanced Employee Masters with Initialization Guard and Write-Through Services
 */

import React, { useEffect, useState } from 'react';
import { InitializationGuard } from '@/components/common/InitializationGuard';
import { useWriteThroughServices } from '@/hooks/useWriteThroughServices';
import { EmployeeMasters } from './EmployeeMasters';
import { useToast } from '@/hooks/use-toast';

export function EnhancedEmployeeMasters() {
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
        console.error('Failed to initialize employee masters:', error);
        toast({
          title: 'Initialization Error',
          description: 'Failed to initialize employee management system',
          variant: 'destructive'
        });
      }
    };

    initialize();
  }, [initializeStore, loadAllData, toast]);

  return (
    <InitializationGuard>
      {isDataLoaded ? (
        <EmployeeMasters />
      ) : (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">Loading employee data...</div>
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse rounded-full" />
            </div>
          </div>
        </div>
      )}
    </InitializationGuard>
  );
}